import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

function UserSearchInput({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (uid: string, name: string) => void; placeholder: string;
}) {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!term.trim()) { setResults([]); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/users?q=${encodeURIComponent(term)}&limit=6`)
                .then(r => { setResults(r.data.data.items || []); setShow(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [term]);

    return (
        <div className="flex-1 relative" ref={ref}>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{label}</label>
            <div className={`flex items-center border rounded-xl bg-white transition-all ${show && results.length > 0 ? 'border-primary ring-2 ring-primary/10 rounded-b-none' : 'border-border-light hover:border-stone-300'}`}>
                <span className="material-symbols-outlined text-text-secondary ml-3 text-[20px]">person_search</span>
                <input
                    type="text"
                    value={selectedLabel || term}
                    onChange={e => { setTerm(e.target.value); setSelectedLabel(''); onChange('', ''); }}
                    onFocus={() => term && setShow(true)}
                    placeholder={placeholder}
                    className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-medium"
                />
                {selectedLabel && (
                    <button onClick={() => { setSelectedLabel(''); setTerm(''); onChange('', ''); }} className="mr-2 text-stone-400 hover:text-stone-700">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>
            {show && results.length > 0 && (
                <div className="absolute z-50 left-0 right-0 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg max-h-[220px] overflow-y-auto divide-y divide-border-light">
                    {results.map((r, i) => (
                        <div key={i} onClick={() => { onChange(r.id, r.label); setSelectedLabel(`${r.label} (${r.id})`); setShow(false); setTerm(''); }}
                            className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 transition-colors">
                            <div className="size-7 rounded-full bg-cover bg-center border border-border-light flex-shrink-0" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${r.id}')` }}></div>
                            <div>
                                <p className="text-sm font-bold text-stone-800">{r.label}</p>
                                <p className="text-[10px] text-text-secondary font-mono">{r.id}</p>
                            </div>
                            <span className="ml-auto text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono">度:{r.degree}</span>
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

    const handleSearch = async () => {
        if (!startId || !endId) { setError('请选择起点和终点用户'); return; }
        if (startId === endId) { setError('起点和终点不能相同'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/path/${startId}/${endId}`);
            setResult(res.data.data);
        } catch (e: any) {
            setError(e.response?.data?.message || e.message);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-background-light">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]">route</span>
                        社交路径分析引擎
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">基于 BFS 广度优先搜索，计算网络中任意两节点间的最短社交跳数与完整路径链。</p>
                </div>

                {/* Search Panel */}
                <div className="bg-white border border-border-light rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-end">
                        <UserSearchInput label="起点用户" value={startId} onChange={(id, name) => { setStartId(id); setStartName(name); }} placeholder="搜索起点..." />
                        <div className="flex items-center justify-center lg:pb-1">
                            <span className="material-symbols-outlined text-primary text-[28px] rotate-90 lg:rotate-0">arrow_forward</span>
                        </div>
                        <UserSearchInput label="终点用户" value={endId} onChange={(id, name) => { setEndId(id); setEndName(name); }} placeholder="搜索终点..." />
                        <button onClick={handleSearch} disabled={loading || !startId || !endId}
                            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 whitespace-nowrap">
                            {loading ? <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[18px]">search</span>}
                            计算路径
                        </button>
                    </div>
                    {error && <p className="text-danger text-sm mt-3 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}
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
                                        <span className="font-bold">最短距离: {result.distance} 跳</span>
                                    </div>
                                    <span className="text-sm text-text-secondary">经过 {result.path.length} 个节点</span>
                                </div>

                                {/* Path Visualization */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {result.path.map((node: any, idx: number) => (
                                        <React.Fragment key={node.id}>
                                            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${idx === 0 ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/10' :
                                                    idx === result.path.length - 1 ? 'bg-success/10 border-success/30 ring-2 ring-success/10' :
                                                        'bg-white border-border-light hover:shadow-md'
                                                }`}>
                                                <div className="size-9 rounded-full bg-cover bg-center border border-border-light shadow-sm" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${node.id}')` }}></div>
                                                <div>
                                                    <p className="text-sm font-bold text-stone-800">{node.label}</p>
                                                    <p className="text-[10px] text-text-secondary font-mono">{node.id}</p>
                                                </div>
                                                {idx === 0 && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold ml-1">起点</span>}
                                                {idx === result.path.length - 1 && <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded font-bold ml-1">终点</span>}
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
                        <h3 className="text-lg font-bold text-stone-400">等待路径探索</h3>
                        <p className="text-sm text-stone-400 mt-1">选择两个用户节点，系统将计算它们之间的最短社交路径</p>
                    </div>
                )}
            </div>
        </div>
    );
}
