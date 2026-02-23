import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

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

    useEffect(() => {
        const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) { setSearchResults([]); setShowDropdown(false); return; }
        const t = setTimeout(() => {
            axios.get(`${API}/api/users?q=${encodeURIComponent(searchTerm)}&limit=8`)
                .then(r => { setSearchResults(r.data.data.items || []); setShowDropdown(true); })
                .catch(() => { });
        }, 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const selectUser = async (user: any) => {
        setSelectedUser(user);
        setSearchTerm('');
        setShowDropdown(false);
        await loadFriends(user.id);
    };

    const loadFriends = async (uid: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/users/${uid}/friends`);
            setFirstDegree(res.data.data.first_degree || []);
            setSecondDegree(res.data.data.second_degree || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEdge = async (targetId: string) => {
        if (!selectedUser) return;
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.post(`${API}/api/edges`, { source: selectedUser.id, target: targetId });
            await loadFriends(selectedUser.id);
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('建边失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    const handleRemoveEdge = async (targetId: string) => {
        if (!selectedUser) return;
        if (!confirm(`确认断开 ${selectedUser.label} 与此用户的关系？`)) return;
        setActionLoading(p => ({ ...p, [targetId]: true }));
        try {
            await axios.delete(`${API}/api/edges`, { data: { source: selectedUser.id, target: targetId } });
            await loadFriends(selectedUser.id);
            window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));
        } catch (e: any) {
            alert('断边失败: ' + (e.response?.data?.message || e.message));
        } finally {
            setActionLoading(p => ({ ...p, [targetId]: false }));
        }
    };

    const FriendCard = ({ user, kind }: { user: any; kind: 'first' | 'second' }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border-light hover:border-primary/30 transition-all hover:shadow-sm group">
            <div className="size-10 rounded-full bg-cover bg-center border border-border-light flex-shrink-0 shadow-sm" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}')` }}></div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-800 truncate">{user.label}</h4>
                    <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">度:{user.degree}</span>
                </div>
                <p className="text-[10px] text-text-secondary font-mono truncate">{user.id}</p>
                {kind === 'second' && user.mutualFriends > 0 && (
                    <p className="text-[10px] text-primary font-medium mt-0.5">共同好友 {user.mutualFriends} 人</p>
                )}
            </div>
            <button
                onClick={() => kind === 'first' ? handleRemoveEdge(user.id) : handleAddEdge(user.id)}
                disabled={actionLoading[user.id]}
                className={`shrink-0 size-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${kind === 'first'
                        ? 'text-danger bg-danger/5 hover:bg-danger/10'
                        : 'text-primary bg-primary/5 hover:bg-primary/10'
                    }`}
                title={kind === 'first' ? '断开关系' : '建立连接'}
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
        <div className="flex-1 overflow-y-auto p-6 bg-background-light">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]">hub</span>
                        关系探索器
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">选择一个用户，可视化其一度好友与二度人脉，并实时管理关系连线。</p>
                </div>

                {/* Search */}
                <div className="bg-white border border-border-light rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6 relative" ref={ref}>
                    <div className={`flex items-center border rounded-xl bg-stone-50 transition-all ${showDropdown && searchResults.length > 0 ? 'border-primary ring-2 ring-primary/10 rounded-b-none' : 'border-border-light'}`}>
                        <span className="material-symbols-outlined text-text-secondary ml-3">person_search</span>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => searchTerm && setShowDropdown(true)}
                            placeholder="搜索某个用户以展开其关系网络..." className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-medium" />
                    </div>
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute left-5 right-5 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg max-h-[240px] overflow-y-auto z-50 divide-y divide-border-light">
                            {searchResults.map((r, i) => (
                                <div key={i} onClick={() => selectUser(r)} className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center gap-3 transition-colors">
                                    <div className="size-7 rounded-full bg-cover bg-center border border-border-light" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${r.id}')` }}></div>
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
                                <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${selectedUser.id}')` }}></div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-stone-800">{selectedUser.label}</h2>
                                <p className="text-xs text-text-secondary font-mono mt-0.5">uid: {selectedUser.id}</p>
                            </div>
                            <div className="ml-auto flex gap-3">
                                <div className="text-center px-4 py-2 bg-stone-50 rounded-lg border border-border-light">
                                    <p className="text-lg font-bold text-primary">{firstDegree.length}</p>
                                    <p className="text-[10px] text-text-secondary font-medium">一度好友</p>
                                </div>
                                <div className="text-center px-4 py-2 bg-stone-50 rounded-lg border border-border-light">
                                    <p className="text-lg font-bold text-stone-600">{secondDegree.length}</p>
                                    <p className="text-[10px] text-text-secondary font-medium">二度人脉</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Friends Grid */}
                {selectedUser && !loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* First Degree */}
                        <div>
                            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-success text-[18px]">group</span>
                                一度好友 ({firstDegree.length})
                            </h3>
                            <div className="space-y-2">
                                {firstDegree.length > 0 ? firstDegree.map(f => <FriendCard key={f.id} user={f} kind="first" />) : (
                                    <div className="text-center py-8 text-stone-400">
                                        <span className="material-symbols-outlined text-3xl mb-2 block">person_off</span>
                                        <p className="text-sm">暂无直接好友</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Second Degree */}
                        <div>
                            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">diversity_3</span>
                                二度人脉 ({secondDegree.length})
                                <span className="text-[10px] font-normal text-text-secondary ml-1">点击 + 可建立直接连接</span>
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                                {secondDegree.length > 0 ? secondDegree.slice(0, 50).map(f => <FriendCard key={f.id} user={f} kind="second" />) : (
                                    <div className="text-center py-8 text-stone-400">
                                        <span className="material-symbols-outlined text-3xl mb-2 block">explore_off</span>
                                        <p className="text-sm">无可探索的二度人脉</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
                        <p className="text-sm text-text-secondary mt-3">正在遍历关系网络...</p>
                    </div>
                )}

                {!selectedUser && !loading && (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined text-6xl text-stone-200 mb-4 block">scatter_plot</span>
                        <h3 className="text-lg font-bold text-stone-400">等待选择目标用户</h3>
                        <p className="text-sm text-stone-400 mt-1">在上方搜索框中选择一个用户，即可展开其完整的关系网络拓扑</p>
                    </div>
                )}
            </div>
        </div>
    );
}
