import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const TIER_ORDER = ['网关层', 'BFF层', '核心链路', '中间件', '数据层', '旁路服务'];

export default function RelationExplorer() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [firstDegree, setFirstDegree] = useState<any[]>([]);
    const [secondDegree, setSecondDegree] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const ref = useRef<HTMLDivElement>(null);
    // 全量服务快选
    const [allServices, setAllServices] = useState<any[]>([]);
    // 右侧面板宽度拖拽
    const [rightWidth, setRightWidth] = useState(208);
    const rightDragging = useRef(false);
    const rightStartX = useRef(0);
    const rightStartW = useRef(208);

    const onRightDrag = useCallback((e: React.MouseEvent) => {
        rightDragging.current = true;
        rightStartX.current = e.clientX;
        rightStartW.current = rightWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMove = (ev: MouseEvent) => {
            if (!rightDragging.current) return;
            // 向左拉 → 面板变宽
            const delta = rightStartX.current - ev.clientX;
            setRightWidth(Math.min(480, Math.max(120, rightStartW.current + delta)));
        };
        const onUp = () => {
            rightDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [rightWidth]);

    // 下游搜索新增
    const [addDownTerm, setAddDownTerm] = useState('');
    const [addDownResults, setAddDownResults] = useState<any[]>([]);
    const [addDownShow, setAddDownShow] = useState(false);
    const addDownRef = useRef<HTMLDivElement>(null);

    // 上游搜索新增
    const [addUpTerm, setAddUpTerm] = useState('');
    const [addUpResults, setAddUpResults] = useState<any[]>([]);
    const [addUpShow, setAddUpShow] = useState(false);
    const addUpRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: any) => {
            if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false);
            if (addDownRef.current && !addDownRef.current.contains(e.target)) setAddDownShow(false);
            if (addUpRef.current && !addUpRef.current.contains(e.target)) setAddUpShow(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // 启动时拉取全量服务并按层级排序
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

    // 主搜索
    useEffect(() => {
        if (!searchTerm.trim()) { setSearchResults([]); setShowDropdown(false); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/services?q=${encodeURIComponent(searchTerm)}&limit=8`)
                .then(r => { setSearchResults(r.data.data.items || []); setShowDropdown(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // 下游面板搜索
    useEffect(() => {
        if (!addDownTerm.trim()) { setAddDownResults([]); setAddDownShow(false); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/services?q=${encodeURIComponent(addDownTerm)}&limit=6`)
                .then(r => { setAddDownResults(r.data.data.items || []); setAddDownShow(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [addDownTerm]);

    // 上游面板搜索
    useEffect(() => {
        if (!addUpTerm.trim()) { setAddUpResults([]); setAddUpShow(false); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/services?q=${encodeURIComponent(addUpTerm)}&limit=6`)
                .then(r => { setAddUpResults(r.data.data.items || []); setAddUpShow(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [addUpTerm]);

    const selectUser = async (user: any) => {
        setSelectedUser(user);
        setSearchTerm('');
        setShowDropdown(false);
        await loadFriends(user.id);
    };

    const loadFriends = async (uid: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/services/${uid}/dependencies`);;
            setFirstDegree(res.data.data.downstream || []);
            setSecondDegree(res.data.data.upstream || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 新增下游
    const handleAddEdge = async (targetId: string) => {
        if (!selectedUser) return;
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.post(`${API}/api/dependencies`, { source: selectedUser.id, target: targetId });
            setAddDownTerm(''); setAddDownResults([]); setAddDownShow(false);
            await loadFriends(selectedUser.id);
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('建立依赖失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    // 新增上游（谁调用我）
    const handleAddUpstream = async (callerId: string) => {
        if (!selectedUser) return;
        setActionLoading(p => ({ ...p, [callerId]: true }));
        try {
            await axios.post(`${API}/api/dependencies`, { source: callerId, target: selectedUser.id });
            setAddUpTerm(''); setAddUpResults([]); setAddUpShow(false);
            await loadFriends(selectedUser.id);
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('建立上游失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [callerId]: false }));
        }
    };

    const handleRemoveEdge = async (targetId: string) => {
        if (!selectedUser) return;
        if (!confirm(`确认移除 ${selectedUser.label} 对该服务的依赖关系？`)) return;
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.delete(`${API}/api/dependencies`, { data: { source: selectedUser.id, target: targetId } });
            await loadFriends(selectedUser.id);
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('移除依赖失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    const FriendCard = ({ user, kind }: { user: any; kind: 'first' | 'second' }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border-light hover:border-primary/30 transition-all hover:shadow-sm group">
            <div className="size-10 rounded-lg bg-stone-100 border border-border-light flex-shrink-0 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-stone-400">dns</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-800 truncate">{user.label}</h4>
                    <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">度:{user.degree}</span>
                </div>
                <p className="text-[10px] text-text-secondary font-mono truncate">{user.id}</p>
                {kind === 'second' && user.mutualDeps > 0 && (
                    <p className="text-[10px] text-primary font-medium mt-0.5">共同下游依赖 {user.mutualDeps} 个</p>
                )}
            </div>
            <button
                onClick={() => kind === 'first' ? handleRemoveEdge(user.id) : handleAddEdge(user.id)}
                disabled={actionLoading[user.id]}
                className={`shrink-0 size-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${kind === 'first'
                    ? 'text-danger bg-danger/5 hover:bg-danger/10'
                    : 'text-primary bg-primary/5 hover:bg-primary/10'
                    }`}
                title={kind === 'first' ? '移除下游依赖' : '建立调用依赖'}
            >
                {actionLoading[user.id] ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                ) : (
                    <span className="material-symbols-outlined text-[18px]">{kind === 'first' ? 'link_off' : 'add_link'}</span>
                )}
            </button>
        </div>
    );

    return (
        <div className="flex h-full overflow-hidden" onWheel={e => e.stopPropagation()}>
            {/* 主内容区 */}
            <div className="flex-1 overflow-y-auto p-6 bg-background-light">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[28px]">hub</span>
                            爆炸半径评估
                        </h1>
                        <p className="text-sm text-text-secondary mt-1">选择一个服务，可视化其直接下游依赖与上游调用方，评估敌障故障情影响范围。</p>
                    </div>

                    {/* Search */}
                    <div className="bg-white border border-border-light rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6 relative" ref={ref}>
                        <div className={`flex items-center border rounded-xl bg-stone-50 transition-all ${showDropdown && searchResults.length > 0 ? 'border-primary ring-2 ring-primary/10 rounded-b-none' : 'border-border-light'}`}>
                            <span className="material-symbols-outlined text-text-secondary ml-3">person_search</span>
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => searchTerm && setShowDropdown(true)}
                                placeholder="搜索服务节点以展开依赖拓扑..." className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-medium" />
                        </div>
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute left-5 right-5 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg max-h-[240px] overflow-y-auto z-50 divide-y divide-border-light">
                                {searchResults.map((r, i) => (
                                    <div key={i} onClick={() => selectUser(r)} className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 transition-colors">
                                        <div className="size-7 rounded-md bg-stone-100 border border-border-light flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[14px] text-stone-400">dns</span>
                                        </div>
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

                    {/* Selected User Profile */}
                    {selectedUser && (
                        <div className="bg-white border border-border-light rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-full border-2 border-primary p-0.5">
                                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[28px] text-primary">dns</span>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-stone-800">{selectedUser.label}</h2>
                                    <p className="text-xs text-text-secondary font-mono mt-0.5">id: {selectedUser.id}</p>
                                </div>
                                <div className="ml-auto flex gap-3">
                                    <div className="text-center px-4 py-2 bg-stone-50 rounded-lg border border-border-light">
                                        <p className="text-lg font-bold text-primary">{firstDegree.length}</p>
                                        <p className="text-[10px] text-text-secondary font-medium">直接下游</p>
                                    </div>
                                    <div className="text-center px-4 py-2 bg-stone-50 rounded-lg border border-border-light">
                                        <p className="text-lg font-bold text-stone-600">{secondDegree.length}</p>
                                        <p className="text-[10px] text-text-secondary font-medium">上游调用方</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Friends Grid */}
                    {selectedUser && !loading && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 直接下游服务 */}
                            <div>
                                <h3 className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-success text-[18px]">call_split</span>
                                    直接下游服务 ({firstDegree.length})
                                </h3>
                                {/* 搜索新增下游 */}
                                <div className="relative mb-2" ref={addDownRef}>
                                    <div className={`flex items-center border rounded-lg bg-stone-50 text-sm transition-all ${addDownShow && addDownResults.length > 0 ? 'border-primary ring-1 ring-primary/10 rounded-b-none' : 'border-border-light'}`}>
                                        <span className="material-symbols-outlined text-stone-400 ml-2.5 text-[16px]">add_link</span>
                                        <input
                                            type="text" value={addDownTerm}
                                            onChange={e => setAddDownTerm(e.target.value)}
                                            onFocus={() => addDownTerm && setAddDownShow(true)}
                                            placeholder="搜索并新增下游依赖..."
                                            className="w-full px-2 py-2 bg-transparent text-xs focus:outline-none"
                                        />
                                        {addDownTerm && <button onClick={() => { setAddDownTerm(''); setAddDownResults([]); setAddDownShow(false); }} className="mr-2 text-stone-300 hover:text-stone-500"><span className="material-symbols-outlined text-[14px]">close</span></button>}
                                    </div>
                                    {addDownShow && addDownResults.length > 0 && (
                                        <div className="absolute left-0 right-0 bg-white border-x border-b border-border-light rounded-b-lg shadow-lg max-h-[200px] overflow-y-auto z-40 divide-y divide-stone-50">
                                            {addDownResults.map((r, i) => (
                                                <div key={i} className="px-3 py-2 hover:bg-stone-50 flex items-center gap-2 cursor-default">
                                                    <span className="material-symbols-outlined text-[13px] text-stone-400">dns</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-stone-800 truncate">{r.label}</p>
                                                        <p className="text-[10px] text-text-secondary font-mono">{r.id}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddEdge(r.id)}
                                                        disabled={actionLoading[r.id] || firstDegree.some(d => d.id === r.id) || r.id === selectedUser?.id}
                                                        className="shrink-0 size-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                                                        title={firstDegree.some(d => d.id === r.id) ? '已存在' : '建立下游依赖'}
                                                    >
                                                        {actionLoading[r.id]
                                                            ? <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                                            : firstDegree.some(d => d.id === r.id)
                                                                ? <span className="material-symbols-outlined text-[12px]">check</span>
                                                                : <span className="material-symbols-outlined text-[12px]">add</span>
                                                        }
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {firstDegree.length > 0 ? firstDegree.map(f => <FriendCard key={f.id} user={f} kind="first" />) : (
                                        <div className="text-center py-8 text-stone-400">
                                            <span className="material-symbols-outlined text-3xl mb-2 block">link_off</span>
                                            <p className="text-sm">暂无下游依赖服务</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* 上游调用方 */}
                            <div>
                                <h3 className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">call_merge</span>
                                    上游调用方 ({secondDegree.length})
                                </h3>
                                {/* 搜索新增上游 */}
                                <div className="relative mb-2" ref={addUpRef}>
                                    <div className={`flex items-center border rounded-lg bg-stone-50 text-sm transition-all ${addUpShow && addUpResults.length > 0 ? 'border-primary ring-1 ring-primary/10 rounded-b-none' : 'border-border-light'}`}>
                                        <span className="material-symbols-outlined text-stone-400 ml-2.5 text-[16px]">call_merge</span>
                                        <input
                                            type="text" value={addUpTerm}
                                            onChange={e => setAddUpTerm(e.target.value)}
                                            onFocus={() => addUpTerm && setAddUpShow(true)}
                                            placeholder="搜索并添加新上游调用方..."
                                            className="w-full px-2 py-2 bg-transparent text-xs focus:outline-none"
                                        />
                                        {addUpTerm && <button onClick={() => { setAddUpTerm(''); setAddUpResults([]); setAddUpShow(false); }} className="mr-2 text-stone-300 hover:text-stone-500"><span className="material-symbols-outlined text-[14px]">close</span></button>}
                                    </div>
                                    {addUpShow && addUpResults.length > 0 && (
                                        <div className="absolute left-0 right-0 bg-white border-x border-b border-border-light rounded-b-lg shadow-lg max-h-[200px] overflow-y-auto z-40 divide-y divide-stone-50">
                                            {addUpResults.map((r, i) => (
                                                <div key={i} className="px-3 py-2 hover:bg-stone-50 flex items-center gap-2 cursor-default">
                                                    <span className="material-symbols-outlined text-[13px] text-stone-400">dns</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-stone-800 truncate">{r.label}</p>
                                                        <p className="text-[10px] text-text-secondary font-mono">{r.id}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddUpstream(r.id)}
                                                        disabled={actionLoading[r.id] || secondDegree.some(d => d.id === r.id) || r.id === selectedUser?.id}
                                                        className="shrink-0 size-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                                                        title={secondDegree.some(d => d.id === r.id) ? '已存在' : '建立为上游调用方'}
                                                    >
                                                        {actionLoading[r.id]
                                                            ? <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                                                            : secondDegree.some(d => d.id === r.id)
                                                                ? <span className="material-symbols-outlined text-[12px]">check</span>
                                                                : <span className="material-symbols-outlined text-[12px]">add</span>
                                                        }
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                    {secondDegree.length > 0 ? secondDegree.slice(0, 50).map(f => <FriendCard key={f.id} user={f} kind="second" />) : (
                                        <div className="text-center py-8 text-stone-400">
                                            <span className="material-symbols-outlined text-3xl mb-2 block">explore_off</span>
                                            <p className="text-sm">无上游调用方</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
                            <p className="text-sm text-text-secondary mt-3">正在分析服务依赖拓扑...</p>
                        </div>
                    )}

                    {!selectedUser && !loading && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-6xl text-stone-200 mb-4 block">scatter_plot</span>
                            <h3 className="text-lg font-bold text-stone-400">选择一个服务节点</h3>
                            <p className="text-sm text-stone-400 mt-1">在上方搜索框中输入服务名，展开其上下游依赖拓扑</p>
                        </div>
                    )}
                </div>{/* closes max-w-5xl */}
            </div>{/* closes flex-1 main content */}

            {/* 右侧拖拽分隔条 */}
            <div
                onMouseDown={onRightDrag}
                className="w-1 shrink-0 cursor-col-resize bg-border-light hover:bg-primary/40 transition-colors active:bg-primary"
                title="拖拽调整快选面板宽度"
            />
            {/* 右侧快选面板 */}
            <div style={{ width: rightWidth }} className="shrink-0 border-r border-border-light bg-white overflow-y-auto flex flex-col">
                <div className="px-3 py-3 border-b border-border-light sticky top-0 bg-white z-10">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">快速选择</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">上游 → 下游</p>
                </div>
                <div className="flex-1 p-2 space-y-0.5">
                    {allServices.map((svc, i) => {
                        const isSelected = selectedUser?.id === svc.id;
                        const tier = svc.properties?.tier || '';
                        const tierIcon = tier.includes('网关') ? 'router' : tier.includes('BFF') ? 'hub' : tier.includes('核心') ? 'dns' : tier.includes('中间件') ? 'settings_ethernet' : tier.includes('数据') ? 'storage' : 'cloud';
                        const prevTier = i > 0 ? (allServices[i - 1].properties?.tier || '') : tier;
                        const showLabel = i === 0 || tier !== prevTier;
                        return (
                            <div key={svc.id}>
                                {showLabel && (
                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest px-2 pt-2 pb-1">{tier || '其他'}</p>
                                )}
                                <button
                                    onClick={() => selectUser(svc)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${isSelected
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'hover:bg-stone-50 text-stone-700'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[14px] shrink-0 ${isSelected ? 'text-white' : 'text-stone-400'}`}>{tierIcon}</span>
                                    <span className="text-[11px] font-medium truncate">{svc.label}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
