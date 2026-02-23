import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../socialflow.db');
let db: Database.Database;

// Core Memory Structures — 有向图
const graph: Map<string, any> = new Map();
const outAdj: Map<string, Set<string>> = new Map(); // 出边（调用）
const inAdj: Map<string, Set<string>> = new Map();  // 入边（被调用）

// Initializes the DB handle and hydrates all memory maps for O(1) ops
export function hydrateGraph() {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const services = db.prepare('SELECT * FROM users').all() as any[];
    const edges = db.prepare('SELECT * FROM edges').all() as any[];

    graph.clear();
    outAdj.clear();
    inAdj.clear();

    for (const u of services) {
        graph.set(u.uid, {
            id: u.uid,
            label: u.name || 'Unknown',
            properties: u.properties_json ? JSON.parse(u.properties_json) : {}
        });
        outAdj.set(u.uid, new Set());
        inAdj.set(u.uid, new Set());
    }

    let droppedEdges = 0;
    for (const e of edges) {
        if (!graph.has(e.source_id) || !graph.has(e.target_id)) {
            droppedEdges++;
            continue;
        }
        outAdj.get(e.source_id)!.add(e.target_id);
        inAdj.get(e.target_id)!.add(e.source_id);
    }
    console.log(`[Hydrate] Topology Engine loaded: ${graph.size} services, ${edges.length - droppedEdges} dependencies. (Dropped ${droppedEdges} dangling edges)`);
}

// 综合度 = 出度 + 入度
function totalDegree(uid: string): number {
    return (outAdj.get(uid)?.size || 0) + (inAdj.get(uid)?.size || 0);
}

export function getSystemOverview() {
    let edgeCount = 0;
    for (const neighbors of outAdj.values()) {
        edgeCount += neighbors.size;
    }

    let isolated = 0;
    for (const [uid] of graph) {
        if (totalDegree(uid) === 0) isolated++;
    }

    return {
        total_services: graph.size,
        total_dependencies: edgeCount,
        isolated_nodes: isolated,
        network_density: graph.size > 1 ? Number((edgeCount / (graph.size * (graph.size - 1))).toFixed(4)) : 0
    };
}

// Data projection for G6 Frontend — 有向边，保留方向
export function getNetworkGraph(limit = 600) {
    const nodes = [];
    let count = 0;

    for (const n of graph.values()) {
        if (count >= limit) break;
        nodes.push({ id: n.id, label: n.label, properties: n.properties });
        count++;
    }

    const validNodeIds = new Set(nodes.map(n => n.id));
    const edges: any[] = [];

    for (const sourceId of validNodeIds) {
        const targets = outAdj.get(sourceId);
        if (!targets) continue;
        for (const targetId of targets) {
            if (validNodeIds.has(targetId)) {
                edges.push({ source: sourceId, target: targetId, weight: 1 });
            }
        }
    }

    return { nodes, edges };
}

// 依赖相似度推荐（基于共同下游调用 Jaccard 系数 + 技术栈加权）
export function getServiceRecommendations(uid: string, top_k = 5) {
    if (!graph.has(uid) || !outAdj.has(uid)) return [];

    const myDownstream = outAdj.get(uid)!;
    if (myDownstream.size === 0) return [];

    const candidateScores = new Map<string, number>();

    for (const depId of myDownstream) {
        const callers = inAdj.get(depId);
        if (!callers) continue;
        for (const callerId of callers) {
            if (callerId === uid || myDownstream.has(callerId)) continue;
            candidateScores.set(callerId, (candidateScores.get(callerId) || 0) + 1);
        }
    }

    const scores = [];
    const myNode = graph.get(uid);
    const myTech: string[] = myNode?.properties?.techStack || [];

    for (const [otherUid, intersection] of candidateScores.entries()) {
        const otherNode = graph.get(otherUid);
        if (!otherNode) continue;

        const otherDown = outAdj.get(otherUid);
        if (!otherDown) continue;

        const union = myDownstream.size + otherDown.size - intersection;
        const jScore = intersection / union;

        let techBonus = 0;
        const otherTech: string[] = otherNode.properties?.techStack || [];
        if (myTech.length > 0 && otherTech.length > 0) {
            const otherSet = new Set(otherTech);
            let shared = 0;
            for (const t of myTech) {
                if (otherSet.has(t)) shared++;
            }
            techBonus = (shared / Math.max(myTech.length, otherTech.length)) * 0.2;
        }

        const finalScore = jScore + techBonus;
        scores.push({
            uid: otherUid,
            name: otherNode.label || 'Unknown',
            score: finalScore,
            match_rate: Number((finalScore * 100).toFixed(2)),
            reason: `共同下游 ${intersection} 个` + (techBonus > 0 ? `，技术栈重合` : '')
        });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, top_k);
}

