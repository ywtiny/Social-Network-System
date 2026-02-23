import express from 'express';
import cors from 'cors';
import {
    hydrateGraph,
    getSystemOverview,
    getNetworkGraph,
    getUserRecommendations,
    searchUsers,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    getShortestPath,
    getFirstDegree,
    getSecondDegree,
    updateNode,
    getUserDetail
} from './algorithm/GraphEngine';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json()); // Essential for CRUD payload parsing

// ======================================
// Original Visualization Display Routes (Read-only)
// ======================================
app.get('/api/system/overview', (req, res) => {
    try {
        const stats = getSystemOverview();
        res.json({ code: 200, message: "OK", data: stats });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

app.get('/api/network/graph', (req, res) => {
    try {
        const data = getNetworkGraph();
        res.json({ code: 200, message: "OK", data });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

app.get('/api/users/:uid/recommend', (req, res) => {
    try {
        const uid = req.params.uid;
        const top_k = parseInt(req.query.top_k as string) || 6;
        const recs = getUserRecommendations(uid, top_k);
        res.json({ code: 200, message: "OK", data: recs });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

// ======================================
// Phase 4 Restful CRUD Admin API (R/W)
// ======================================

// [R] Get all users (Search / Pagination)
app.get('/api/users', (req, res) => {
    try {
        const keyword = (req.query.q as string) || "";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const sortBy = (req.query.sortBy as string) || "degree";
        const sortDir = (req.query.sortDir as string) || "desc";

        const result = searchUsers(keyword, page, limit, sortBy, sortDir);
        res.json({ code: 200, message: "OK", data: result });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

// [C] Add new entity node
app.post('/api/users', (req, res) => {
    try {
        const { uid, name, properties } = req.body;
        if (!uid || !name) return res.status(400).json({ code: 400, message: "Missed required fields: uid, name." });

        const result = addNode(uid, name, properties);
        res.json({ code: 200, message: "Node attached successfully", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [C] Connect semantic edge
app.post('/api/edges', (req, res) => {
    try {
        const { source, target } = req.body;
        if (!source || !target) return res.status(400).json({ code: 400, message: "Require source and target." });

        const result = addEdge(source, target);
        res.json({ code: 200, message: "Edge fused successfully", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
})

// [D] Destroy an entity node (cascade removes all edges)
app.delete('/api/users/:uid', (req, res) => {
    try {
        const uid = req.params.uid;
        const result = removeNode(uid);
        res.json({ code: 200, message: "Node obliterated", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [D] Cut an edge between two nodes
app.delete('/api/edges', (req, res) => {
    try {
        const { source, target } = req.body;
        if (!source || !target) return res.status(400).json({ code: 400, message: "Require source and target." });
        const result = removeEdge(source, target);
        res.json({ code: 200, message: "Edge severed", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
})

// ======================================
// Phase 5 Path Analysis & Relation Discovery API
// ======================================

// [R] BFS Shortest Path between two nodes
app.get('/api/path/:start/:end', (req, res) => {
    try {
        const { start, end } = req.params;
        const result = getShortestPath(start, end);
        res.json({ code: 200, message: "OK", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [R] Get first and second degree friends
app.get('/api/users/:uid/friends', (req, res) => {
    try {
        const uid = req.params.uid;
        const first = getFirstDegree(uid);
        const second = getSecondDegree(uid);
        res.json({ code: 200, message: "OK", data: { first_degree: first, second_degree: second } });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [R] Get single user detail
app.get('/api/users/:uid/detail', (req, res) => {
    try {
        const uid = req.params.uid;
        const detail = getUserDetail(uid);
        res.json({ code: 200, message: "OK", data: detail });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [U] Update node info
app.put('/api/users/:uid', (req, res) => {
    try {
        const uid = req.params.uid;
        const { name, properties } = req.body;
        if (!name) return res.status(400).json({ code: 400, message: "Name is required." });
        const result = updateNode(uid, name, properties || { interests: [] });
        res.json({ code: 200, message: "Node updated", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
})

// ======================================
// BOOTSTRAP
// ======================================
app.listen(PORT, () => {
    console.log(`[SocialFlow Backend] Central Gateway spinning on http://localhost:${PORT}`);
    // Boot up Data Engine into Memory synchronously
    // By keeping everything in JS Engine Maps/Sets we bypass SQL latency in complex loops.
    hydrateGraph();
});
