import tkinter as tk
from tkinter import messagebox, ttk
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.hash_table import HashTable
from data_structure.adjacency_list import Graph
from utils.data_reader import load_all_data, save_all_data
import algorithm.algorithms as algo

import networkx as nx
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
from matplotlib import rcParams

# 强行支持中文字体，防止图形节点乱码
rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
rcParams['axes.unicode_minus'] = False


class FlowFrame(tk.Frame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.bind("<Configure>", self._on_configure)

    def _on_configure(self, event=None):
        if not self.winfo_children():
            return
        width = self.winfo_width()
        if width <= 1:
            return
            
        x = y = 0
        max_height = 0
        for child in self.winfo_children():
            reqwidth = child.winfo_reqwidth()
            reqheight = child.winfo_reqheight()
            
            if x + reqwidth > width and x > 0:
                x = 0
                y += max_height + 5
                max_height = 0
                
            child.place(x=x, y=y)
            x += reqwidth + 5
            max_height = max(max_height, reqheight)
        self.configure(height=y + max_height)


class InterestPanel(tk.Frame):
    def __init__(self, master, initial_interests=""):
        super().__init__(master, bg='#f0f0f0')
        self.tags = []
        
        input_f = tk.Frame(self, bg='#f0f0f0')
        input_f.pack(fill=tk.X)
        self.entry = tk.Entry(input_f, width=15)
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", lambda e: self.add_tag())
        
        btn = ttk.Button(input_f, text="添加", width=4, command=self.add_tag)
        btn.pack(side=tk.LEFT, padx=(5, 0))
        
        self.chips_frame = FlowFrame(self, bg='#f0f0f0')
        self.chips_frame.pack(fill=tk.BOTH, expand=True, pady=(5,0))
        
        for t in initial_interests.split(';'):
            if t.strip():
                self.add_tag(t.strip())
        
    def add_tag(self, val=None):
        if val is None:
            val = self.entry.get().strip()
        if val and val not in self.tags:
            self.tags.append(val)
            self.render_tags()
        self.entry.delete(0, tk.END)
        
    def remove_tag(self, tag):
        if tag in self.tags:
            self.tags.remove(tag)
            self.render_tags()
            
    def render_tags(self):
        for widget in self.chips_frame.winfo_children():
            widget.destroy()
        
        for tag in self.tags:
            chip = tk.Frame(self.chips_frame, bg='#e0f2fe', bd=1, relief=tk.SOLID)
            tk.Label(chip, text=tag, bg='#e0f2fe', font=("Microsoft YaHei", 9)).pack(side=tk.LEFT, padx=(2, 0))
            btn_x = tk.Label(chip, text=" ✕ ", fg="red", bg='#e0f2fe', font=("Microsoft YaHei", 9, "bold"), cursor="hand2")
            btn_x.pack(side=tk.LEFT)
            btn_x.bind("<Button-1>", lambda e, t=tag: self.remove_tag(t))
            
        # 强制更新并重新触发布局
        self.chips_frame.update_idletasks()
        self.chips_frame._on_configure()
        
    def get_interests_str(self):
        return ";".join(self.tags)


class App:
    def __init__(self, root):
        self.r = root
        self.r.title("社交网络分析系统")
        self.r.geometry("900x650")
        self.r.configure(bg='#f0f0f0')

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
        top_frame = tk.Frame(self.r, bg='#f0f0f0')
        top_frame.pack(fill=tk.X, padx=10, pady=10)

        # ---------- 顶部原生系统菜单栏 ----------
        menubar = tk.Menu(self.r)
        
        # 1. 字体大小子菜单 (+ / -) (取消分离虚线)
        font_menu = tk.Menu(menubar, tearoff=0)
        font_menu.add_command(label="放大 (+)", accelerator="Ctrl++", command=lambda: self.adjust_font_size(1))
        font_menu.add_command(label="缩小 (-)", accelerator="Ctrl+-", command=lambda: self.adjust_font_size(-1))
        
        # 绑定直接的连续快捷键监听应对高频微调
        self.r.bind("<Control-equal>", lambda event: self.adjust_font_size(1)) # 按键区域里的 + 通用
        self.r.bind("<Control-plus>", lambda event: self.adjust_font_size(1))  # 小键盘的 + 通用
        self.r.bind("<Control-minus>", lambda event: self.adjust_font_size(-1))
        
        # 2. 设置 主菜单项 (第一张新截图的左侧)
        settings_menu = tk.Menu(menubar, tearoff=0)
        
        # 将字体设置为一个中间级 (字体 -> 字体大小)
        font_category_menu = tk.Menu(menubar, tearoff=0)
        font_category_menu.add_cascade(label="字体大小", menu=font_menu)
        
        settings_menu.add_cascade(label="字体", menu=font_category_menu)
        
        # 3. '帮助' 主菜单项
        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="关于", command=self.show_about)
        
        # 挂载到主菜单栏
        menubar.add_cascade(label="设置(S)", menu=settings_menu)
        menubar.add_cascade(label="帮助(H)", menu=help_menu)
        self.r.config(menu=menubar)

        # 标题
        tk.Label(
            top_frame, text="社交网络分析系统", font=("Microsoft YaHei", 16, "bold"), bg='#f0f0f0'
        ).pack(pady=(0, 15))

        # ID 输入与选择联动区
        input_frame = tk.Frame(top_frame, bg='#f0f0f0')
        input_frame.pack(fill=tk.X)

        tk.Label(input_frame, text="当前用户ID:", bg='#f0f0f0').pack(side=tk.LEFT, padx=(0, 5))
        self.entry_u1_var = tk.StringVar()
        self.entry_u1 = ttk.Combobox(input_frame, textvariable=self.entry_u1_var, width=15)
        self.entry_u1.pack(side=tk.LEFT, padx=5)
        # 默认填入1作为实例
        self.entry_u1.insert(0, "1")

        # 占位推到右侧
        tk.Frame(input_frame, bg='#f0f0f0').pack(side=tk.LEFT, fill=tk.X, expand=True)

        tk.Label(input_frame, text="或选择用户:", bg='#f0f0f0').pack(side=tk.LEFT, padx=5)
        
        # 组装下拉框数据和搜索绑定
        self.user_var = tk.StringVar()
        self.combo_user = ttk.Combobox(input_frame, textvariable=self.user_var, width=25)
        self.combo_user.pack(side=tk.LEFT, padx=5)
        self.combo_user.bind("<<ComboboxSelected>>", self.on_combo_select)
        
        def on_combo_keyrelease(event):
            cb = event.widget
            
            # 忽略导航键与控制键，防止破坏选中态或光标
            if event.keysym in ('Up', 'Down', 'Left', 'Right', 'Return', 'Escape', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R'):
                return
                
            val = cb.get()
            if val == '':
                cb['values'] = self.global_user_list
            else:
                # 支持 ID 与 姓名的双轨检索
                filtered = [u for u in self.global_user_list if val.lower() in u.lower()]
                cb['values'] = filtered
            
            # 安全展开下拉列表（直接调用 Tcl 底层命令，不使用容易造成拦截或自动选中的方向按键）
            try:
                cb.tk.call('ttk::combobox::Post', cb)
            except tk.TclError:
                pass
                
        self.combo_user.bind("<KeyRelease>", on_combo_keyrelease)
        self.entry_u1.bind("<KeyRelease>", on_combo_keyrelease)
        self.entry_u1.bind("<<ComboboxSelected>>", self.on_combo_select)

        # 按钮矩阵区: 流式布局自动换行
        btn_frame_main = FlowFrame(top_frame, bg='#f0f0f0')
        btn_frame_main.pack(fill=tk.X, pady=15)

        ttk.Button(btn_frame_main, text="查询直接好友", command=self.do_1st)
        ttk.Button(btn_frame_main, text="查找二度人脉", command=self.do_2nd)
        ttk.Button(btn_frame_main, text="计算社交距离", command=self.do_dist)
        
        self.target_var = tk.StringVar()
        self.combo_target = ttk.Combobox(btn_frame_main, textvariable=self.target_var, width=15)
        self.combo_target.bind("<KeyRelease>", on_combo_keyrelease)
        
        ttk.Button(btn_frame_main, text="智能推荐", command=self.do_rec)
        ttk.Button(btn_frame_main, text="清空结果", command=self.clear_output)
        ttk.Button(btn_frame_main, text="添加用户", command=self.show_add_user_dialog)
        ttk.Button(btn_frame_main, text="修改信息", command=self.show_edit_user_dialog)
        ttk.Button(btn_frame_main, text="删除用户", command=self.delete_user)
        
        self.refresh_user_combos()

        # ---------- 中间笔记本选项卡 ----------
        self.notebook = ttk.Notebook(self.r)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # Tab 1: 分析结果
        self.tab_result = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_result, text="分析结果")
        self.current_font_size = 10
        self.txt = tk.Text(self.tab_result, font=("Consolas", self.current_font_size), wrap=tk.WORD)
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
        self.lbl_overview_users = tk.Label(overview_elf, text=f"用户总数: {len(self.hash_table.get_all_keys())}", font=("Microsoft YaHei", 10))
        self.lbl_overview_users.pack(anchor=tk.W, pady=2)
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

    def refresh_user_combos(self):
        self.global_user_list = []
        for k in sorted(self.hash_table.get_all_keys(), key=lambda x: int(str(x).replace('\ufeff', ''))):
            uval = self.hash_table.get(k)
            self.global_user_list.append(f"{k} - {uval['name']}")
            
        self.combo_user['values'] = self.global_user_list
        try:
            self.combo_target['values'] = self.global_user_list
            self.entry_u1['values'] = self.global_user_list
        except AttributeError:
            pass

    def draw_graph(self):
        """利用 NetworkX 提取自定义邻接图结构并渲染"""
        self.ax.clear()
        
        G = nx.Graph()
        
        valid_users = set(self.hash_table.get_all_keys())
        
        # 添加节点: 严密排序插入以保证图底层的顺序一致性
        for uid in sorted(valid_users, key=lambda x: int(str(x).replace('\ufeff', ''))):
            u_info = self.hash_table.get(uid)
            G.add_node(uid, label=u_info['name'])
            
        # 添加边: 按排序遍历
        for u in sorted(self.graph.get_all_nodes(), key=lambda x: int(str(x).replace('\ufeff', ''))):
            if u not in valid_users:
                continue
            for v in sorted(self.graph.get_neighbors(u), key=lambda x: int(str(x).replace('\ufeff', ''))):
                # 只有双方都是合法认证实体且边不存在时，渲染关系
                if v in valid_users and not G.has_edge(u, v):
                    G.add_edge(u, v)

        # 获取节点标签
        labels = nx.get_node_attributes(G, 'label')
        
        # 此时 G 中的节点按序插入，字典底层有序。只要 seed 固定，布局永远固定。
        pos = nx.spring_layout(G, seed=42)
        
        # 绘制图架构
        nx.draw_networkx_nodes(G, pos, ax=self.ax, node_color='lightblue', edgecolors='gray', node_size=800, alpha=0.9)
        nx.draw_networkx_edges(G, pos, ax=self.ax, edge_color='#CCCCCC', width=1.5)
        nx.draw_networkx_labels(G, pos, labels, ax=self.ax, font_size=9, font_family='Microsoft YaHei')
        
        self.ax.set_axis_off()
        self.canvas.draw()

    def on_combo_select(self, event):
        # 处理下拉框被选中联动同步到ID框
        val = event.widget.get()
        if val and " - " in val:
            uid = val.split(" - ")[0]
            
            # 如果触发者是主ID框自己，只有当选中的值和当前不一样才刷新，避免重复光标跳动
            if event.widget == self.entry_u1:
                # 即使是自己，为了确保显示纯数字，强制覆写并把光标推到底
                self.entry_u1.delete(0, tk.END)
                self.entry_u1.insert(0, uid)
                self.entry_u1.icursor(tk.END)
            else:
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

    def save_to_disk(self):
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            u_path = os.path.join(base_dir, "data", "user_sample.csv")
            f_path = os.path.join(base_dir, "data", "friend_sample.txt")
            save_all_data(u_path, f_path, self.hash_table, self.graph)
            self.out("[系统日志] 持久化存储成功，数据已安全写入磁盘。", clear=False)
        except Exception as e:
            self.out(f"[系统错误] 持久化存储失败: {e}", clear=False)
            messagebox.showerror("持久化异常", str(e))

    def delete_user(self):
        uid = self.entry_u1.get().strip().split(" - ")[0]
        if not uid or not self.hash_table.get(uid):
            messagebox.showwarning("提示", "请先在上方输入框或下拉框指定一个有效的系统用户！")
            return
            
        uinfo = self.hash_table.get(uid)
        ans = messagebox.askyesno("危险操作", f"确定要永久注销用户 {uinfo['name']} ({uid}) 单节点及有关的拓扑连线吗？此操作无法撤销。")
        if ans:
            self.hash_table.remove(uid)
            self.graph.remove_node(uid)
            
            # 更新下拉框
            self.refresh_user_combos()
            
            # 刷新大屏和当前选中态
            self.lbl_overview_users.config(text=f"用户总数: {len(self.hash_table.get_all_keys())}")
            self.entry_u1.delete(0, tk.END)
            self.update_stats_panel("") # 清空当前档案面板
            
            self.draw_graph()
            self.out(f"[系统日志] 用户 {uinfo['name']}({uid}) 的档案及社交关系已被注销清理。", clear=True)
            self.save_to_disk()
            messagebox.showinfo("成功", "用户彻底注销成功！")

    def show_edit_user_dialog(self):
        uid = self.entry_u1.get().strip().split(" - ")[0]
        if not uid or not self.hash_table.get(uid):
            messagebox.showwarning("提示", "请先在上方输入框或下拉框指定一个用户以修改其档案！")
            return
            
        uinfo = self.hash_table.get(uid)
        
        dialog = tk.Toplevel(self.r)
        dialog.title(f"修改档案 - {uid}")
        dialog.minsize(350, 200)
        dialog.configure(bg='#f0f0f0')
        dialog.grab_set()
        
        tk.Label(dialog, text="姓名 (必填):", bg='#f0f0f0').grid(row=0, column=0, padx=10, pady=10, sticky=tk.E)
        entry_name = tk.Entry(dialog, width=20)
        entry_name.insert(0, uinfo['name'])
        entry_name.grid(row=0, column=1, padx=10, pady=10)
        
        tk.Label(dialog, text="兴趣标签 (纸片):", bg='#f0f0f0').grid(row=1, column=0, padx=10, pady=10, sticky=tk.NE)
        ip = InterestPanel(dialog, initial_interests=uinfo['interests'])
        ip.grid(row=1, column=1, padx=10, pady=10, sticky=tk.EW)
        
        def confirm_edit():
            name = entry_name.get().strip()
            interests = ip.get_interests_str()
            
            if not name:
                messagebox.showerror("错误", "姓名不能为空！", parent=dialog)
                return
                
            self.hash_table.put(uid, {"name": name, "interests": interests})
            
            # 更新下拉框文字
            self.refresh_user_combos()
            
            self.update_stats_panel(uid)
            self.out(f"[系统日志] 用户 {name} ({uid}) 档案元数据修改成功。")
            self.save_to_disk()
            messagebox.showinfo("成功", "信息保存成功！", parent=dialog)
            dialog.destroy()
            
        ttk.Button(dialog, text="保存修改", command=confirm_edit).grid(row=2, column=0, columnspan=2, pady=15)

    def show_add_user_dialog(self):
        dialog = tk.Toplevel(self.r)
        dialog.title("添加新用户")
        dialog.minsize(400, 420)
        dialog.configure(bg='#f0f0f0')
        dialog.grab_set() # 模态窗口
        
        # 自动计算下一个有效 ID
        all_keys = self.hash_table.get_all_keys()
        max_id = 0
        for k in all_keys:
            try:
                num = int(str(k).replace('\ufeff', ''))
                if num > max_id:
                    max_id = num
            except ValueError:
                pass
        next_id = str(max_id + 1)
        
        tk.Label(dialog, text="用户ID (自动分配):", bg='#f0f0f0').grid(row=0, column=0, padx=10, pady=10, sticky=tk.E)
        entry_id = tk.Entry(dialog, width=20, state='normal')
        entry_id.insert(0, next_id)
        entry_id.config(state='readonly')
        entry_id.grid(row=0, column=1, padx=10, pady=10)
        
        tk.Label(dialog, text="姓名 (必填):", bg='#f0f0f0').grid(row=1, column=0, padx=10, pady=10, sticky=tk.E)
        entry_name = tk.Entry(dialog, width=20)
        entry_name.grid(row=1, column=1, padx=10, pady=10)
        
        tk.Label(dialog, text="兴趣标签 (纸片):", bg='#f0f0f0').grid(row=2, column=0, padx=10, pady=10, sticky=tk.NE)
        ip = InterestPanel(dialog)
        ip.grid(row=2, column=1, padx=10, pady=10, sticky=tk.EW)
        
        tk.Label(dialog, text="选择直接好友 (可多选):", bg='#f0f0f0').grid(row=3, column=0, padx=10, pady=10, sticky=tk.NE)
        
        # 好友多选列表框及搜索区
        friend_frame = tk.Frame(dialog, bg='#f0f0f0')
        friend_frame.grid(row=3, column=1, padx=10, pady=10, sticky=tk.W)
        
        # 搜索输入框
        search_f = tk.Frame(friend_frame, bg='#f0f0f0')
        search_f.pack(fill=tk.X, pady=(0, 5))
        tk.Label(search_f, text="搜寻:", bg='#f0f0f0').pack(side=tk.LEFT)
        entry_search_friend = tk.Entry(search_f, width=15)
        entry_search_friend.pack(side=tk.LEFT, padx=(5, 0))
        
        list_f = tk.Frame(friend_frame, bg='#f0f0f0')
        list_f.pack(fill=tk.BOTH, expand=True)
        friend_scroll = tk.Scrollbar(list_f)
        friend_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        list_friends = tk.Listbox(list_f, selectmode=tk.MULTIPLE, yscrollcommand=friend_scroll.set, width=22, height=6)
        list_friends.pack(side=tk.LEFT, fill=tk.BOTH)
        friend_scroll.config(command=list_friends.yview)
        
        # 填充现有用户列表
        existing_users = []
        for k in sorted(self.hash_table.get_all_keys(), key=lambda x: int(str(x).replace('\ufeff', ''))):
            uval = self.hash_table.get(k)
            display_str = f"{k} - {uval['name']}"
            existing_users.append({'uid': k, 'display': display_str})
            list_friends.insert(tk.END, display_str)
            
        def filter_friends(event):
            val = entry_search_friend.get().lower()
            list_friends.delete(0, tk.END)
            for u in existing_users:
                if val in u['display'].lower():
                    list_friends.insert(tk.END, u['display'])
                    
        entry_search_friend.bind("<KeyRelease>", filter_friends)
        
        def confirm_add():
            uid = entry_id.get().strip()
            name = entry_name.get().strip()
            interests = ip.get_interests_str()
            
            # 获取用户在Listbox中选中的所有显示文本，再反查真实UID
            selected_indices = list_friends.curselection()
            selected_displays = [list_friends.get(i) for i in selected_indices]
            friend_ids = []
            for d in selected_displays:
                for u in existing_users:
                    if u['display'] == d:
                        friend_ids.append(u['uid'])
                        break
            
            if not name:
                messagebox.showerror("错误", "姓名不能为空！", parent=dialog)
                return
                
            if self.hash_table.get(uid):
                messagebox.showerror("错误", f"用户ID '{uid}' 已存在！", parent=dialog)
                return
                
            # 存入哈希表
            self.hash_table.put(uid, {"name": name, "interests": interests})
            
            # 由于我们的邻接表添加边时会自动隐式添加节点，但为了规范，手动查一下
            # 读取并关联好友
            for fid in friend_ids:
                if self.hash_table.get(fid):
                    self.graph.add_edge(uid, fid)
            
            # 更新下拉框列表
            self.refresh_user_combos()
            
            # 更新统计数字概览
            self.lbl_overview_users.config(text=f"用户总数: {len(self.hash_table.get_all_keys())}")
            self.update_stats_panel(uid)
            
            # 手动触发关联图谱重渲染
            self.draw_graph()
            
            self.out(f"[系统日志] 新用户 {name}({uid}) 已接入系统网络。", clear=False)
            self.save_to_disk()
            messagebox.showinfo("成功", f"用户 {name} ({uid}) 添加成功！", parent=dialog)
            dialog.destroy()
            
        ttk.Button(dialog, text="确认添加", command=confirm_add).grid(row=4, column=0, columnspan=2, pady=15)

    def do_1st(self):
        uid = self.entry_u1.get().strip().split(" - ")[0]
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
        uid = self.entry_u1.get().strip().split(" - ")[0]
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
        uid = self.entry_u1.get().strip().split(" - ")[0]
        if self._validate_input(uid):
            res = algo.recommend_top_k(self.graph, self.hash_table, uid, 5) # 匹配图片标注的 Top-5
            u_name = self.hash_table.get(uid)['name']
            u_ints_set = set(self.hash_table.get(uid)['interests'].split(";"))
            
            self.out(f"=== 为 用户 {uid} ({u_name}) 生成的智能推荐 ===", clear=True)
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
        u1 = self.entry_u1.get().strip().split(" - ")[0]
        if self._validate_input(u1):
            val = self.combo_target.get()
            if not val:
                messagebox.showwarning("提示", "请先在【计算社交距离】按钮右侧的下拉框中选择目标用户！")
                return
            u2 = val.split(" - ")[0]
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

    def show_about(self):
        messagebox.showinfo(
            "关于", 
            "社交网络分析及智能推荐系统\n\n作者：ywtiny\n联系邮箱：ywtiny@outlook.com\n\n版本归属: 2024级数据结构课程设计"
        )

    def adjust_font_size(self, delta):
        new_size = self.current_font_size + delta
        if 8 <= new_size <= 48:
            self.current_font_size = new_size
            
            # 1. 更新黑底控制台字体
            self.txt.config(font=("Consolas", self.current_font_size))
            
            # 2. 更新全部原生 tk Label, Button 等控件字体
            self._scale_widget_fonts(self.r, self.current_font_size)
            
            # 3. 专门更新 ttk 风格控件的字体
            style = ttk.Style()
            style.configure(".", font=("Microsoft YaHei", self.current_font_size))
            style.configure("TButton", font=("Microsoft YaHei", self.current_font_size))
            style.configure("TLabel", font=("Microsoft YaHei", self.current_font_size))
            
            self.status_var.set(f"系统设置: 全局字体大小已统一调节至 {self.current_font_size}")

    def _scale_widget_fonts(self, widget, size):
        """递归遍历所有子控件并强制刷新字号"""
        try:
            # 放过不需要字体的或者图谱画布等第三方容器
            if not isinstance(widget, (tk.Frame, ttk.Frame, ttk.Notebook)):
                current_font = widget.cget("font")
                if current_font:
                    # 粗暴地提取基本字体族并组合新字号
                    if isinstance(current_font, str):
                        family = "Microsoft YaHei"
                        weight = "bold" if "bold" in current_font.lower() else "normal"
                        widget.config(font=(family, size, weight))
                    elif isinstance(current_font, tuple) or isinstance(current_font, list):
                        family = current_font[0]
                        weight = current_font[2] if len(current_font) > 2 else "normal"
                        widget.config(font=(family, size, weight))
        except Exception:
            pass # 忽略无 font 属性的图层控件
            
        for child in widget.winfo_children():
            self._scale_widget_fonts(child, size)


if __name__ == "__main__":
    root = tk.Tk()
    # 为ttk应用一个好看的标准主题
    from tkinter import ttk
    style = ttk.Style()
    if "clam" in style.theme_names():
        style.theme_use("clam")
        
    app = App(root)
    root.mainloop()