/* =========================================================================
 * CRUD & SEARCH APIs
 * ========================================================================= */

// 1. 全域搜索与分页查询
export function searchServices(keyword: string = "", page: number = 1, pageSize: number = 50, sortBy: string = "degree", sortDir: string = "desc") {
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

    const TIER_ORDER = ['网关层', 'BFF层', '核心链路', '中间件', '数据层', '旁路服务'];
    candidateNodes.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'tier') {
            const ai = TIER_ORDER.indexOf(a.properties?.tier || '');
            const bi = TIER_ORDER.indexOf(b.properties?.tier || '');
            cmp = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        } else {
            // 默认按应用度排序
            cmp = totalDegree(a.id) - totalDegree(b.id);
        }
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const start = (page - 1) * pageSize;
    const items = candidateNodes.slice(start, start + pageSize).map(n => ({
        ...n,
        degree: totalDegree(n.id),
        outDegree: outAdj.get(n.id)?.size || 0,
        inDegree: inAdj.get(n.id)?.size || 0,
    }));

    return {
        total: candidateNodes.length,
        items: items
    };
}

// 2. 注入新服务节点
export function addNode(uid: string, name: string, properties: any = { techStack: [], tier: "旁路服务" }) {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        throw new Error("Invalid Service ID");
    }
    if (graph.has(uid)) throw new Error("Duplicate Service ID");

    const safeName = (name && typeof name === 'string') ? name : 'Unknown';
    const propStr = JSON.stringify(properties);

    db.prepare('INSERT INTO users (uid, name, properties_json) VALUES (?, ?, ?)').run(uid, safeName, propStr);

    graph.set(uid, { id: uid, label: safeName, properties });
    outAdj.set(uid, new Set());
    inAdj.set(uid, new Set());

    return graph.get(uid);
}

// 3. 建立有向依赖边（A 调用 B）
export function addEdge(sourceId: string, targetId: string) {
    if (!graph.has(sourceId)) throw new Error(`Source ${sourceId} not found.`);
    if (!graph.has(targetId)) throw new Error(`Target ${targetId} not found.`);
    if (sourceId === targetId) throw new Error("Self-loop is not allowed.");
    if (outAdj.get(sourceId)?.has(targetId)) throw new Error("Dependency already exists.");

    db.prepare('INSERT INTO edges (source_id, target_id) VALUES (?, ?)').run(sourceId, targetId);

    outAdj.get(sourceId)!.add(targetId);
    inAdj.get(targetId)!.add(sourceId);

    return { source: sourceId, target: targetId };
}

// 4. 移除服务节点（级联删除所有关联边）
export function removeNode(uid: string) {
    if (!graph.has(uid)) throw new Error(`Service ${uid} does not exist.`);

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM edges WHERE source_id = ? OR target_id = ?').run(uid, uid);
        db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
    });
    tx();

    const outTargets = outAdj.get(uid);
    if (outTargets) {
        for (const tgt of outTargets) inAdj.get(tgt)?.delete(uid);
    }
    const inSources = inAdj.get(uid);
    if (inSources) {
        for (const src of inSources) outAdj.get(src)?.delete(uid);
    }
    outAdj.delete(uid);
    inAdj.delete(uid);
    graph.delete(uid);

    return { removed: uid };
}

// 5. 移除有向依赖边
export function removeEdge(sourceId: string, targetId: string) {
    if (!graph.has(sourceId)) throw new Error(`Source ${sourceId} does not exist.`);
    if (!graph.has(targetId)) throw new Error(`Target ${targetId} does not exist.`);

    db.prepare('DELETE FROM edges WHERE source_id = ? AND target_id = ?').run(sourceId, targetId);

    outAdj.get(sourceId)?.delete(targetId);
    inAdj.get(targetId)?.delete(sourceId);

    return { source: sourceId, target: targetId };
}

/* =========================================================================
 * 调用链路追踪 & 爆炸半径评估
 * ========================================================================= */

