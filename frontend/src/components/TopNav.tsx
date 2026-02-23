import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TopNav() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setIsSearching(true);
            axios.get(`http://localhost:8000/api/services?q=${encodeURIComponent(searchTerm)}&limit=8`)
                .then(res => {
                    setResults(res.data.data.items || []);
                    setShowDropdown(true);
                })
                .catch(err => console.error("Search API Error", err))
                .finally(() => setIsSearching(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSelectResult = (uid: string) => {
        setSearchTerm('');
        setShowDropdown(false);
        // 如果不在主页，先跳过去，给渲染留点空隙
        if (window.location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('SNA_FOCUS_NODE', { detail: { id: uid } }));
            }, 500);
        } else {
            // 否则瞬间抛出自定义神级锁定事件，图谱将被此事件惊动
            window.dispatchEvent(new CustomEvent('SNA_FOCUS_NODE', { detail: { id: uid } }));
        }
    };

    return (
        <header className="h-[72px] shrink-0 border-b border-border-light bg-surface-light px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300">
            {/* Global Search Core */}
            <div className="flex-1 max-w-xl relative group" ref={ref}>
                <div className={`relative flex items-center w-full bg-stone-50 border transition-all duration-200 ${showDropdown ? 'border-primary shadow-md ring-2 ring-primary/10 rounded-t-xl' : 'border-border-light rounded-xl hover:border-stone-300 hover:bg-white'}`}>
                    <span className={`material-symbols-outlined absolute left-3.5 ${isSearching ? 'animate-spin text-primary' : 'text-text-secondary pointer-events-none'}`}>
                        {isSearching ? 'sync' : 'search'}
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm && setShowDropdown(true)}
                        placeholder="搜索服务节点... (输入服务 ID 或名称定位拓扑位置)"
                        className="w-full bg-transparent pl-11 pr-4 py-2.5 text-sm text-stone-800 focus:outline-none placeholder-stone-400 font-medium tracking-wide"
                    />
                    <div className="absolute right-3 hidden sm:flex items-center gap-1 opacity-50 pointer-events-none">
                        <kbd className="px-1.5 py-0.5 rounded border border-stone-300 bg-white shadow-sm text-[10px] font-sans text-stone-500 font-bold">Ctrl</kbd>
                        <kbd className="px-1.5 py-0.5 rounded border border-stone-300 bg-white shadow-sm text-[10px] font-sans text-stone-500 font-bold">K</kbd>
                    </div>
                </div>

                {/* Dropdown Result Panel */}
                {showDropdown && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-x border-b border-border-light rounded-b-xl shadow-lg mt-[1px] max-h-[300px] overflow-y-auto animate-in slide-in-from-top-2 z-50 divide-y divide-border-light text-sm">
                        <div className="px-4 py-2 text-xs font-bold text-text-secondary bg-stone-50/80">服务检索结果 ({results.length})</div>
                        {results.map((r, i) => (
                            <div key={i} onClick={() => handleSelectResult(r.id)} className="px-4 py-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-stone-100 flex items-center justify-center border border-border-light">
                                        <span className="material-symbols-outlined text-[16px] text-stone-400">dns</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-800">{r.label}</p>
                                        <p className="text-[10px] text-text-secondary font-mono">#{r.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">调用度: {r.degree}</span>
                                    <span className="material-symbols-outlined text-[16px] text-stone-300 group-hover:text-primary transition-colors">rocket_launch</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 ml-6">
                {user && (
                    <>
                        <div className="flex items-center gap-2 bg-white border border-border-light px-3 py-1.5 rounded-lg shadow-sm">
                            <span className="material-symbols-outlined text-[18px] text-stone-400">account_circle</span>
                            <span className="text-sm font-bold text-stone-700">{user.username}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-500'}`}>
                                {user.role === 'admin' ? '管理员' : '观察者'}
                            </span>
                        </div>
                        <button onClick={logout} className="p-2 text-stone-400 hover:text-danger hover:bg-red-50 rounded-lg transition-all" title="登出">
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
