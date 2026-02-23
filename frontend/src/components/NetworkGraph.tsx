import { useEffect, useRef, useState } from 'react';
import * as G6 from '@antv/g6';
import axios from 'axios';

type NetworkProps = {
    selectedUserId?: string;
    onNodeSelect: (nodeData: any) => void;
}

export default function NetworkGraph({ selectedUserId, onNodeSelect }: NetworkProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphInstance = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // 方向模式：all(双向) | out(下游/出边) | in(上游/入边)
    const [dirMode, setDirMode] = useState<'all' | 'out' | 'in'>('all');
    const dirModeRef = useRef<'all' | 'out' | 'in'>('all');
    const lastClickedRef = useRef<string | null>(null);

    // 将请求数据的逻辑抽离出，方便被全局重载事件调用
    const fetchGraphData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8000/api/network/graph');
            if (res.data.code === 200 && graphInstance.current) {
                // 如果图已有数据，使用 changeData 会拥有自然的演进过渡动画
                graphInstance.current.changeData(res.data.data);

                // 给引力模型预留重排时间
                setTimeout(() => {
                    const currentSelectedId = selectedUserId || window.sessionStorage.getItem('SNA_FOCUS_UID');
                    if (currentSelectedId) {
                        const initItem = graphInstance.current?.findById(currentSelectedId);
                        if (initItem) {
                            graphInstance.current.setItemState(initItem, 'selected', true);
                            graphInstance.current.focusItem(initItem, true, { easing: 'easeCubic', duration: 800 });
                        }
                    }
                }, 800);
            }
        } catch (err: any) {
            console.error("图谱网络获取失败", err);
            setError("数据加载断层: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (graphInstance.current || !containerRef.current) return;

        try {
            const GraphClass = (G6 as any).default?.Graph || (G6 as any).Graph || G6.Graph;
            if (!GraphClass) throw new Error("G6.Graph 构造器未加载");

            graphInstance.current = new GraphClass({
                container: containerRef.current,
                width: containerRef.current.scrollWidth || 800,
                height: containerRef.current.scrollHeight || 500,
                fitView: true,
                fitViewPadding: [20, 20, 20, 20],
                animate: true, // 开启图生动画
                modes: {
                    default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
                },
                layout: {
                    type: 'dagre',
                    rankdir: 'LR',       // 左→右，网关层在左，数据层在右
                    align: 'UL',
                    nodesep: 28,         // 同层节点间距
                    ranksep: 90,         // 层间距
                    preventOverlap: true,
                    nodeSize: 52,
                },
                defaultNode: {
                    type: 'circle',
                    size: 52,
                    style: { fill: '#8b8055', stroke: '#6f6644', lineWidth: 2, cursor: 'pointer', transition: 'all 0.3s' },
                    labelCfg: {
                        position: 'center',
                        style: { fill: '#ffffff', fontSize: 10, fontWeight: 600 },
                    },
                },
                defaultEdge: {
                    type: 'line',
                    style: {
                        stroke: '#c9c5bb',
                        lineWidth: 1.2,
                        endArrow: {
                            path: 'M 0,0 L 8,4 L 8,-4 Z',
                            fill: '#c9c5bb',
                        },
                    },
                },
                nodeStateStyles: {
                    hover: { fill: '#f5f2eb', stroke: '#8b8055', cursor: 'grab' },
                    selected: { fill: '#8b8055', stroke: '#6f6644', lineWidth: 3, shadowColor: '#8b8055', shadowBlur: 15 },
                    neighbor: { fill: '#a89d6d', stroke: '#8b8055', lineWidth: 2, opacity: 1 },
                    dim: { opacity: 0.15 }
                },
                edgeStateStyles: {
                    highlight: { stroke: '#8b8055', lineWidth: 2.5, shadowColor: '#8b8055', shadowBlur: 6 },
                    dim: { opacity: 0.08 }
                }
            });

            // 点击节点 -> 高亮邻居 + 连接边，其余变暗
            graphInstance.current.on('node:click', (evt: any) => {
                const { item } = evt;
                const g = graphInstance.current;
                const nodeModel = item.getModel();
                window.sessionStorage.setItem('SNA_FOCUS_UID', nodeModel.id);

                // 根据方向模式收集邻居 ID 和高亮边
                const neighborIds = new Set<string>();
                const highlightEdgeIds = new Set<string>();
                const mode = dirModeRef.current;
                const edges = g.getEdges();
                edges.forEach((edge: any) => {
                    const em = edge.getModel();
                    if (mode === 'out' || mode === 'all') {
                        if (em.source === nodeModel.id) { neighborIds.add(em.target); highlightEdgeIds.add(em.id); }
                    }
                    if (mode === 'in' || mode === 'all') {
                        if (em.target === nodeModel.id) { neighborIds.add(em.source); highlightEdgeIds.add(em.id); }
                    }
                });
                lastClickedRef.current = nodeModel.id;

                // 重置所有状态
                g.getNodes().forEach((n: any) => g.clearItemStates(n, ['selected', 'neighbor', 'dim']));
                g.getEdges().forEach((e: any) => g.clearItemStates(e, ['highlight', 'dim']));

                // 设置状态
                g.getNodes().forEach((n: any) => {
                    const nid = n.getModel().id;
                    if (nid === nodeModel.id) {
                        g.setItemState(n, 'selected', true);
                    } else if (neighborIds.has(nid)) {
                        g.setItemState(n, 'neighbor', true);
                    } else {
                        g.setItemState(n, 'dim', true);
                    }
                });

                const allEdges = g.getEdges();
                allEdges.forEach((edge: any) => {
                    const em = edge.getModel();
                    if (highlightEdgeIds.has(em.id)) {
                        g.setItemState(edge, 'highlight', true);
                    } else {
                        g.setItemState(edge, 'dim', true);
                    }
                });

                g.focusItem(item, true, { easing: 'easeCubic', duration: 400 });
                onNodeSelect(nodeModel);
            });

            // 点击画布空白 -> 恢复所有
            graphInstance.current.on('canvas:click', () => {
                const g = graphInstance.current;
                g.getNodes().forEach((n: any) => g.clearItemStates(n, ['selected', 'neighbor', 'dim']));
                g.getEdges().forEach((e: any) => g.clearItemStates(e, ['highlight', 'dim']));
            });

            graphInstance.current.on('node:mouseenter', (e: any) => graphInstance.current.setItemState(e.item, 'hover', true));
            graphInstance.current.on('node:mouseleave', (e: any) => graphInstance.current.setItemState(e.item, 'hover', false));

        } catch (err: any) {
            console.error("G6 内核奔溃:", err);
            setError("图论引擎挂载失败: " + err.message);
            setLoading(false);
            return;
        }

        // 首次取数
        fetchGraphData();

        const handleResize = () => {
            if (graphInstance.current && containerRef.current) {
                graphInstance.current.changeSize(containerRef.current.scrollWidth, containerRef.current.scrollHeight);
            }
        };

        // ====== 构建全局事件总线监听 ======
        const handleFocusNode = (e: any) => {
            const targetId = e.detail?.id;
            if (!targetId || !graphInstance.current) return;
            const targetItem = graphInstance.current.findById(targetId);
            if (targetItem) {
                // 清理并高亮目标
                graphInstance.current.getNodes().forEach((n: any) => graphInstance.current.clearItemStates(n));
                graphInstance.current.setItemState(targetItem, 'selected', true);
                // 聚焦视图 + 1.2倍缩放
                graphInstance.current.focusItem(targetItem, true, { easing: 'easeCubic', duration: 600 });
                graphInstance.current.zoomTo(1.2, { x: 0, y: 0 }, true, { duration: 600 });
                // 并手动触发生态响应链
                onNodeSelect(targetItem.getModel());
                window.sessionStorage.setItem('SNA_FOCUS_UID', targetId);
            }
        };

        const handleRefresh = () => {
            fetchGraphData(); // 无感热刷新图谱（用于建边后）
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('SNA_FOCUS_NODE', handleFocusNode);
        window.addEventListener('SNA_REFRESH_GRAPH', handleRefresh);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('SNA_FOCUS_NODE', handleFocusNode);
            window.removeEventListener('SNA_REFRESH_GRAPH', handleRefresh);
            if (graphInstance.current) {
                graphInstance.current.destroy();
                graphInstance.current = null;
            }
        };
    }, []);

    return (
        <div className="flex-[3] bg-surface-light border border-border-light rounded-xl relative overflow-hidden group flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-white/90 backdrop-blur rounded-lg p-3 border border-border-light shadow-sm pointer-events-auto transition-transform">
                    <h3 className="text-stone-800 font-bold text-lg flex items-center gap-2">
                        <span className={`size-2 rounded-full ${loading ? 'bg-warning animate-spin' : 'bg-success animate-pulse'}`}></span>
                        核心力学拓扑推演引擎
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                        {loading ? "正在重排量子引力矩阵..." : "就绪，点击实体的圆点以接管控制。左键旋转，滚动缩放。"}
                    </p>
                </div>
                <div className="flex gap-2 pointer-events-auto flex-wrap justify-end">
                    {/* 方向切换三态按钮 */}
                    <div className="flex rounded-lg border border-border-light overflow-hidden shadow-sm bg-white text-xs font-bold">
                        {(['all', 'out', 'in'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    dirModeRef.current = m;
                                    setDirMode(m);
                                    // 如有已选节点则重新触发高亮
                                    const uid = lastClickedRef.current;
                                    if (uid && graphInstance.current) {
                                        const item = graphInstance.current.findById(uid);
                                        if (item) graphInstance.current.emit('node:click', { item });
                                    }
                                }}
                                className={`px-3 py-2 transition-colors flex items-center gap-1 ${dirMode === m
                                    ? 'bg-primary text-white'
                                    : 'text-stone-500 hover:bg-stone-50'
                                    }`}
                                title={m === 'all' ? '显示全部相邻边' : m === 'out' ? '只显示出边（下游依赖）' : '只显示入边（上游调用方）'}
                            >
                                <span className="material-symbols-outlined text-[15px]">
                                    {m === 'all' ? 'device_hub' : m === 'out' ? 'call_split' : 'call_merge'}
                                </span>
                                {m === 'all' ? '全部' : m === 'out' ? '下游' : '上游'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => {
                        graphInstance.current?.fitView();
                        graphInstance.current?.zoomTo(0.8, { x: 0, y: 0 }, true, { duration: 500 });
                    }} className="bg-white hover:bg-stone-50 text-stone-600 p-2 rounded-lg border border-border-light shadow-sm transition-colors" title="重置宏观视角">
                        <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
                    </button>
                    <button onClick={fetchGraphData} className="bg-white hover:bg-stone-50 text-stone-600 p-2 rounded-lg border border-border-light shadow-sm transition-colors" title="强刷内存帧">
                        <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden bg-graph-bg" ref={containerRef}>
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20 p-4 backdrop-blur-sm">
                        <span className="text-red-600 font-bold bg-white px-6 py-3 rounded-lg shadow-xl shadow-red-500/10 border border-red-200">
                            {error}
                        </span>
                    </div>
                )}
                {/* Initial Loading Screen layer */}
                {(loading && !graphInstance.current) && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur z-20">
                        <span className="text-primary font-bold animate-pulse text-lg tracking-widest bg-white px-8 py-3 rounded-full shadow-lg shadow-primary/10">连接中台聚变引力...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
