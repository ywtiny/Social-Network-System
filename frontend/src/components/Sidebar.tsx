import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
    return (
        <aside className="w-64 flex-shrink-0 bg-surface-light border-r border-border-light h-full flex flex-col shadow-[2px_0_8px_rgba(0,0,0,0.02)] transition-all duration-300">
            {/* Logo */}
            <div className="h-[72px] px-6 flex items-center gap-3 border-b border-border-light sticky top-0 bg-surface-light z-10">
                <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 rotate-12 transition-transform hover:rotate-0 duration-300">
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-stone-800 to-stone-500 bg-clip-text text-transparent">SNA 系统</h1>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto pt-6 px-4 space-y-6 custom-scrollbar pb-8">
                <div>
                    <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest px-3 mb-3">数据总览</h2>
                    <ul className="space-y-1">
                        <li>
                            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                                <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                                数据概览
                            </NavLink>
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest px-3 mb-3">分析工具</h2>
                    <ul className="space-y-1">
                        <li>
                            <NavLink to="/path" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                                <span className="material-symbols-outlined text-[20px]">route</span>
                                路径分析
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/relations" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                                <span className="material-symbols-outlined text-[20px]">hub</span>
                                关系探索
                            </NavLink>
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest px-3 mb-3">系统管理</h2>
                    <ul className="space-y-1">
                        <li>
                            <NavLink to="/users" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                                <span className="material-symbols-outlined text-[20px]">group</span>
                                实体管理
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </nav>

            {/* Admin Profile */}
            <div className="p-4 border-t border-border-light bg-stone-50/50 mt-auto">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-border-light hover:shadow-sm">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin" alt="Admin" className="size-10 rounded-full border border-stone-200 bg-white" />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-stone-800 truncate">Administrator</h3>
                        <p className="text-xs text-text-secondary truncate mt-0.5 font-mono">admin@sna.local</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
