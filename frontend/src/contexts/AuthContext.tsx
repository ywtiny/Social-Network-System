import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

interface User {
    id: number;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null, token: null, isAuthenticated: false, loading: true,
    login: async () => { }, register: async () => { }, logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sf_token'));
    const [loading, setLoading] = useState(true);

    // 设置 axios 默认 Authorization 头
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // 启动时校验 Token
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        axios.get(`${API}/api/auth/me`)
            .then(res => setUser(res.data.data))
            .catch(() => { localStorage.removeItem('sf_token'); setToken(null); })
            .finally(() => setLoading(false));
    }, []);

    // 全局 401 拦截 → 自动登出
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            res => res,
            err => {
                if (err.response?.status === 401 && token) {
                    localStorage.removeItem('sf_token');
                    setToken(null);
                    setUser(null);
                }
                return Promise.reject(err);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [token]);

    const login = useCallback(async (username: string, password: string) => {
        const res = await axios.post(`${API}/api/auth/login`, { username, password });
        const { token: t, user: u } = res.data.data;
        localStorage.setItem('sf_token', t);
        setToken(t);
        setUser(u);
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        await axios.post(`${API}/api/auth/register`, { username, password });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('sf_token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
