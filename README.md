# SocialFlow · 社交网络图谱分析系统

> 基于图论算法与自定义数据结构的微服务依赖分析与商业大屏系统

[![Node.js](https://img.shields.io/badge/Node.js-≥18-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-内嵌式-003B57?logo=sqlite)](https://sqlite.org)

---

## ✨ 功能总览

| 模块 | 功能描述 | 核心算法 |
|------|----------|----------|
| 📊 **拓扑大屏** | 全局微服务网络图谱可视化，dagre 层级布局，方向筛选（全部/上游/下游） | Dagre 有向图布局 |
| 🔍 **调用链路追踪** | 任意两服务间最短调用路径，层级分组快选面板 | **BFS 广度优先搜索** |
| 💥 **爆炸半径评估** | 故障传播范围分析，上下游依赖管理，可拖拽宽度双面板 | **BFS 多跳传播** |
| 🗂️ **服务注册表** | 服务 CRUD、层级排序、依赖关系管理 Modal | 哈希表 + 邻接表 |
| 🤝 **智能推荐** | 基于 Jaccard 相似度的依赖关系推荐 | **Jaccard 相似度 + FoF** |
| 🔎 **全域搜索** | TopNav 模糊搜索，联想补全，点击聚焦图谱节点 | 线性遍历匹配 |

---

## 🏗️ 技术栈

```
前端:  React 19 + TypeScript + TailwindCSS + AntV/G6 (图可视化)
后端:  Express + TypeScript + better-sqlite3 (内嵌式 SQLite)
算法:  GraphEngine.ts — 自实现有向图 + BFS / Jaccard / 爆炸半径
运行:  tsx (TS 即时运行) + Vite (前端 HMR 开发服务)
```

---

## 📁 项目结构

```
├── backend/
│   ├── algorithm/
│   │   └── GraphEngine.ts     # 核心图引擎（有向图 + BFS + Jaccard + CRUD）
│   ├── db/
│   │   └── init.ts            # SQLite 初始化 & 42 节点种子数据
│   └── server.ts              # Express REST API (端口 8000)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── NetworkGraph.tsx   # G6 图谱（dagre / 方向切换 / 高亮）
│       │   ├── Sidebar.tsx        # 可拖拽宽度侧边栏
│       │   └── TopNav.tsx         # 全域搜索导航
│       ├── pages/
│       │   ├── Dashboard.tsx      # 拓扑大屏 + 统计卡
│       │   ├── PathFinder.tsx     # 调用链路追踪 + 下滑快选面板
│       │   ├── RelationExplorer.tsx  # 爆炸半径评估 + 双侧可拖拽面板
│       │   └── UserManagement.tsx    # 服务注册表 + 依赖管理 Modal
│       └── App.tsx                # 路由入口 + Sidebar 宽度状态管理
├── src/                       # Python 原版算法（参考实现）
│   ├── algorithm/             # BFS / 推荐算法
│   ├── data_structure/        # 自定义图 / 哈希表 / 最小堆
│   └── main.py                # CLI 交互入口
├── data/                      # 测试数据集
│   └── friend_sample.txt      # 42 服务节点 + 边样本
└── Start-SNA.ps1              # 一键启动脚本 (Windows PowerShell)
```

---

## 🚀 快速启动

### 前置条件

- **Node.js ≥ 18**
- **npm ≥ 8**

### 安装依赖

```powershell
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 初始化数据库（首次运行）

```powershell
cd backend
npx tsx db/init.ts
```

> 会写入 42 个微服务节点及其依赖关系到 `socialflow.db`

### 启动服务

```powershell
# 方式一：一键启动（推荐）
.\Start-SNA.ps1

# 方式二：手动启动
# 终端 1 — 后端 API (http://localhost:8000)
cd backend; npx tsx server.ts

# 终端 2 — 前端开发服务 (http://localhost:5173)
cd frontend; npm run dev
```

访问 `http://localhost:5173` 进入系统大屏。

---

## 🧠 核心算法说明

### 有向图内存结构

```typescript
const graph: Map<string, ServiceNode> = new Map();   // 节点索引 O(1)
const outAdj: Map<string, Set<string>> = new Map();  // 出边（A 调用 B）
const inAdj:  Map<string, Set<string>> = new Map();  // 入边（谁调用 A）
```

所有修改操作同步维护三个结构，确保任意操作均为 O(1)（不含 BFS）。

### BFS 最短路径（调用链追踪）

```
沿出边（调用方向）广度优先展开，返回最短跳数与完整路径序列。
时间复杂度：O(V + E)，队列实现。
```

### 爆炸半径评估（BFS 反向传播）

```
沿入边（被调用方向）逆向 BFS，逐层统计受影响服务数。
每多一层代表故障传播扩散一跳，最终汇总影响范围与层级分布。
```

### 智能推荐（Jaccard + FoF + 技术栈权重）

```
候选集：目标服务的二度依赖（Friend-of-Friend，O(D²) 遍历）
评分 = Jaccard(共同下游 / 总下游联合) × 0.6
      + TechMatch(技术栈重叠率)        × 0.4
最小堆维护 Top-K，时间复杂度 O(D² log K)
```

---

## 📡 REST API 速查

### 服务管理

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/services?q=&page=&sortBy=&sortDir=` | 服务搜索 / 分页（支持 `sortBy=tier/degree`） |
| `GET` | `/api/services/:uid` | 单服务详情 |
| `POST` | `/api/services` | 创建服务节点 |
| `PUT` | `/api/services/:uid` | 更新服务信息 |
| `DELETE` | `/api/services/:uid` | 删除服务节点（级联删边） |

### 依赖关系

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/services/:uid/dependencies` | 上下游直接依赖 |
| `POST` | `/api/dependencies` | 建立依赖边 `{ source, target }` |
| `DELETE` | `/api/dependencies` | 移除依赖边 `{ source, target }` |

### 分析接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/trace/:start/:end` | BFS 调用链路追踪 |
| `GET` | `/api/services/:uid/recommend` | 智能推荐（Top-5） |
| `GET` | `/api/system/overview` | 全局统计（节点数/边数/密度） |
| `GET` | `/api/network/graph` | 图谱渲染数据（节点+边） |

---

## 🎨 UI 特性（advanced 分支）

- **可拖拽宽度面板**：左侧 Sidebar（160~400 px）、爆炸半径右侧快选栏（120~480 px）均可拖拽调整
- **图方向切换**：节点点击后可在「全部 / 仅下游 / 仅上游」三种高亮模式间切换
- **服务快选面板**：
  - 爆炸半径页：右侧纵向滚动栏，按层级排序，点击即切换评估对象
  - 调用链路页：搜索框下方折叠式下拉面板，点击 chip 依次填入起点/终点
- **行内搜索建立依赖**：爆炸半径评估页下游/上游两个面板各有独立搜索框，搜索后一键建立或反向建立边
- **层级排序**：服务注册表支持按「网关层 → BFF层 → 核心链路 → 中间件 → 数据层」排序
- **实时图刷新**：所有依赖关系变更后自动触发 `SNA_REFRESH_GRAPH` 事件更新图谱

---

## 🌿 分支说明

| 分支 | 说明 |
|------|------|
| `main` | 稳定基础版本（用户社交网络场景） |
| `advanced` | 微服务分析商业大屏（核心重构版本） |
| `advanced/*` | 功能迭代子分支（不影响 advanced 主线） |
| `backup-main` | main 分支备份 |

---

## 📄 许可证

MIT License
