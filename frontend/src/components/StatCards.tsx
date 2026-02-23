import React from 'react';

export default function StatCards({ data }: { data: any }) {
    if (!data) return <div className="animate-pulse h-24 bg-stone-100 rounded-xl mb-6"></div>;

    // 对齐最新后端数据结构: 
    // { "total_users": 65, "total_edges": 142, "isolated_nodes": 3, "network_density": 0.06 }
    const cards = [
        {
            title: "全库实体规模",
            value: (data.total_users || 0).toLocaleString(),
            trend: "+新增捕获",
            icon: "groups",
            colorClass: "text-success bg-success/10",
            iconBg: "bg-primary/10 text-primary group-hover:bg-primary",
            trendIcon: "arrow_upward"
        },
        {
            title: "拓扑二度连边",
            value: (data.total_edges || 0).toLocaleString(),
            trend: "持续蔓延",
            icon: "share",
            colorClass: "text-success bg-success/10",
            iconBg: "bg-purple-600/10 text-purple-700 group-hover:bg-purple-600",
            trendIcon: "arrow_upward"
        },
        {
            title: "微观网络密度",
            value: data.network_density ? (data.network_density * 100).toFixed(2) + '%' : "0%",
            trend: "聚集因子",
            icon: "bubble_chart",
            colorClass: "text-text-secondary bg-stone-100",
            iconBg: "bg-sky-600/10 text-sky-700 group-hover:bg-sky-600",
            trendIcon: ""
        },
        {
            title: "孤城节点判定",
            value: (data.isolated_nodes || 0).toLocaleString(),
            trend: "异常离散",
            icon: "person_off",
            colorClass: "text-danger bg-danger/10",
            iconBg: "bg-orange-600/10 text-orange-700 group-hover:bg-orange-600",
            trendIcon: "warning"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-surface-light border border-border-light rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg transition-colors group-hover:text-white ${card.iconBg}`}>
                            <span className="material-symbols-outlined">{card.icon}</span>
                        </div>
                        <span className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${card.colorClass}`}>
                            {card.trend}
                            {card.trendIcon && <span className="material-symbols-outlined text-[14px] ml-0.5">{card.trendIcon}</span>}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-text-secondary text-sm font-medium">{card.title}</span>
                        <span className="text-2xl font-bold text-stone-800 mt-1">{card.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
