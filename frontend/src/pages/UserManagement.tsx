import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<Record<string, boolean>>({});
    const [sortBy, setSortBy] = useState<'degree' | 'uid'>('degree');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newNode, setNewNode] = useState({ uid: '', name: '', interests: '' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editNode, setEditNode] = useState({ uid: '', name: '', interests: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/users?page=${page}&limit=20&sortBy=${sortBy}&sortDir=${sortDir}`);
            setUsers(res.data.data.items);
            setTotal(res.data.data.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSort = (field: 'degree' | 'uid') => {
        if (sortBy === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir(field === 'degree' ? 'desc' : 'asc');
        }
        setPage(1);
    };

    useEffect(() => {
        fetchUsers();
    }, [page, sortBy, sortDir]);

    const handleAddNode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const interestsArray = newNode.interests.split(/[,，]/).map(s => s.trim()).filter(Boolean);
            await axios.post('http://localhost:8000/api/users', {
                uid: newNode.uid,
                name: newNode.name,
                properties: { interests: interestsArray }
            });
            setIsAddModalOpen(false);
            setNewNode({ uid: '', name: '', interests: '' });
            fetchUsers();
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (error: any) {
            alert("添加失败：" + (error.response?.data?.message || error.message));
        }
    };

    const handleEditNode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const interestsArray = editNode.interests.split(/[,，]/).map(s => s.trim()).filter(Boolean);
            await axios.put(`http://localhost:8000/api/users/${editNode.uid}`, {
                name: editNode.name,
                properties: { interests: interestsArray }
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
            interests: (user.properties?.interests || []).join('，')
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteNode = async (uid: string, label: string) => {
        if (!confirm(`确认要将节点 "${label}" (${uid}) 从系统中彻底抹除吗？\n此操作将级联清除该节点的所有关联边！`)) return;
        setDeleting(prev => ({ ...prev, [uid]: true }));
        try {
            await axios.delete(`http://localhost:8000/api/users/${uid}`);
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
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">实体管理中心</h1>
                    <p className="text-sm text-text-secondary mt-1">管控系统内全部 {total} 个人物节点。增删改操作将实时双写至内存图与 SQLite 数据库。</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    新增实体节点
                </button>
            </div>

            {/* Table Area */}
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
                                <th className="p-4 w-12 text-center">档案</th>
                                <th className="p-4 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('uid')}>
                                    <span className="inline-flex items-center gap-1">
                                        UID
                                        {sortBy === 'uid' && <span className="material-symbols-outlined text-[14px] text-primary">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                                    </span>
                                </th>
                                <th className="p-4">名称</th>
                                <th className="p-4 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleSort('degree')}>
                                    <span className="inline-flex items-center gap-1">
                                        节点度
                                        {sortBy === 'degree' && <span className="material-symbols-outlined text-[14px] text-primary">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                                    </span>
                                </th>
                                <th className="p-4">兴趣标签</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light text-stone-800 font-medium">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                                    <td className="p-4 text-center">
                                        <div className="size-8 rounded bg-cover bg-center border border-border-light inline-block shadow-sm" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${u.id}')` }}></div>
                                    </td>
                                    <td className="p-4 font-mono text-text-secondary text-[13px]">{u.id}</td>
                                    <td className="p-4 font-bold">{u.label}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">{u.degree}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.properties?.interests?.map((tag: string, i: number) => (
                                                <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>
                                            ))}
                                            {(!u.properties?.interests || u.properties?.interests.length === 0) && <span className="text-stone-300 italic text-[11px]">--</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="text-primary hover:bg-primary/10 p-1.5 rounded transition-colors"
                                                title="编辑此节点"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteNode(u.id, u.label)}
                                                disabled={deleting[u.id]}
                                                className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors disabled:opacity-50"
                                                title="删除此节点（级联清除关联边）"
                                            >
                                                {deleting[u.id] ? (
                                                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-3 border-t border-border-light bg-stone-50 flex items-center justify-between text-text-secondary text-sm">
                    <div>共 {total} 条 · 第 {page} 页</div>
                    <div className="space-x-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border border-border-light rounded hover:text-primary disabled:opacity-50 transition-colors">上一页</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="px-3 py-1 bg-white border border-border-light rounded hover:text-primary disabled:opacity-50 transition-colors">下一页</button>
                    </div>
                </div>
            </div>

            {/* Add Node Dialog */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-center items-center animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                                新增实体节点
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddNode} className="space-y-4 text-sm font-medium text-stone-700">
                            <div>
                                <label className="block mb-1.5">唯一标识 (UID)</label>
                                <input required value={newNode.uid} onChange={e => setNewNode({ ...newNode, uid: e.target.value })} placeholder="例如: p_new01（需全局唯一）" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                                <label className="block mb-1.5">名称</label>
                                <input required value={newNode.name} onChange={e => setNewNode({ ...newNode, name: e.target.value })} placeholder="例如: 张三" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div>
                                <label className="block mb-1.5">兴趣标签</label>
                                <input value={newNode.interests} onChange={e => setNewNode({ ...newNode, interests: e.target.value })} placeholder="多个标签以逗号分隔，如: 编程,音乐" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                <p className="text-xs text-stone-400 mt-1.5">标签将参与 Jaccard 相似度推荐计算</p>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold transition-colors">取消</button>
                                <button type="submit" className="flex-[2] py-2 rounded-lg bg-primary text-white hover:bg-primary-hover font-bold shadow-lg shadow-primary/20 transition-colors">确认创建</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Node Dialog */}
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
                                <label className="block mb-1.5">兴趣标签</label>
                                <input value={editNode.interests} onChange={e => setEditNode({ ...editNode, interests: e.target.value })} placeholder="多个标签以逗号分隔" className="w-full border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
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
