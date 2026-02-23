import { useRef, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PathFinder from './pages/PathFinder';
import RelationExplorer from './pages/RelationExplorer';
import LoginPage from './pages/LoginPage';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(256);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(400, Math.max(160, startW.current + ev.clientX - startX.current));
      setSidebarWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light">
        <span className="material-symbols-outlined text-4xl text-stone-300 animate-spin">sync</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full font-sans bg-background-light text-stone-900">
      <Sidebar width={sidebarWidth} />
      <div
        onMouseDown={onMouseDown}
        className="w-1 shrink-0 cursor-col-resize bg-border-light hover:bg-primary/40 transition-colors active:bg-primary"
        title="拖拽调整侧栏宽度"
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopNav />
        <div className="flex-1 h-full overflow-y-auto relative scroll-smooth custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/topology" element={<Dashboard />} />
            <Route path="/services" element={<UserManagement />} />
            <Route path="/path" element={<PathFinder />} />
            <Route path="/relations" element={<RelationExplorer />} />
            <Route path="*" element={<div className="p-8 text-stone-500">404 — 未注册的服务路由</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
