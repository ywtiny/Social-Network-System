import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../socialflow.db');
let db: Database.Database;

// Core Memory Structures
const graph: Map<string, any> = new Map();
const adjList: Map<string, Set<string>> = new Map();

// Initializes the DB handle and hydrates all memory maps for O(1) ops
export function hydrateGraph() {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const users = db.prepare('SELECT * FROM users').all() as any[];
    const edges = db.prepare('SELECT * FROM edges').all() as any[];

    graph.clear();
    adjList.clear();

    for (const u of users) {
        graph.set(u.uid, {
            id: u.uid,
            label: u.name || 'Unknown',
            properties: u.properties_json ? JSON.parse(u.properties_json) : {}
        });
        adjList.set(u.uid, new Set());
    }

    let droppedEdges = 0;
    for (const e of edges) {
        // 拦截幽灵边：源或目标节点不在 users 表中的悬空边直接丢弃，防止后续空指针崩溃
        if (!graph.has(e.source_id) || !graph.has(e.target_id)) {
            droppedEdges++;
            continue;
        }
        adjList.get(e.source_id)!.add(e.target_id);
        adjList.get(e.target_id)!.add(e.source_id);
    }
    console.log(`[Hydrate] System Graph Engine loaded: ${graph.size} nodes, ${edges.length - droppedEdges} edges. (Dropped ${droppedEdges} dangling edges)`);
}

export function getSystemOverview() {
    let edgeCount = 0;
    for (const neighbors of adjList.values()) {
        edgeCount += neighbors.size;
    }
    edgeCount = edgeCount / 2; // undirected counts twice

    let isolated = 0;
    for (const neighbors of adjList.values()) {
        if (neighbors.size === 0) isolated++;
    }

    return {
        total_users: graph.size,
        total_edges: edgeCount,
        isolated_nodes: isolated,
        network_density: graph.size > 1 ? Number((edgeCount / (graph.size * (graph.size - 1) / 2)).toFixed(4)) : 0
    };
}

// Data projection for G6 Frontend
export function getNetworkGraph(limit = 600) {
    const nodes = [];
    let count = 0;

    for (const n of graph.values()) {
        if (count >= limit) break;
        nodes.push({ id: n.id, label: n.label, properties: n.properties });
        count++;
    }

    const validNodeIds = new Set(nodes.map(n => n.id));
    const edges = [];

    // 直接从邻接表取边，只保留双端都在有效节点集中的边，且 sourceId < targetId 去重
    for (const sourceId of validNodeIds) {
        const neighbors = adjList.get(sourceId);
        if (!neighbors) continue;
        for (const targetId of neighbors) {
            if (validNodeIds.has(targetId) && sourceId < targetId) {
                edges.push({ source: sourceId, target: targetId, weight: 1 });
            }
        }
    }

    return { nodes, edges };
}

// Calculates Top-K recommendations using FoF (Friend-of-Friend) O(D²) Architecture
export function getUserRecommendations(uid: string, top_k = 5) {
    if (!graph.has(uid) || !adjList.has(uid)) return [];

    const userFriends = adjList.get(uid)!;
    if (userFriends.size === 0) return [];

    // O(D²) 二度人脉候选池：只遍历好友的好友，不再全网扫描
    const candidateScores = new Map<string, number>();

    for (const friendId of userFriends) {
        const fofList = adjList.get(friendId);
        if (!fofList) continue;
        for (const fofId of fofList) {
            if (fofId === uid || userFriends.has(fofId)) continue;
            candidateScores.set(fofId, (candidateScores.get(fofId) || 0) + 1);
        }
    }

    const scores = [];
    const myNode = graph.get(uid);
    const myProps: string[] = myNode?.properties?.interests || [];

    for (const [otherUid, intersection] of candidateScores.entries()) {
        const otherNode = graph.get(otherUid);
        if (!otherNode) continue;

        const otherFriends = adjList.get(otherUid);
        if (!otherFriends) continue;

        const union = userFriends.size + otherFriends.size - intersection;
        const jScore = intersection / union;

        // 语义标签加权
        let semanticBonus = 0;
        const otherProps: string[] = otherNode.properties?.interests || [];
        if (myProps.length > 0 && otherProps.length > 0) {
            const otherPropsSet = new Set(otherProps);
            let shared = 0;
            for (const p of myProps) {
                if (otherPropsSet.has(p)) shared++;
            }
            semanticBonus = (shared / Math.max(myProps.length, otherProps.length)) * 0.2;
        }

        const finalScore = jScore + semanticBonus;
        scores.push({
            uid: otherUid,
            name: otherNode.label || 'Unknown',
            score: finalScore,
            match_rate: Number((finalScore * 100).toFixed(2)),
            reason: `共友 ${intersection} 人` + (semanticBonus > 0 ? `, 兴趣高拟合` : '')
        });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, top_k);
}

