import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserPanel({ currentUser }: { currentUser: any }) {
    const [recommends, setRecommends] = useState([]);
    const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});

    // 监听 currentUser 变动发生重新请求
    useEffect(() => {
        if (!currentUser) return;
        setRecommends([]); // 重装载动画
        axios.get(`http://localhost:8000/api/users/${currentUser.id}/recommend?top_k=6`)
            .then(res => setRecommends(res.data.data))
            .catch(err => console.error("推演推荐失败", err));
    }, [currentUser]);

    const handleAddFriend = async (targetId: string, name: string) => {
        setIsAdding(prev => ({ ...prev, [targetId]: true }));
        try {
            // 真实双写 API: 内存与 SQLite 双贯穿
            const res = await axios.post('http://localhost:8000/api/edges', {
                source: currentUser.id,
                target: targetId,
                weight: 1
            });

            if (res.data.code === 200) {
                // 1. 无刷新的唤醒全域重绘事件，G6 画布将执行力学重排
                window.dispatchEvent(new Event('SNA_REFRESH_GRAPH'));

                // 2. 将此目标的高光镜头切过去，让用户看到拉边的结果！
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('SNA_FOCUS_NODE', { detail: { id: targetId } }));
                }, 1000);
            } else {
                alert("连接建立遭遇阻碍: " + res.data.message);
            }
        } catch (error: any) {
            console.error("建边异常:", error);
            alert("请求异常: " + error.message);
        } finally {
            setIsAdding(prev => ({ ...prev, [targetId]: false }));
        }
    }

    if (!currentUser) {
        return (
            <div className="flex-[1.2] flex items-center justify-center bg-surface-light border border-dashed border-border-light rounded-xl shadow-inner text-stone-400 h-full min-w-[320px]">
                <div className="text-center px-6">
                    <span className="material-symbols-outlined text-[48px] opacity-20 mb-4 block">hub</span>
                    等待神经漫游...<br /><span className="text-xs">请在左侧点击任意节点，或使用顶边栏进行靶向定标</span>
                </div>
            </div>
        )
    }

    const interests = currentUser.properties?.interests || [];

    return (
        <div className="flex-[1.2] flex flex-col gap-4 min-w-[320px] max-w-sm shrink-0">
            {/* 顶窗：个人档案信息 */}
            <div className="bg-surface-light border border-border-light rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-5">
                    <div className="size-16 rounded-full border-2 border-primary p-0.5">
                        <div className="w-full h-full rounded-full bg-cover bg-center shadow-inner transition-all hover:scale-105" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser.id}')` }}></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-800">{currentUser.label}</h2>
                        <p className="text-xs text-text-secondary font-mono mt-1 bg-stone-100 inline-block px-1.5 py-0.5 rounded">uid: {currentUser.id}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">psychology</span>
                            深度语义提取集
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {interests.length > 0 ? interests.map((tag: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-sm bg-stone-50 hover:bg-stone-100 text-stone-600 text-[11px] border border-border-light cursor-default transition-colors">{tag}</span>
                            )) : (
                                <span className="text-xs text-stone-400 italic">缺失多维可解释性标签</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 推荐流面板 */}
            <div className="bg-surface-light border border-border-light rounded-xl p-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex-1 flex flex-col overflow-hidden relative">
                <div className="p-4 border-b border-border-light bg-stone-50/50 flex justify-between items-center shrink-0">
                    <h3 className="text-stone-800 font-bold text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-warning text-[20px] animate-pulse">model_training</span>
                        二度人脉关联模型发现
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {recommends.map((rec: any, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-stone-50 border border-border-light hover:border-primary/30 transition-all group shadow-sm hover:shadow">
                            <div className="size-10 rounded-full bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${rec.uid}')` }}></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-sm font-bold text-stone-800 truncate">{rec.name}</h4>
                                    <span className={`text-[10px] font-mono px-1.5 rounded ${rec.match_rate >= 80 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                        {rec.match_rate.toFixed(1)}% 拟合
                                    </span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-1 overflow-hidden">
                                    <div className={`${rec.match_rate >= 80 ? 'bg-success' : 'bg-primary'} h-full transition-all duration-1000 ease-out`} style={{ width: `${rec.match_rate}%` }}></div>
                                </div>
                                <div className="text-[10px] text-text-secondary mt-1.5 truncate" title={rec.reason}>{rec.reason}</div>
                            </div>
                            <button
                                onClick={() => handleAddFriend(rec.uid, rec.name)}
                                disabled={isAdding[rec.uid]}
                                className="shrink-0 size-8 flex items-center justify-center text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                title="物理桥接: 建立边缘关联"
                            >
                                {isAdding[rec.uid] ? (
                                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">add_link</span>
                                )}
                            </button>
                        </div>
                    ))}
                    {recommends.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <span className="material-symbols-outlined text-4xl text-stone-200 mb-2 animate-bounce">radar</span>
                            <p className="text-xs text-stone-400">正在进行 Jaccard 分型演算预测...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
