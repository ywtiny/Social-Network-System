import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PathFinder from './pages/PathFinder';
import RelationExplorer from './pages/RelationExplorer';

function App() {
  return (
    <div className="flex h-screen w-full font-sans bg-background-light text-stone-900">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopNav />
        <div className="flex-1 h-full overflow-y-auto relative scroll-smooth custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/topology" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/path" element={<PathFinder />} />
            <Route path="/relations" element={<RelationExplorer />} />
            <Route path="*" element={<div className="p-8 text-stone-500">404 - 未接入的模块区域</div>} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App;