/* =========================================================================
 * PHASE 4 B2B CRM ENHANCEMENTS: CRUD & FULL-TEXT SEARCHING APIs
 * ========================================================================= */

// 1. 全域搜索与分页查询 (Query/Scan)
export function searchUsers(keyword: string = "", page: number = 1, pageSize: number = 50, sortBy: string = "degree", sortDir: string = "desc") {
    const rawKeyword = keyword.trim().toLowerCase();
    const isKeywordEmpty = rawKeyword === "";

    const candidateNodes = [];
    for (const u of graph.values()) {
        if (isKeywordEmpty ||
            (u.id && String(u.id).toLowerCase().includes(rawKeyword)) ||
            (u.label && String(u.label).toLowerCase().includes(rawKeyword))) {
            candidateNodes.push(u);
        }
    }

    candidateNodes.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'uid') {
            cmp = String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        } else {
            cmp = (adjList.get(a.id)?.size || 0) - (adjList.get(b.id)?.size || 0);
        }
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const start = (page - 1) * pageSize;
    const items = candidateNodes.slice(start, start + pageSize).map(n => ({
        ...n,
        degree: adjList.get(n.id)?.size || 0
    }));

    return {
        total: candidateNodes.length,
        items: items
    };
}

// 2. 注入新节点（Atomic Double Write）
export function addNode(uid: string, name: string, properties: any = { interests: [] }) {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        throw new Error("Invalid Node ID: ID must be a valid non-empty string.");
    }
    if (graph.has(uid)) throw new Error("Duplicate Node ID");

    const safeName = (name && typeof name === 'string') ? name : 'Unknown';
    const propStr = JSON.stringify(properties);

    const stmt = db.prepare('INSERT INTO users (uid, name, properties_json) VALUES (?, ?, ?)');
    stmt.run(uid, safeName, propStr);

    graph.set(uid, { id: uid, label: safeName, properties });
    adjList.set(uid, new Set());

    return graph.get(uid);
}

// 3. 建立二度边（Atomic Double Write）
export function addEdge(sourceId: string, targetId: string) {
    if (!graph.has(sourceId)) throw new Error(`Source Node ${sourceId} unexisted.`);
    if (!graph.has(targetId)) throw new Error(`Target Node ${targetId} unexisted.`);
    if (sourceId === targetId) throw new Error("Self loop forbidden in simple graphs.");
    if (adjList.get(sourceId)?.has(targetId)) throw new Error("Edge already connected.");

    const stmt = db.prepare('INSERT INTO edges (source_id, target_id) VALUES (?, ?)');
    stmt.run(sourceId, targetId);

    adjList.get(sourceId)!.add(targetId);
    adjList.get(targetId)!.add(sourceId);

    return { source: sourceId, target: targetId };
}

// 4. 逆向切除节点（Atomic Double Write + Cascade）
export function removeNode(uid: string) {
    if (!graph.has(uid)) throw new Error(`Node ${uid} does not exist.`);

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM edges WHERE source_id = ? OR target_id = ?').run(uid, uid);
        db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
    });
    tx();

    const neighbors = adjList.get(uid);
    if (neighbors) {
        for (const neighborId of neighbors) {
            adjList.get(neighborId)?.delete(uid);
        }
    }
    adjList.delete(uid);
    graph.delete(uid);

    return { removed: uid };
}

// 5. 逆向切断边（Atomic Double Write）
export function removeEdge(sourceId: string, targetId: string) {
    if (!graph.has(sourceId)) throw new Error(`Source Node ${sourceId} does not exist.`);
    if (!graph.has(targetId)) throw new Error(`Target Node ${targetId} does not exist.`);

    db.prepare('DELETE FROM edges WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)').run(sourceId, targetId, targetId, sourceId);

    adjList.get(sourceId)?.delete(targetId);
    adjList.get(targetId)?.delete(sourceId);

    return { source: sourceId, target: targetId };
}

