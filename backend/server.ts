import express from 'express';
import cors from 'cors';
import { ensureAccountsTable, register, login, verifyToken } from './auth';
import { authMiddleware, requireAdmin } from './authMiddleware';

import {
    hydrateGraph,
    getSystemOverview,
    getNetworkGraph,
    getServiceRecommendations,
    searchServices,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    getShortestPath,
    getDirectDependencies,
    getBlastRadius,
    updateNode,
    getServiceDetail,
} from './algorithm/GraphEngine';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// ============== Bootstrap ==============
hydrateGraph();
ensureAccountsTable();

// ======================================
// Auth APIs
// ======================================

app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = register(username, password, role);
        res.json({ code: 201, message: '注册成功', data: user });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const result = login(username, password);
        res.json({ code: 200, message: '登录成功', data: result });
    } catch (e: any) {
        res.status(401).json({ code: 401, message: e.message });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ code: 200, message: 'OK', data: req.user });
});

// ======================================
// Phase 1 Read-Only APIs
// ======================================

app.get('/api/system/overview', (req, res) => {
    try {
        const data = getSystemOverview();
        res.json({ code: 200, message: "OK", data });
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

app.get('/api/services/:uid/recommend', (req, res) => {
    try {
        const uid = req.params.uid;
        const top_k = parseInt(req.query.top_k as string) || 6;
        const recs = getServiceRecommendations(uid, top_k);
        res.json({ code: 200, message: "OK", data: recs });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

// ======================================
// CRUD APIs
// ======================================

// [R] Get services (Search / Pagination)
app.get('/api/services', (req, res) => {
    try {
        const keyword = (req.query.q as string) || "";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const sortBy = (req.query.sortBy as string) || "degree";
        const sortDir = (req.query.sortDir as string) || "desc";

        const result = searchServices(keyword, page, limit, sortBy, sortDir);
        res.json({ code: 200, message: "OK", data: result });
    } catch (e: any) {
        res.status(500).json({ code: 500, message: e.message });
    }
});

// [C] Create service node
app.post('/api/services', authMiddleware, (req, res) => {
    try {
        const { uid, name, properties } = req.body;
        const node = addNode(uid, name, properties);
        res.json({ code: 201, message: "Service created", data: node });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [D] Delete service node
app.delete('/api/services/:uid', authMiddleware, (req, res) => {
    try {
        const uid = req.params.uid;
        const result = removeNode(uid);
        res.json({ code: 200, message: "Service removed", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [C] Create dependency edge
app.post('/api/dependencies', authMiddleware, (req, res) => {
    try {
        const { source, target } = req.body;
        const edge = addEdge(source, target);
        res.json({ code: 201, message: "Dependency created", data: edge });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [D] Delete dependency edge
app.delete('/api/dependencies', authMiddleware, (req, res) => {
    try {
        const { source, target } = req.body;
        const result = removeEdge(source, target);
        res.json({ code: 200, message: "Dependency removed", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// ======================================
// 调用链路追踪 & 爆炸半径评估
// ======================================

// [R] BFS 调用链路追踪
app.get('/api/trace/:start/:end', (req, res) => {
    try {
        const { start, end } = req.params;
        const result = getShortestPath(start, end);
        res.json({ code: 200, message: "OK", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [R] 直接依赖（上下游）
app.get('/api/services/:uid/dependencies', (req, res) => {
    try {
        const uid = req.params.uid;
        const deps = getDirectDependencies(uid);
        res.json({ code: 200, message: "OK", data: deps });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [R] 爆炸半径评估
app.get('/api/services/:uid/blast-radius', (req, res) => {
    try {
        const uid = req.params.uid;
        const result = getBlastRadius(uid);
        res.json({ code: 200, message: "OK", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [R] 单服务详情
app.get('/api/services/:uid/detail', (req, res) => {
    try {
        const uid = req.params.uid;
        const detail = getServiceDetail(uid);
        res.json({ code: 200, message: "OK", data: detail });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

// [U] 更新服务信息
app.put('/api/services/:uid', authMiddleware, (req, res) => {
    try {
        const uid = req.params.uid;
        const { name, properties } = req.body;
        if (!name) return res.status(400).json({ code: 400, message: "Name is required." });
        const result = updateNode(uid, name, properties || { techStack: [], tier: "旁路服务" });
        res.json({ code: 200, message: "Service updated", data: result });
    } catch (e: any) {
        res.status(400).json({ code: 400, message: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ServiceGraph Backend] Topology API running on http://localhost:${PORT}`);
});
