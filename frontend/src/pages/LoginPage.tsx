import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const { login, register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

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
        <div className="h-screen w-full overflow-hidden flex font-[Inter,sans-serif] antialiased bg-[#f4f5f7]">
            {/* ====== Left Brand Panel ====== */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-white border-r border-gray-200">
                {/* Topology Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-[0.15]" style={{
                        backgroundImage: 'radial-gradient(#8f855d 1px, transparent 1px)',
                        backgroundSize: '30px 30px'
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="relative w-[600px] h-[600px]" style={{ animation: 'float 6s ease-in-out infinite' }}>
                            {/* Network Nodes */}
                            {[
                                { size: 16, left: '50%', top: '50%', translate: true },
                                { size: 12, left: '25%', top: '33%' },
                                { size: 12, right: '25%', top: '25%' },
                                { size: 8, left: '33%', bottom: '25%' },
                                { size: 8, right: '33%', bottom: '33%' },
                                { size: 12, left: '10%', top: '50%' },
                                { size: 8, right: '10%', top: '60%' },
                            ].map((n, i) => (
                                <div key={i} className="absolute rounded-full bg-[#8f855d] shadow-[0_0_10px_rgba(143,133,93,0.4)]"
                                    style={{
                                        width: n.size, height: n.size,
                                        left: n.left, right: (n as any).right,
                                        top: n.top, bottom: (n as any).bottom,
                                        transform: n.translate ? 'translate(-50%,-50%)' : undefined,
                                    }} />
                            ))}
                            {/* Network Lines */}
                            <div className="absolute top-1/2 left-1/4 w-1/4 h-[1px] bg-[#8f855d]/20 rotate-12" />
                            <div className="absolute top-1/4 right-1/4 w-1/4 h-[1px] bg-[#8f855d]/20 rotate-45" style={{ transformOrigin: 'left center' }} />
                            <div className="absolute bottom-1/4 left-1/3 w-1/3 h-[1px] bg-[#8f855d]/20 -rotate-45" />
                            <div className="absolute bottom-1/3 right-1/3 w-1/4 h-[1px] bg-[#8f855d]/20 rotate-[120deg]" />
                            <div className="absolute top-1/2 left-[10%] w-[40%] h-[1px] bg-[#8f855d]/10" />
                        </div>
                    </div>
                </div>

                {/* Brand */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-[#8f855d] text-white p-2 rounded-lg shadow-md">
                            <span className="material-symbols-outlined text-2xl">hub</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-gray-900">ServiceGraph</span>
                    </div>
                    <p className="text-gray-500 mt-4 max-w-md text-lg leading-relaxed">
                        实时可视化微服务拓扑架构。追踪调用链路、检测异常节点、分析爆炸半径，让您的分布式系统尽在掌控。
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10 mt-auto">
                    <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gradient-to-br from-[#8f855d] to-[#b8ad82] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-sm">person</span>
                                </div>
                            ))}
                        </div>
                        <span>已服务 500+ 工程团队</span>
                    </div>
                </div>
            </div>

            {/* ====== Right Login Panel ====== */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-[#f4f5f7] relative">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className="bg-[#8f855d] text-white p-1.5 rounded shadow-sm">
                                <span className="material-symbols-outlined text-xl">hub</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900">ServiceGraph</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {mode === 'login' ? '欢迎回来' : '创建账号'}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {mode === 'login' ? '登录以访问微服务拓扑监控面板' : '注册一个新的观测账号'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">用户名</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <span className="material-symbols-outlined text-lg">person_outline</span>
                                </div>
                                <input id="username" type="text" value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8f855d] focus:border-[#8f855d] text-sm transition-shadow shadow-sm"
                                    placeholder="请输入用户名" autoComplete="username" autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700" htmlFor="password">密码</label>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <span className="material-symbols-outlined text-lg">lock_outline</span>
                                </div>
                                <input id="password" type="password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8f855d] focus:border-[#8f855d] text-sm transition-shadow shadow-sm"
                                    placeholder="••••••••"
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>
                        </div>

                        {/* Confirm Password (Register) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-lg">lock_outline</span>
                                    </div>
                                    <input type="password" value={confirmPwd}
                                        onChange={e => setConfirmPwd(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8f855d] focus:border-[#8f855d] text-sm transition-shadow shadow-sm"
                                        placeholder="请再次输入密码" autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error / Success */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                                <span className="material-symbols-outlined text-[16px]">error</span>{error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>{success}
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-[#8f855d] hover:bg-[#7a714f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8f855d] transition-all active:scale-[0.98] disabled:opacity-50">
                            {loading && <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>}
                            {mode === 'login' ? '登录系统' : '注册账号'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    {mode === 'login' ? '或者' : '已有账号？'}
                                </span>
                            </div>
                        </div>

                        {/* Toggle Mode */}
                        <div className="mt-4">
                            <button type="button"
                                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-200 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                {mode === 'login' ? '注册新账号' : '返回登录'}
                            </button>
                        </div>
                    </div>

                    {/* Default Credentials Hint */}
                    {mode === 'login' && (
                        <p className="mt-6 text-center text-xs text-gray-400">
                            默认管理员：<span className="font-mono text-gray-500">admin</span> / <span className="font-mono text-gray-500">admin123</span>
                        </p>
                    )}
                </div>

                {/* Copyright */}
                <div className="absolute bottom-6 w-full text-center">
                    <p className="text-xs text-gray-400/60">© 2024 ServiceGraph Inc. All rights reserved.</p>
                </div>
            </div>

            {/* Float Animation Keyframes */}
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>
        </div>
    );
}
