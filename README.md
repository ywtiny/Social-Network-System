# SocialFlow · 社交网络图谱分析系统

> 2024 级数据结构课程设计 — 基于图论算法与自定义数据结构的社交网络分析与智能推荐系统

## ✨ 功能总览

| 模块 | 功能 | 核心算法 |
|------|------|----------|
| 📊 数据概览 | 系统统计仪表盘（节点数、边数、网络密度、孤立节点） | 图遍历统计 |
| 🕸️ 图谱可视化 | 力导向布局渲染、节点点击高亮邻居、拖拽缩放 | Force-Directed Layout |
| 🔍 路径分析 | 任意两用户间最短社交路径查询 | **BFS 广度优先搜索** |
| 🔗 关系探索 | 一度好友 / 二度人脉展示、实时建边断边 | **BFS 2-Hop 遍历** |
| 🤝 好友推荐 | 基于社交拓扑 + 兴趣画像的 Top-K 推荐 | **Jaccard 相似度 + FoF** |
| 👤 实体管理 | 用户 CRUD、按度数/UID 排序、兴趣标签编辑 | 哈希表 + 邻接表 |
| 🔎 全域搜索 | 模糊搜索、结果联想、点击聚焦图谱节点 | 线性遍历匹配 |

## 🏗️ 技术栈

```
前端: React 19 + TypeScript + TailwindCSS + AntV/G6 (图可视化)
后端: Express + TypeScript + better-sqlite3 (内嵌式 SQLite)
运行: tsx (TypeScript 即时运行) + Vite (前端开发服务)
```

## 📁 项目结构

```
├── backend/                   # 后端服务
│   ├── algorithm/
│   │   └── GraphEngine.ts     # 核心图引擎（BFS/FoF/Jaccard/CRUD）
│   ├── db/
│   │   └── init.ts            # SQLite 数据库初始化 & 种子数据
│   └── server.ts              # Express REST API 服务
├── frontend/                  # 前端应用
│   └── src/
│       ├── components/        # 组件（侧边栏/导航/图谱/用户面板/统计卡）
│       ├── pages/             # 页面（仪表盘/实体管理/路径分析/关系探索）
│       └── App.tsx            # 路由入口
├── src/                       # Python 原版算法（参考实现）
│   ├── algorithm/             # BFS/推荐算法
│   ├── data_structure/        # 自定义图/哈希表/最小堆
│   └── main.py                # CLI 交互入口
└── data/                      # 测试数据集
```

## 🚀 快速启动

### 前置条件
- Node.js ≥ 18
- npm ≥ 8

### 安装依赖

```powershell
# 后端
cd backend; npm install

# 前端
cd frontend; npm install
```

### 初始化数据库

```powershell
cd backend
npx tsx db/init.ts
```

### 启动服务

```powershell
# 终端 1: 后端 API (端口 8000)
cd backend
npx tsx server.ts

# 终端 2: 前端开发服务 (端口 5173)
cd frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173`

## 🧠 核心算法说明

### BFS 最短路径
基于广度优先搜索，在无权图中计算任意两节点间的最短跳数与完整路径序列。时间复杂度 O(V+E)。

### FoF 好友推荐
Friend-of-Friend 算法，仅遍历目标用户的二度人脉候选池（O(D²)），结合 Jaccard 交并比计算拓扑相似度，叠加兴趣语义加权，通过最小堆维护 Top-K 结果。

### 一度 / 二度人脉
一度人脉直接读取邻接表，二度人脉通过 BFS 限深 2 层遍历，去重排除自身和一度好友，统计共同好友数排序。

## 📡 API 速查

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/system/overview` | 系统概览统计 |
| GET | `/api/network/graph` | 图谱数据 |
| GET | `/api/users?q=&page=&sortBy=&sortDir=` | 用户搜索/分页 |
| GET | `/api/users/:uid/recommend` | 好友推荐 |
| GET | `/api/users/:uid/friends` | 一度/二度人脉 |
| GET | `/api/users/:uid/detail` | 用户详情 |
| GET | `/api/path/:start/:end` | 最短路径 |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users/:uid` | 更新用户 |
| DELETE | `/api/users/:uid` | 删除用户 |
| POST | `/api/edges` | 创建边 |
| DELETE | `/api/edges` | 删除边 |

## 👥 团队

2024 级数据结构课程设计项目组