// 6. BFS 调用链路追踪（有向图 — 沿出边搜索）
export function getShortestPath(startId: string, endId: string) {
    if (!graph.has(startId)) throw new Error(`起点 ${startId} 不存在`);
    if (!graph.has(endId)) throw new Error(`终点 ${endId} 不存在`);

    if (startId === endId) {
        const node = graph.get(startId);
        return { distance: 0, path: [{ id: startId, label: node.label }] };
    }

    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; trail: string[] }> = [{ id: startId, trail: [startId] }];

    while (queue.length > 0) {
        const { id: curr, trail } = queue.shift()!;
        const downstream = outAdj.get(curr);
        if (!downstream) continue;

        for (const next of downstream) {
            if (next === endId) {
                const fullPath = [...trail, endId];
                return {
                    distance: fullPath.length - 1,
                    path: fullPath.map(uid => ({
                        id: uid,
                        label: graph.get(uid)?.label || 'Unknown'
                    }))
                };
            }
            if (!visited.has(next)) {
                visited.add(next);
                queue.push({ id: next, trail: [...trail, next] });
            }
        }
    }

    return { distance: -1, path: [] };
}

// 7. 直接依赖查询（出边 = 调用了谁，入边 = 被谁调用）
export function getDirectDependencies(uid: string) {
    if (!graph.has(uid)) throw new Error(`服务 ${uid} 不存在`);

    const downstream = outAdj.get(uid) || new Set();
    const upstream = inAdj.get(uid) || new Set();

    const mapNode = (id: string) => {
        const node = graph.get(id);
        return {
            id,
            label: node?.label || 'Unknown',
            degree: totalDegree(id),
            techStack: node?.properties?.techStack || []
        };
    };

    return {
        downstream: Array.from(downstream).map(mapNode).sort((a, b) => b.degree - a.degree),
        upstream: Array.from(upstream).map(mapNode).sort((a, b) => b.degree - a.degree)
    };
}

// 8. 爆炸半径评估（BFS 沿入边向上游传播，计算级联影响范围）
export function getBlastRadius(uid: string) {
    if (!graph.has(uid)) throw new Error(`服务 ${uid} 不存在`);

    // 下游影响：沿出边 BFS（如果该服务挂了，谁会受影响？→ 沿入边反向查谁依赖它）
    const affected = new Set<string>();
    const queue = [uid];
    const visited = new Set<string>([uid]);

    while (queue.length > 0) {
        const curr = queue.shift()!;
        const callers = inAdj.get(curr);
        if (!callers) continue;
        for (const caller of callers) {
            if (!visited.has(caller)) {
                visited.add(caller);
                affected.add(caller);
                queue.push(caller);
            }
        }
    }

    const results = Array.from(affected).map(id => {
        const node = graph.get(id);
        // 计算与 uid 之间有多少条共同依赖
        let sharedDeps = 0;
        const uidDownstream = outAdj.get(uid) || new Set();
        const otherDownstream = outAdj.get(id) || new Set();
        for (const d of uidDownstream) {
            if (otherDownstream.has(d)) sharedDeps++;
        }
        return {
            id,
            label: node?.label || 'Unknown',
            degree: totalDegree(id),
            mutualDeps: sharedDeps
        };
    });

    return results.sort((a, b) => b.mutualDeps - a.mutualDeps);
}

// 9. 编辑服务节点信息
export function updateNode(uid: string, name: string, properties: any) {
    if (!graph.has(uid)) throw new Error(`服务 ${uid} 不存在`);

    const safeName = (name && typeof name === 'string') ? name : graph.get(uid).label;
    const propStr = JSON.stringify(properties);

    db.prepare('UPDATE users SET name = ?, properties_json = ? WHERE uid = ?').run(safeName, propStr, uid);

    const node = graph.get(uid);
    node.label = safeName;
    node.properties = properties;

    return { id: uid, label: safeName, properties };
}

// 10. 单服务详情查询
export function getServiceDetail(uid: string) {
    if (!graph.has(uid)) throw new Error(`服务 ${uid} 不存在`);

    const node = graph.get(uid);
    return {
        id: node.id,
        label: node.label,
        properties: node.properties,
        degree: totalDegree(uid),
        outDegree: outAdj.get(uid)?.size || 0,
        inDegree: inAdj.get(uid)?.size || 0,
    };
}
