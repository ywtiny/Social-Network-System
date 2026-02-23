import React, { useEffect, useState, Component } from 'react';
import axios from 'axios';
import StatCards from '../components/StatCards';
import UserPanel from '../components/UserPanel';

class GraphErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: '' };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message };
    }
    componentDidCatch(error: Error, info: any) {
        console.error("G6 Graph crashed:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-[3] bg-red-50 border border-red-200 rounded-xl flex items-center justify-center p-8">
                    <div className="text-center">
                        <p className="text-red-600 font-bold text-lg mb-2">图谱引擎加载异常</p>
                        <p className="text-red-400 text-sm">{this.state.error}</p>
                        <button onClick={() => this.setState({ hasError: false, error: '' })} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">重试</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const NetworkGraph = React.lazy(() => import('../components/NetworkGraph'));

export default function Dashboard() {
    const [systemOverview, setSystemOverview] = useState<any>(null);

    const [selectedUser, setSelectedUser] = useState<any>({
        id: "node_1",
        label: "张三",
        properties: { interests: ["编程", "架构"] }
    });

    useEffect(() => {
        axios.get('http://localhost:8000/api/system/overview')
            .then(res => setSystemOverview(res.data.data))
            .catch(err => console.error("API获取失败", err));
    }, []);

    return (
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background-light">
            <StatCards data={systemOverview} />
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                <GraphErrorBoundary>
                    <React.Suspense fallback={
                        <div className="flex-[3] bg-surface-light border border-border-light rounded-xl flex items-center justify-center">
                            <span className="text-primary font-bold animate-pulse">正在加载图谱渲染引擎...</span>
                        </div>
                    }>
                        <NetworkGraph
                            selectedUserId={selectedUser?.id}
                            onNodeSelect={(userObj) => setSelectedUser(userObj)}
                        />
                    </React.Suspense>
                </GraphErrorBoundary>
                <UserPanel currentUser={selectedUser} />
            </div>
        </div>
    );
}
