import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';
const TIER_ORDER = ['网关层', 'BFF层', '核心链路', '中间件', '数据层', '旁路服务'];

function UserSearchInput({ label, value, displayLabel, onChange, placeholder }: {
    label: string; value: string; displayLabel?: string;
    onChange: (uid: string, name: string) => void; placeholder: string;
}) {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [internalLabel, setInternalLabel] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInternalLabel(displayLabel || '');
        if (!displayLabel) setTerm('');
    }, [displayLabel]);

    useEffect(() => {
        const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!term.trim()) { setResults([]); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/services?q=${encodeURIComponent(term)}&limit=6`)
                .then(r => { setResults(r.data.data.items || []); setShow(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [term]);

    const clear = () => { setInternalLabel(''); setTerm(''); onChange('', ''); };

    return (
        <div className="flex-1 relative" ref={ref}>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{label}</label>
            <div className={`flex items-center border rounded-xl bg-white transition-all ${show && results.length > 0 ? 'border-primary ring-2 ring-primary/10 rounded-b-none' : value ? 'border-primary/40 bg-primary/5' : 'border-border-light hover:border-stone-300'}`}>
                <span className="material-symbols-outlined text-text-secondary ml-3 text-[20px]">dns</span>
                <input
                    type="text"
                    value={internalLabel || term}
                    onChange={e => { setTerm(e.target.value); setInternalLabel(''); onChange('', ''); }}
                    onFocus={() => term && setShow(true)}
                    placeholder={placeholder}
                    className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-medium"
                />
                {(internalLabel || value) && (
                    <button onClick={clear} className="mr-2 text-stone-400 hover:text-stone-700">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>
            {show && results.length > 0 && (
                <div className="absolute z-50 left-0 right-0 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg max-h-[220px] overflow-y-auto divide-y divide-border-light">
                    {results.map((r, i) => (
                        <div key={i} onClick={() => { onChange(r.id, r.label); setInternalLabel(`${r.label} (${r.id})`); setShow(false); setTerm(''); }}
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 transition-colors">
                            <div className="size-7 rounded-lg bg-stone-100 flex items-center justify-center border border-border-light flex-shrink-0">
                                <span className="material-symbols-outlined text-[14px] text-stone-400">dns</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-stone-800">{r.label}</p>
                                <p className="text-[10px] text-text-secondary font-mono">{r.id}</p>
                            </div>
                            <span className="ml-auto text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono">调用度:{r.degree}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PathFinder() {
    const [startId, setStartId] = useState('');
    const [endId, setEndId] = useState('');
    const [startName, setStartName] = useState('');
    const [endName, setEndName] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allServices, setAllServices] = useState<any[]>([]);
    // 快选面板展开状态
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        axios.get(`${API}/api/services?limit=200`).then(r => {
            const items: any[] = r.data.data.items || [];
            items.sort((a, b) => {
                const ai = TIER_ORDER.indexOf(a.properties?.tier || '');
                const bi = TIER_ORDER.indexOf(b.properties?.tier || '');
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
            setAllServices(items);
        }).catch(() => { });
    }, []);

    const handleSearch = async () => {
        if (!startId || !endId) { setError('请选择起始服务和目标服务'); return; }
        if (startId === endId) { setError('起始和目标不能是同一服务'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/trace/${startId}/${endId}`);
            setResult(res.data.data);
        } catch (e: any) {
            setError(e.response?.data?.message || e.message);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleChipClick = (svc: any) => {
        if (startId === svc.id) { setStartId(''); setStartName(''); return; }
        if (endId === svc.id) { setEndId(''); setEndName(''); return; }
        if (!startId) { setStartId(svc.id); setStartName(svc.label); }
        else if (!endId) { setEndId(svc.id); setEndName(svc.label); }
        else { setStartId(svc.id); setStartName(svc.label); }
    };

    // 按层级分组
    const tierGroups: Record<string, any[]> = {};
    for (const svc of allServices) {
        const t = svc.properties?.tier || '其他';
        if (!tierGroups[t]) tierGroups[t] = [];
        tierGroups[t].push(svc);
    }
    const orderedTiers = [...TIER_ORDER, '其他'].filter(t => tierGroups[t]?.length);

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-background-light">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]">route</span>
                        调用链路追踪引擎
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">基于 BFS 广度优先搜索，计算任意两个微服务间的最短调用跳数与完整链路序列。</p>
                </div>

                {/* Search Panel */}
                <div className="bg-white border border-border-light rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6 overflow-hidden">
                    <div className="p-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-end">
                            <UserSearchInput
                                label="起始服务" value={startId}
                                displayLabel={startId && startName ? `${startName} (${startId})` : undefined}
                                onChange={(id, name) => { setStartId(id); setStartName(name); }}
                                placeholder="搜索起始服务..."
                            />
                            <div className="flex items-center justify-center lg:pb-1">
                                <span className="material-symbols-outlined text-primary text-[28px] rotate-90 lg:rotate-0">arrow_forward</span>
                            </div>
                            <UserSearchInput
                                label="目标服务" value={endId}
                                displayLabel={endId && endName ? `${endName} (${endId})` : undefined}
                                onChange={(id, name) => { setEndId(id); setEndName(name); }}
                                placeholder="搜索目标服务..."
                            />
                            <button onClick={handleSearch} disabled={loading || !startId || !endId}
                                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 whitespace-nowrap">
                                {loading ? <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[18px]">search</span>}
                                追踪链路
                            </button>
                        </div>
                        {error && <p className="text-danger text-sm mt-3 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}
                    </div>

                    {/* 快选折叠触发条 */}
                    <button
                        onClick={() => setPanelOpen(o => !o)}
                        className="w-full flex items-center gap-2 px-5 py-2.5 border-t border-border-light bg-stone-50/60 hover:bg-stone-100/60 transition-colors text-left"
                    >
                        <span className="material-symbols-outlined text-[15px] text-stone-400">touch_app</span>
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest flex-1">
                            快速选择
                            {(startId || endId) && (
                                <span className="ml-2 font-normal text-stone-500 normal-case tracking-normal">
                                    {startId ? startName : '—'} → {endId ? endName : '—'}
                                </span>
                            )}
                        </span>
                        <span className={`material-symbols-outlined text-[18px] text-stone-400 transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>

                    {/* 下滑展开面板 */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${panelOpen ? 'max-h-[340px]' : 'max-h-0'}`}>
                        <div className="border-t border-border-light overflow-y-auto" style={{ maxHeight: 340 }}>
                            {/* 状态提示 */}
                            <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-5 py-2 flex items-center gap-2 border-b border-border-light z-10">
                                {!startId && !endId && <span className="text-[11px] text-stone-400">点击选择<span className="text-primary font-bold ml-1">起始服务</span></span>}
                                {startId && !endId && <><span className="size-2 rounded-full bg-primary inline-block" /><span className="text-[11px] text-stone-500">起点 <strong>{startName}</strong>，再点选<span className="text-success font-bold ml-1">终点</span></span></>}
                                {startId && endId && <><span className="text-[11px] text-stone-500"><span className="text-primary font-bold">{startName}</span> → <span className="text-success font-bold">{endName}</span></span></>}
                                {(startId || endId) && (
                                    <button onClick={() => { setStartId(''); setStartName(''); setEndId(''); setEndName(''); }}
                                        className="ml-auto text-[10px] text-stone-400 hover:text-danger flex items-center gap-0.5 transition-colors">
                                        <span className="material-symbols-outlined text-[12px]">close</span>清除
                                    </button>
                                )}
                            </div>

                            {/* 层级分组服务列表 */}
                            <div className="p-4 space-y-4">
                                {orderedTiers.map(tier => (
                                    <div key={tier}>
                                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2">{tier}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tierGroups[tier].map(svc => {
                                                const isStart = startId === svc.id;
                                                const isEnd = endId === svc.id;
                                                return (
                                                    <button
                                                        key={svc.id}
                                                        onClick={() => handleChipClick(svc)}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${isStart
                                                                ? 'bg-primary text-white border-primary shadow-sm'
                                                                : isEnd
                                                                    ? 'bg-success text-white border-success shadow-sm'
                                                                    : 'bg-white text-stone-600 border-border-light hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                                                            }`}
                                                        title={isStart ? '起点（点击取消）' : isEnd ? '终点（点击取消）' : svc.id}
                                                    >
                                                        {svc.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <div className="bg-white border border-border-light rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-in slide-in-from-bottom-4">
                        {result.distance === -1 ? (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined text-5xl text-stone-200 mb-3 block">link_off</span>
                                <h3 className="text-lg font-bold text-stone-600">路径不可达</h3>
                                <p className="text-sm text-text-secondary mt-1">节点 <strong>{startName}</strong> 与 <strong>{endName}</strong> 之间不存在连通路径</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-success/10 text-success px-4 py-2 rounded-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                        <span className="font-bold">调用跳数: {result.distance} 跳</span>
                                    </div>
                                    <span className="text-sm text-text-secondary">经过 {result.path.length} 个节点</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {result.path.map((node: any, idx: number) => (
                                        <React.Fragment key={node.id}>
                                            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${idx === 0 ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/10' :
                                                idx === result.path.length - 1 ? 'bg-success/10 border-success/30 ring-2 ring-success/10' :
                                                    'bg-white border-border-light hover:shadow-md'}`}>
                                                <div className="size-9 rounded-lg bg-stone-100 border border-border-light shadow-sm flex items-center justify-center flex-shrink-0">
                                                    <span className="material-symbols-outlined text-[18px] text-stone-400">dns</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-stone-800">{node.label}</p>
                                                    <p className="text-[10px] text-text-secondary font-mono">{node.id}</p>
                                                </div>
                                                {idx === 0 && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold ml-1">源服务</span>}
                                                {idx === result.path.length - 1 && <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded font-bold ml-1">目标服务</span>}
                                            </div>
                                            {idx < result.path.length - 1 && (
                                                <span className="material-symbols-outlined text-primary text-[24px] flex-shrink-0">arrow_forward</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!result && !loading && (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined text-6xl text-stone-200 mb-4 block">conversion_path</span>
                        <h3 className="text-lg font-bold text-stone-400">等待调用链分析</h3>
                        <p className="text-sm text-stone-400 mt-1">选择两个服务节点，系统将计算它们之间的调用链层级</p>
                    </div>
                )}
            </div>
        </div>
    );
}
