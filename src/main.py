import tkinter as tk
from tkinter import messagebox
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.hash_table import HashTable
from data_structure.adjacency_list import Graph
from utils.data_reader import load_all_data
import algorithm.algorithms as algo

import networkx as nx
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
from matplotlib import rcParams

# 强行支持中文字体，防止图形节点乱码
rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
rcParams['axes.unicode_minus'] = False


class App:
    def __init__(self, root):
        self.r = root
        self.r.title("社交网络分析系统")
        self.r.geometry("900x650")

        self.graph = Graph()
        self.hash_table = HashTable()

        # ---------- 数据加载 ----------
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            u_path = os.path.join(base_dir, "data", "user_sample.csv")
            f_path = os.path.join(base_dir, "data", "friend_sample.txt")
            load_all_data(u_path, f_path, self.hash_table, self.graph)
            init_msg = f"数据加载成功！\n已加载 {len(self.hash_table.get_all_keys())} 名用户信息。\n已加载图谱关系边数据。\n"
            status_text = "数据加载成功！"
        except Exception as e:
            messagebox.showwarning("警告", f"初始数据加载失败:\n{e}")
            init_msg = "数据加载失败，请检查文件路径。\n"
            status_text = "加载失败"

        # ---------- 顶部操作面板 ----------
        top_frame = tk.Frame(self.r)
        top_frame.pack(fill=tk.X, padx=10, pady=10)

        # 标题
        tk.Label(
            top_frame, text="社交网络分析系统", font=("Microsoft YaHei", 16, "bold")
        ).pack(pady=(0, 15))

        # ID 输入与选择联动区
        input_frame = tk.Frame(top_frame)
        input_frame.pack(fill=tk.X)

        tk.Label(input_frame, text="当前用户ID:").pack(side=tk.LEFT, padx=(0, 5))
        self.entry_u1 = tk.Entry(input_frame, width=20)
        self.entry_u1.pack(side=tk.LEFT, padx=5)
        # 默认填入1作为实例
        self.entry_u1.insert(0, "1")

        # 占位推到右侧
        tk.Frame(input_frame).pack(side=tk.LEFT, fill=tk.X, expand=True)

        tk.Label(input_frame, text="或选择用户:").pack(side=tk.LEFT, padx=5)
        
        # 组装下拉框数据
        self.user_var = tk.StringVar()
        user_list = []
        for uid in sorted(self.hash_table.get_all_keys(), key=lambda x: int(x)):
            uinfo = self.hash_table.get(uid)
            user_list.append(f"{uid} - {uinfo['name']}")
            
        from tkinter import ttk
        self.combo_user = ttk.Combobox(input_frame, textvariable=self.user_var, values=user_list, width=25)
        self.combo_user.pack(side=tk.LEFT, padx=5)
        self.combo_user.bind("<<ComboboxSelected>>", self.on_combo_select)

        # 按钮矩阵区
        btn_frame = tk.Frame(top_frame)
        btn_frame.pack(fill=tk.X, pady=15)

        ttk.Button(btn_frame, text="查询直接好友", command=self.do_1st).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(btn_frame, text="查找二度人脉", command=self.do_2nd).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(btn_frame, text="计算社交距离", command=self.do_dist).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(btn_frame, text="智能推荐(Top-5)", command=self.do_rec).pack(
            side=tk.LEFT, padx=5
        )
        ttk.Button(btn_frame, text="清空结果", command=self.clear_output).pack(
            side=tk.LEFT, padx=5
        )

        # ---------- 中间笔记本选项卡 ----------
        self.notebook = ttk.Notebook(self.r)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # Tab 1: 分析结果
        self.tab_result = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_result, text="分析结果")
        self.txt = tk.Text(self.tab_result, font=("Consolas", 10), wrap=tk.WORD)
        self.txt.pack(fill=tk.BOTH, expand=True, padx=2, pady=2)
        
        # 滚动条绑定
        scrollbar = ttk.Scrollbar(self.tab_result, command=self.txt.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt.config(yscrollcommand=scrollbar.set)
        
        self.txt.insert(tk.END, init_msg)

        # Tab 2: 统计信息
        self.tab_stats = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_stats, text="统计信息")
        
        # 统计面板UI布局
        stats_padding = tk.Frame(self.tab_stats, padx=20, pady=20)
        stats_padding.pack(fill=tk.BOTH, expand=True)
        
        # 网络概览框
        overview_elf = tk.LabelFrame(stats_padding, text="网络概览", font=("Microsoft YaHei", 10, "bold"), padx=10, pady=10)
        overview_elf.pack(fill=tk.X, pady=(0, 20))
        tk.Label(overview_elf, text=f"用户总数: {len(self.hash_table.get_all_keys())}", font=("Microsoft YaHei", 10)).pack(anchor=tk.W, pady=2)
        tk.Label(overview_elf, text="关系总数: (自动聚合)", font=("Microsoft YaHei", 10)).pack(anchor=tk.W, pady=2)
        
        # 当前用户信息框
        self.user_stats_lf = tk.LabelFrame(stats_padding, text="当前用户信息", font=("Microsoft YaHei", 10, "bold"), padx=10, pady=10)
        self.user_stats_lf.pack(fill=tk.X)
        self.lbl_s_uid = tk.Label(self.user_stats_lf, text="用户ID:   暂无", font=("Microsoft YaHei", 10))
        self.lbl_s_uid.pack(anchor=tk.W, pady=2)
        self.lbl_s_name = tk.Label(self.user_stats_lf, text="姓名:     暂无", font=("Microsoft YaHei", 10))
        self.lbl_s_name.pack(anchor=tk.W, pady=2)
        self.lbl_s_int = tk.Label(self.user_stats_lf, text="兴趣:     暂无", font=("Microsoft YaHei", 10))
        self.lbl_s_int.pack(anchor=tk.W, pady=2)
        self.lbl_s_fri = tk.Label(self.user_stats_lf, text="直接好友数: 暂无", font=("Microsoft YaHei", 10))
        self.lbl_s_fri.pack(anchor=tk.W, pady=2)

        # Tab 3: 网络图谱
        self.tab_graph = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_graph, text="网络图谱")
        
        # 内置 Matplotlib 图像画布容器
        self.fig, self.ax = plt.subplots(figsize=(6, 5))
        self.fig.patch.set_facecolor('#f0f0f0') # 匹配背景色
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.tab_graph)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

        # ---------- 底部状态栏 ----------
        self.status_var = tk.StringVar()
        self.status_var.set(status_text)
        status_bar = tk.Label(
            self.r,
            textvariable=self.status_var,
            bd=1,
            relief=tk.SUNKEN,
            anchor=tk.W,
            padx=5,
        )
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # 初始化统计板及全量图谱绘制
        self.update_stats_panel("1")
        self.r.after(100, self.draw_graph) # 延迟绘制防止阻塞GUI初始化

    def draw_graph(self):
        """利用 NetworkX 提取自定义邻接图结构并渲染"""
        self.ax.clear()
        
        G = nx.Graph()
        
        valid_users = set(self.hash_table.get_all_keys())
        
        # 添加节点: 仅针对资料库存在的合法用户
        for uid in valid_users:
            u_info = self.hash_table.get(uid)
            G.add_node(uid, label=u_info['name'])
            
        # 添加边: 阻拦指向或来自「幽灵数据」的连线
        for u in self.graph.get_all_nodes():
            if u not in valid_users:
                continue
            for v in self.graph.get_neighbors(u):
                # 只有双方都是合法认证实体且边不存在时，渲染关系
                if v in valid_users and not G.has_edge(u, v):
                    G.add_edge(u, v)

        # 获取节点标签
        labels = nx.get_node_attributes(G, 'label')
        
        # 生成基于力导向布局的美观分布
        pos = nx.spring_layout(G, seed=42)
        
        # 绘制图架构
        nx.draw_networkx_nodes(G, pos, ax=self.ax, node_color='lightblue', edgecolors='gray', node_size=800, alpha=0.9)
        nx.draw_networkx_edges(G, pos, ax=self.ax, edge_color='#CCCCCC', width=1.5)
        nx.draw_networkx_labels(G, pos, labels, ax=self.ax, font_size=9, font_family='Microsoft YaHei')
        
        self.ax.set_axis_off()
        self.canvas.draw()

    def on_combo_select(self, event):
        # 处理下拉框被选中联动同步到ID框
        val = self.combo_user.get()
        if val:
            uid = val.split(" - ")[0]
            self.entry_u1.delete(0, tk.END)
            self.entry_u1.insert(0, uid)
            self.update_stats_panel(uid)

    def update_stats_panel(self, uid):
        # 刷新统计面板里的用户信息呈现
        u_info = self.hash_table.get(uid)
        if u_info:
            self.lbl_s_uid.config(text=f"用户ID:   {uid}")
            self.lbl_s_name.config(text=f"姓名:     {u_info['name']}")
            ints = u_info["interests"].replace(";", ", ")
            self.lbl_s_int.config(text=f"兴趣:     {ints}")
            friends = algo.get_first_degree(self.graph, uid)
            self.lbl_s_fri.config(text=f"直接好友数: {len(friends)}")

    def _validate_input(self, val):
        if not val or not self.hash_table.get(val):
            messagebox.showerror("错误", "非法的ID或者ID不在库内。")
            return False
        return True

    def out(self, text, clear=False):
        if clear:
            self.txt.delete("1.0", tk.END)
        self.txt.insert(tk.END, f"{text}\n")
        self.txt.see(tk.END)
        
    def clear_output(self):
        self.txt.delete("1.0", tk.END)
        self.status_var.set("已清空结果")

    def do_1st(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.get_first_degree(self.graph, uid)
            u_name = self.hash_table.get(uid)['name']
            
            self.out(f"=== 用户 {uid} ({u_name}) 的直接好友 ===", clear=True)
            self.out("")
            
            for fid in res:
                f_info = self.hash_table.get(fid)
                f_name = f_info['name']
                f_ints = f_info['interests'].replace(";", ", ")
                # 计算简单亲密度 (这里为了匹配格式做个加权模拟展示)
                sim = int(algo.get_interest_similarity(self.hash_table.get(uid)['interests'], f_info['interests']) * 10) + 1
                self.out(f"ID: {fid:>3} | 姓名: {f_name:<4} | 亲密度: {sim} | 兴趣: {f_ints}")
                
            self.out(f"\n共 {len(res)} 位直接好友。")
            self.status_var.set("查询完成: 直接好友")
            self.update_stats_panel(uid)

    def do_2nd(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.get_second_degree(self.graph, uid)
            u_name = self.hash_table.get(uid)['name']
            u_ints_set = set(self.hash_table.get(uid)['interests'].split(";"))
            
            self.out(f"=== 用户 {uid} ({u_name}) 的可能认识的人 (二度人脉) ===", clear=True)
            self.out("")
            
            for fid in res:
                f_info = self.hash_table.get(fid)
                f_name = f_info['name']
                f_ints = f_info['interests'].replace(";", ", ")
                f_ints_set = set(f_info['interests'].split(";"))
                common_ints = len(u_ints_set.intersection(f_ints_set))
                
                self.out(f"ID: {fid:>3} | 姓名: {f_name:<4} | 社交距离: 2度 | 共同兴趣: {common_ints} | 兴趣: {f_ints}")
                
            self.out(f"\n共 {len(res)} 位二度人脉。")
            self.status_var.set("查询完成: 二度人脉")
            self.update_stats_panel(uid)

    def do_rec(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.recommend_top_k(self.graph, self.hash_table, uid, 5) # 匹配图片标注的 Top-5
            u_name = self.hash_table.get(uid)['name']
            u_ints_set = set(self.hash_table.get(uid)['interests'].split(";"))
            
            self.out(f"=== 为 用户 {uid} ({u_name}) 生成的智能推荐 (Top-5) ===", clear=True)
            self.out("")
            
            idx = 1
            for score, target_uid, target_name in res:
                f_info = self.hash_table.get(target_uid)
                f_ints = f_info['interests'].replace(";", ", ")
                f_ints_set = set(f_info['interests'].split(";"))
                common_ints = len(u_ints_set.intersection(f_ints_set))
                dist, _ = algo.shortest_distance(self.graph, uid, target_uid)
                dist_str = f"{dist}度" if dist != -1 else "无关联"
                
                self.out(f"推荐 {idx}: ID: {target_uid:>3} | 姓名: {target_name:<4} | 社交距离: {dist_str} | 共同兴趣: {common_ints} | 兴趣: {f_ints}")
                idx += 1
                
            self.out(f"\n共生成 {len(res)} 条推荐。")
            self.status_var.set("推荐完成: 智能推荐")
            self.update_stats_panel(uid)

    def do_dist(self):
        u1 = self.entry_u1.get()
        if self._validate_input(u1):
            import tkinter.simpledialog as sd
            u2 = sd.askstring("计算社交距离", "请输入目标用户ID:")
            if u2 and self._validate_input(u2):
                dist, path = algo.shortest_distance(self.graph, u1, u2)
                self.out(f"=== 社交距离计算 ===", clear=True)
                self.out(f"起点用户: {u1} ({self.hash_table.get(u1)['name']})")
                self.out(f"终点用户: {u2} ({self.hash_table.get(u2)['name']})\n")
                
                if dist == -1:
                    self.out(f"结果: 两人之间没有任何图结构连通！[无社交关联]")
                else:
                    self.out(f"最短社交距离: {dist}")
                    path_names = [f"[{pid} {self.hash_table.get(pid)['name']}]" for pid in path]
                    self.out(f"探测连通路径: {' -> '.join(path_names)}")
                self.status_var.set("计算完成: 社交距离")


if __name__ == "__main__":
    root = tk.Tk()
    # 为ttk应用一个好看的标准主题
    from tkinter import ttk
    style = ttk.Style()
    if "clam" in style.theme_names():
        style.theme_use("clam")
        
    app = App(root)
    root.mainloop()