/* =========================================================================
 * PHASE 5: PATH ANALYSIS & RELATION DISCOVERY APIs
 * ========================================================================= */

// 6. BFS 最短路径算法（从 Python shortest_distance 迁移）
export function getShortestPath(startId: string, endId: string) {
    if (!graph.has(startId)) throw new Error(`起点 ${startId} 不存在`);
    if (!graph.has(endId)) throw new Error(`终点 ${endId} 不存在`);

    if (startId === endId) {
        const node = graph.get(startId);
        return { distance: 0, path: [{ id: startId, label: node.label }] };
    }

    // 标准 BFS 层级遍历
    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; trail: string[] }> = [{ id: startId, trail: [startId] }];

    while (queue.length > 0) {
        const { id: curr, trail } = queue.shift()!;
        const neighbors = adjList.get(curr);
        if (!neighbors) continue;

        for (const neighbor of neighbors) {
            if (neighbor === endId) {
                const fullPath = [...trail, endId];
                return {
                    distance: fullPath.length - 1,
                    path: fullPath.map(uid => ({
                        id: uid,
                        label: graph.get(uid)?.label || 'Unknown'
                    }))
                };
            }
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({ id: neighbor, trail: [...trail, neighbor] });
            }
        }
    }

    return { distance: -1, path: [] };
}

// 7. 一度人脉查询
export function getFirstDegree(uid: string) {
    if (!graph.has(uid)) throw new Error(`节点 ${uid} 不存在`);
    const friends = adjList.get(uid);
    if (!friends || friends.size === 0) return [];

    return Array.from(friends).map(fid => {
        const node = graph.get(fid);
        return {
            id: fid,
            label: node?.label || 'Unknown',
            degree: adjList.get(fid)?.size || 0,
            interests: node?.properties?.interests || []
        };
    }).sort((a, b) => b.degree - a.degree);
}

// 8. 二度人脉查询（BFS 2-hop 去重，从 Python get_second_degree 迁移）
export function getSecondDegree(uid: string) {
    if (!graph.has(uid)) throw new Error(`节点 ${uid} 不存在`);

    const firstDeg = adjList.get(uid)!;
    const visited = new Set<string>([uid, ...firstDeg]);
    const secondDeg: Array<{ id: string; label: string; degree: number; mutualFriends: number }> = [];

    for (const friendId of firstDeg) {
        const fofList = adjList.get(friendId);
        if (!fofList) continue;
        for (const fofId of fofList) {
            if (visited.has(fofId)) continue;
            visited.add(fofId);

            // 计算共同好友数
            let mutual = 0;
            const fofFriends = adjList.get(fofId);
            if (fofFriends) {
                for (const f of firstDeg) {
                    if (fofFriends.has(f)) mutual++;
                }
            }

            const node = graph.get(fofId);
            secondDeg.push({
                id: fofId,
                label: node?.label || 'Unknown',
                degree: fofFriends?.size || 0,
                mutualFriends: mutual
            });
        }
    }

    return secondDeg.sort((a, b) => b.mutualFriends - a.mutualFriends);
}

// 9. 节点编辑（Atomic Double Write）
export function updateNode(uid: string, name: string, properties: any) {
    if (!graph.has(uid)) throw new Error(`节点 ${uid} 不存在`);

    const safeName = (name && typeof name === 'string') ? name : graph.get(uid).label;
    const propStr = JSON.stringify(properties);

    db.prepare('UPDATE users SET name = ?, properties_json = ? WHERE uid = ?').run(safeName, propStr, uid);

    const node = graph.get(uid);
    node.label = safeName;
    node.properties = properties;

    return { id: uid, label: safeName, properties };
}

// 10. 单节点详情查询
export function getUserDetail(uid: string) {
    if (!graph.has(uid)) throw new Error(`节点 ${uid} 不存在`);

    const node = graph.get(uid);
    const friends = adjList.get(uid);

    return {
        id: node.id,
        label: node.label,
        properties: node.properties,
        degree: friends?.size || 0,
        friendCount: friends?.size || 0
    };
}
