import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

// ===== 依赖管理模态框 =====
function DepModal({ service, onClose }: { service: any; onClose: () => void }) {
    const [downstream, setDownstream] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    // 搜索新增
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 加载当前下游依赖
    const loadDeps = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/services/${service.id}/dependencies`);
            setDownstream(res.data.data.downstream || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDeps(); }, [service.id]);

    // 搜索服务节点
    useEffect(() => {
        if (!searchTerm.trim()) { setSearchResults([]); setShowDropdown(false); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/services?q=${encodeURIComponent(searchTerm)}&limit=8`)
                .then(r => { setSearchResults(r.data.data.items || []); setShowDropdown(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // 点外部收起下拉
    useEffect(() => {
        const h = (e: any) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // 建立依赖
    const handleAdd = async (targetId: string) => {
        if (targetId === service.id) { alert('不能将自身设为依赖目标'); return; }
        if (downstream.some(d => d.id === targetId)) { alert('该依赖关系已存在'); return; }
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.post(`${API}/api/dependencies`, { source: service.id, target: targetId });
            setSearchTerm('');
            setShowDropdown(false);
            await loadDeps();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('建立依赖失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    // 断开依赖
    const handleRemove = async (targetId: string) => {
        if (!confirm(`确认断开 ${service.label} → ${targetId} 的调用依赖？`)) return;
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.delete(`${API}/api/dependencies`, { data: { source: service.id, target: targetId } });
            await loadDeps();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('断开失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-center items-center animate-in fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">account_tree</span>
                            依赖管理 — {service.label}
                        </h2>
                        <p className="text-xs text-text-secondary font-mono mt-0.5">id: {service.id}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* 搜索新增依赖 */}
                <div className="mb-5" ref={searchRef}>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">新增下游依赖</label>
                    <div className="relative">
                        <div className={`flex items-center border rounded-xl bg-stone-50 transition-all ${showDropdown && searchResults.length > 0 ? 'border-primary ring-2 ring-primary/10 rounded-b-none' : 'border-border-light'}`}>
                            <span className="material-symbols-outlined text-text-secondary ml-3 text-[18px]">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onFocus={() => searchTerm && setShowDropdown(true)}
                                placeholder="输入服务名或 ID 搜索并建立调用依赖..."
                                className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none font-medium"
                            />
                            {searchTerm && <button onClick={() => { setSearchTerm(''); setSearchResults([]); setShowDropdown(false); }} className="mr-2 text-stone-400 hover:text-stone-700"><span className="material-symbols-outlined text-[16px]">close</span></button>}
                        </div>
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg max-h-[200px] overflow-y-auto z-50 divide-y divide-border-light">
                                {searchResults.map((r, i) => (
                                    <div key={i} className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 transition-colors group">
                                        <div className="size-7 rounded-md bg-stone-100 border border-border-light flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[13px] text-stone-400">dns</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-stone-800 truncate">{r.label}</p>
                                            <p className="text-[10px] text-text-secondary font-mono">{r.id} · {r.properties?.tier || ''}</p>
                                        </div>
                                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono shrink-0">调用度:{r.degree}</span>
                                        <button
                                            onClick={() => handleAdd(r.id)}
                                            disabled={actionLoading[r.id] || downstream.some(d => d.id === r.id)}
                                            className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={downstream.some(d => d.id === r.id) ? '已存在' : '建立调用依赖'}
                                        >
                                            {actionLoading[r.id]
                                                ? <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                                : downstream.some(d => d.id === r.id)
                                                    ? <span className="material-symbols-outlined text-[14px]">check</span>
                                                    : <span className="material-symbols-outlined text-[14px]">add_link</span>
                                            }
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 当前下游依赖列表 */}
                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        当前下游依赖 ({downstream.length})
                    </label>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="material-symbols-outlined animate-spin text-primary text-2xl">sync</span>
                        </div>
                    ) : downstream.length === 0 ? (
                        <div className="text-center py-8 text-stone-400">
                            <span className="material-symbols-outlined text-3xl mb-2 block">link_off</span>
                            <p className="text-sm">暂无下游依赖，在上方搜索并建立</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {downstream.map((d: any) => (
                                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-border-light hover:border-primary/20 transition-all">
                                    <div className="size-8 rounded-lg bg-white border border-border-light flex items-center justify-center shadow-sm shrink-0">
                                        <span className="material-symbols-outlined text-[15px] text-stone-400">dns</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-stone-800 truncate">{d.label}</p>
                                        <p className="text-[10px] text-text-secondary font-mono">{d.id}</p>
                                    </div>
                                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono shrink-0">度:{d.degree}</span>
                                    <button
                                        onClick={() => handleRemove(d.id)}
                                        disabled={actionLoading[d.id]}
                                        className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-danger/5 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                                        title="断开依赖"
                                    >
                                        {actionLoading[d.id]
                                            ? <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                            : <span className="material-symbols-outlined text-[14px]">link_off</span>
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== 主组件 =====
export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<Record<string, boolean>>({});
    const [sortBy, setSortBy] = useState<'degree' | 'tier'>('tier');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newNode, setNewNode] = useState({ uid: '', name: '', techStack: '' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editNode, setEditNode] = useState({ uid: '', name: '', techStack: '' });

    // 依赖管理模态
    const [depService, setDepService] = useState<any>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/services?page=${page}&limit=20&sortBy=${sortBy}&sortDir=${sortDir}`);
            setUsers(res.data.data.items);
            setTotal(res.data.data.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSort = (field: 'degree' | 'tier') => {
        if (sortBy === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir(field === 'degree' ? 'desc' : 'asc');
        }
        setPage(1);
    };

    useEffect(() => { fetchUsers(); }, [page, sortBy, sortDir]);

    const handleAddNode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const techArray = newNode.techStack.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
            await axios.post(`${API}/api/services`, {
                uid: newNode.uid,
                name: newNode.name,
                properties: { techStack: techArray, tier: '旁路服务' }
            });
            setIsAddModalOpen(false);
            setNewNode({ uid: '', name: '', techStack: '' });
            fetchUsers();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (error: any) {
            alert("添加失败：" + (error.response?.data?.message || error.message));
        }
    };

    const handleEditNode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const techArray = editNode.techStack.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
            await axios.put(`${API}/api/services/${editNode.uid}`, {
                name: editNode.name,
                properties: { techStack: techArray, tier: '旁路服务' }
            });
            setIsEditModalOpen(false);
            fetchUsers();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (error: any) {
            alert("更新失败：" + (error.response?.data?.message || error.message));
        }
    };

    const openEditModal = (user: any) => {
        setEditNode({
            uid: user.id,
            name: user.label,
            techStack: (user.properties?.techStack || []).join('，')
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteNode = async (uid: string, label: string) => {
        if (!confirm(`确认将服务 "${label}" (${uid}) 从注册中移除？\n此操作将级联清除该服务的所有调用依赖边！`)) return;
        setDeleting(prev => ({ ...prev, [uid]: true }));
        try {
            await axios.delete(`${API}/api/services/${uid}`);
            fetchUsers();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (error: any) {
            alert("删除失败：" + (error.response?.data?.message || error.message));
        } finally {
            setDeleting(prev => ({ ...prev, [uid]: false }));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">服务注册表</h1>
                    <p className="text-sm text-text-secondary mt-1">管控系统内全部 {total} 个服务节点。增删改及依赖管理操作将实时双写至内存图与 SQLite 数据库。</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">dns</span>
                    注册新服务
                </button>
            </div>

            {/* 表格 */}
            <div className="bg-white border text-sm border-border-light shadow-sm rounded-xl overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex justify-center items-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50/80 border-b border-border-light text-text-secondary text-xs uppercase tracking-wider font-bold">
                                <th className="p-4 w-12 text-center">图标</th>
                                <th className="p-4">
                                    UID
                                </th>
                                <th className="p-4 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('tier')}>
                                    <span className="inline-flex items-center gap-1">
                                        层级
                                        {sortBy === 'tier' && <span className="material-symbols-outlined text-[14px] text-primary">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                                    </span>
                                </th>
                                <th className="p-4">服务名</th>
                                <th className="p-4">调用度</th>
                                <th className="p-4">技术栈</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light text-stone-800 font-medium">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                                    <td className="p-4 text-center">
                                        <div className="size-8 rounded-lg bg-stone-100 flex items-center justify-center border border-border-light inline-flex shadow-sm">
                                            <span className="material-symbols-outlined text-[16px] text-stone-400">dns</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-text-secondary text-[13px]">{u.id}</td>
                                    <td className="p-4">
                                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border
                                            text-stone-600 bg-stone-50 border-stone-200">
                                            {u.properties?.tier || '--'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold">{u.label}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">{u.degree}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.properties?.techStack?.map((tag: string, i: number) => (
                                                <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>
                                            ))}
                                            {(!u.properties?.techStack || u.properties?.techStack.length === 0) && <span className="text-stone-300 italic text-[11px]">--</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* 依赖管理 */}
                                            <button
                                                onClick={() => setDepService(u)}
                                                className="text-stone-500 hover:bg-stone-100 p-1.5 rounded transition-colors"
                                                title="管理调用依赖"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                                            </button>
                                            {/* 编辑节点 */}
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="text-primary hover:bg-primary/10 p-1.5 rounded transition-colors"
                                                title="编辑此节点"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            {/* 删除节点 */}
                                            <button
                                                onClick={() => handleDeleteNode(u.id, u.label)}
                                                disabled={deleting[u.id]}
                                                className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors disabled:opacity-50"
                                                title="删除此节点（级联清除关联边）"
                                            >
                                                {deleting[u.id]
                                                    ? <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                                    : <span className="material-symbols-outlined text-[18px]">delete</span>
                                                }
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 分页 */}
                <div className="px-5 py-3 border-t border-border-light bg-stone-50 flex items-center justify-between text-text-secondary text-sm">
                    <div>共 {total} 条 · 第 {page} 页</div>
                    <div className="space-x-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border border-border-light rounded hover:text-primary disabled:opacity-50 transition-colors">上一页</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="px-3 py-1 bg-white border border-border-light rounded hover:text-primary disabled:opacity-50 transition-colors">下一页</button>
                    </div>
                </div>
            </div>

            {/* 依赖管理模态框 */}
            {depService && <DepModal service={depService} onClose={() => setDepService(null)} />}

            {/* 注册新服务模态框 */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-center items-center animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                                注册新服务
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddNode} className="space-y-4 text-sm font-medium text-stone-700">
                            <div>
                                <label className="block mb-1.5">服务 ID (全局唯一)</label>
                                <input required value={newNode.uid} onChange={e => setNewNode({ ...newNode, uid: e.target.value })} placeholder="例如: svc_new_order" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                                <label className="block mb-1.5">服务名称</label>
                                <input required value={newNode.name} onChange={e => setNewNode({ ...newNode, name: e.target.value })} placeholder="例如: New-Order-Service" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                                <label className="block mb-1.5">技术栈</label>
                                <input value={newNode.techStack} onChange={e => setNewNode({ ...newNode, techStack: e.target.value })} placeholder="多个标签以逗号分隔，如: Java,Spring Boot" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                <p className="text-xs text-stone-400 mt-1.5">技术栈将参与 Jaccard 相似度推荐计算</p>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold transition-colors">取消</button>
                                <button type="submit" className="flex-[2] py-2 rounded-lg bg-primary text-white hover:bg-primary-hover font-bold shadow-lg shadow-primary/20 transition-colors">确认创建</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 编辑节点模态框 */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-center items-center animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_note</span>
                                编辑节点信息
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleEditNode} className="space-y-4 text-sm font-medium text-stone-700">
                            <div>
                                <label className="block mb-1.5">唯一标识 (UID)</label>
                                <input disabled value={editNode.uid} className="w-full border border-border-light rounded-lg px-3 py-2.5 bg-stone-50 text-text-secondary cursor-not-allowed" />
                                <p className="text-xs text-stone-400 mt-1">UID 为主键，不可修改</p>
                            </div>
                            <div>
                                <label className="block mb-1.5">名称</label>
                                <input required value={editNode.name} onChange={e => setEditNode({ ...editNode, name: e.target.value })} className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                                <label className="block mb-1.5">技术栈</label>
                                <input value={editNode.techStack} onChange={e => setEditNode({ ...editNode, techStack: e.target.value })} placeholder="多个标签以逗号分隔" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold transition-colors">取消</button>
                                <button type="submit" className="flex-[2] py-2 rounded-lg bg-primary text-white hover:bg-primary-hover font-bold shadow-lg shadow-primary/20 transition-colors">保存修改</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
