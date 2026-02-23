import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // 已登录状态访问 /login → 直接跳回主页
    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim() || !password.trim()) { setError('请输入用户名和密码'); return; }
        if (mode === 'register' && password !== confirmPwd) { setError('两次密码不一致'); return; }
        if (mode === 'register' && password.length < 6) { setError('密码至少 6 个字符'); return; }

        setLoading(true);
        try {
            if (mode === 'register') {
                await register(username, password);
                setSuccess('注册成功，请登录');
                setMode('login');
                setPassword('');
                setConfirmPwd('');
            } else {
                await login(username, password);
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* 背景网格装饰 */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }} />

            {/* 光晕 */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-violet-500/10 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/25 mb-5">
                        <span className="material-symbols-outlined text-white text-[32px]">hub</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">微服务拓扑监控</h1>
                    <p className="text-sm text-slate-400 mt-1.5">Microservice Topology Monitor</p>
                </div>

                {/* 登录卡片 */}
                <form onSubmit={handleSubmit} className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* 登录/注册 Tab */}
                    <div className="flex mb-7 bg-white/5 rounded-xl p-1 border border-white/5">
                        <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
                            登录
                        </button>
                        <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-violet-500/20 text-violet-400 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
                            注册
                        </button>
                    </div>

                    {/* 输入区域 */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">用户名</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">person</span>
                                <input
                                    type="text" value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    placeholder="请输入用户名" autoComplete="username" autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">密码</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">lock</span>
                                <input
                                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                    placeholder="请输入密码" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>
                        </div>
                        {mode === 'register' && (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">确认密码</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">lock</span>
                                    <input
                                        type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                                        placeholder="请再次输入密码" autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 错误 / 成功提示 */}
                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                            <span className="material-symbols-outlined text-[16px]">error</span>{error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>{success}
                        </div>
                    )}

                    {/* 提交按钮 */}
                    <button type="submit" disabled={loading}
                        className={`w-full mt-6 py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${mode === 'login'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25'
                            : 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-violet-500/25'
                            } disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]`}>
                        {loading && <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>}
                        {mode === 'login' ? '登录系统' : '注册账号'}
                    </button>

                    {/* 默认账号提示 */}
                    {mode === 'login' && (
                        <p className="mt-5 text-center text-[11px] text-slate-500">
                            默认管理员账号：<span className="text-slate-400 font-mono">admin</span> / <span className="text-slate-400 font-mono">admin123</span>
                        </p>
                    )}
                </form>

                <p className="text-center text-[10px] text-slate-600 mt-8">Microservice Topology Monitor · Powered by BFS Graph Engine</p>
            </div>
        </div>
    );
}
