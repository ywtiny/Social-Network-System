import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.hash_table import HashTable
from data_structure.adjacency_list import Graph
from utils.data_reader import load_all_data, save_all_data
import algorithm.algorithms as algo

# 引入 networkx 仅用于网络图谱可视化中计算节点在画布上的坐标排版和渲染，不涉及图遍历逻辑
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
        super().__init__(master, bg='#F0F6FB')
        self.tags = []
        
        input_f = tk.Frame(self, bg='#F0F6FB')
        input_f.pack(fill=tk.X)
        self.entry = tk.Entry(input_f, width=15)
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", lambda e: self.add_tag())
        
        btn = ttk.Button(input_f, text="添加", width=4, command=self.add_tag, style="Btn4.TButton")
        btn.pack(side=tk.LEFT, padx=(5, 0))
        
        self.chips_frame = FlowFrame(self, bg='#F0F6FB')
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
            chip = tk.Frame(self.chips_frame, bg='#D0E6FC', bd=1, relief=tk.SOLID)
            tk.Label(chip, text=tag, bg='#D0E6FC', font=("Microsoft YaHei", 9)).pack(side=tk.LEFT, padx=(2, 0))
            btn_x = tk.Label(chip, text=" ✕ ", fg="red", bg='#D0E6FC', font=("Microsoft YaHei", 9, "bold"), cursor="hand2")
            btn_x.pack(side=tk.LEFT)
            btn_x.bind("<Button-1>", lambda e, t=tag: self.remove_tag(t))
            
        # 强制更新并重新触发布局
        self.chips_frame.update_idletasks()
        self.chips_frame._on_configure()
        
    def get_interests_str(self):
        return ";".join(self.tags)


class FriendPanel(tk.Frame):
    """好友管理组件：纸片标签 + Combobox 联想搜索"""
    def __init__(self, master, candidates, initial_friends=None, on_combo_keyrelease=None):
        super().__init__(master, bg='#F0F6FB')
        self.candidates = candidates
        self.friend_ids = []
        self.on_combo_keyrelease = on_combo_keyrelease
        
        input_f = tk.Frame(self, bg='#F0F6FB')
        input_f.pack(fill=tk.X)
        self.combo_var = tk.StringVar()
        self.combo = ttk.Combobox(input_f, textvariable=self.combo_var, width=18, values=candidates)
        self.combo.pack(side=tk.LEFT)
        if self.on_combo_keyrelease:
            self.combo.bind("<KeyRelease>", self.on_combo_keyrelease)
            # _close_autocomplete is defined in App, need to pass it or access it via master
            # For now, assuming it's accessible via master or will be handled by the caller.
            # The original code binds it to self.r.after in App, so this might be a slight deviation.
            # Let's keep it as in the provided snippet.
            self.combo.bind("<FocusOut>", lambda e: self.master.after(200, self.master.master._close_autocomplete)) # Assuming master.master is the App instance
        self.combo.bind('<<ComboboxSelected>>', lambda e: self.add_friend())
        
        btn = ttk.Button(input_f, text="添加好友", width=8, command=self.add_friend, style="Btn5.TButton")
        btn.pack(side=tk.LEFT, padx=(5, 0))
        
        self.chips_frame = FlowFrame(self, bg='#F0F6FB')
        self.chips_frame.pack(fill=tk.BOTH, expand=True, pady=(5,0))
        
        if initial_friends:
            for fid in initial_friends:
                if fid not in self.friend_ids:
                    self.friend_ids.append(fid)
            self.render_chips()
        
    def add_friend(self, val=None):
        if val is None:
            val = self.combo.get().strip()
        if not val or ' - ' not in val:
            return
        fid = val.split(' - ')[0]
        if fid and fid not in self.friend_ids:
            self.friend_ids.append(fid)
            self.render_chips()
        self.combo.set('')
        
    def remove_friend(self, fid):
        if fid in self.friend_ids:
            self.friend_ids.remove(fid)
            self.render_chips()
            
    def render_chips(self):
        for widget in self.chips_frame.winfo_children():
            widget.destroy()
        
        for fid in self.friend_ids:
            display = fid
            for c in self.candidates:
                if c.startswith(fid + ' - '):
                    display = c
                    break
            chip = tk.Frame(self.chips_frame, bg='#E1F0FA', bd=1, relief=tk.SOLID)
            tk.Label(chip, text=display, bg='#E1F0FA', font=("Microsoft YaHei", 9)).pack(side=tk.LEFT, padx=(2, 0))
            btn_x = tk.Label(chip, text=" ✕ ", fg="red", bg='#E1F0FA', font=("Microsoft YaHei", 9, "bold"), cursor="hand2")
            btn_x.pack(side=tk.LEFT)
            btn_x.bind("<Button-1>", lambda e, f=fid: self.remove_friend(f))
            
        self.chips_frame.update_idletasks()
        self.chips_frame._on_configure()
        
    def get_friend_ids(self):
        return self.friend_ids[:]

class App:
    def __init__(self, root):
        self.r = root
        self.r.title("社交网络分析系统")
        self.r.geometry("900x650")
        self.r.configure(bg='#F0F6FB')
        
        self.graph = Graph()
        self.hash_table = HashTable()
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.user_data_path = os.path.join(self.base_dir, "data", "user_sample.csv")
        self.friend_data_path = os.path.join(self.base_dir, "data", "friend_sample.txt")

        # ---------- 数据加载 ----------
        try:
            user_count = self.load_data_from_paths(self.user_data_path, self.friend_data_path, refresh_ui=False)
            init_msg = f"数据加载成功！\n已加载 {user_count} 名用户信息。\n已加载图谱关系边数据。\n"
            if user_count == 0:
                init_msg = "数据加载成功，但数据集为空。\n"
            status_text = "数据加载成功！"
        except Exception as e:
            messagebox.showwarning("警告", f"初始数据加载失败:\n{e}")
            init_msg = "数据加载失败，请检查文件路径。\n"
            status_text = "加载失败"

        # ---------- 顶部操作面板 ----------
        top_frame = tk.Frame(self.r, bg='#F0F6FB')
        top_frame.pack(fill=tk.X, padx=10, pady=10)

        # ---------- 顶部原生系统菜单栏 ----------
        menu_bar = tk.Menu(self.r)
        
        menu_settings = tk.Menu(menu_bar, tearoff=0)
        menu_settings.add_command(label="字体放大", command=lambda: self.adjust_font_size(1))
        menu_settings.add_command(label="字体缩小", command=lambda: self.adjust_font_size(-1))
        menu_bar.add_cascade(label="设置(S)", menu=menu_settings)
        
        menu_help = tk.Menu(menu_bar, tearoff=0)
        menu_help.add_command(label="关于本系统", command=self.show_about)
        menu_bar.add_cascade(label="帮助(H)", menu=menu_help)
        
        self.r.config(menu=menu_bar)

        # 注册全局快捷键 (支持 Ctrl+=/Ctrl+- 与 Ctrl+滚轮 缩放字体)
        self.r.bind("<Control-equal>", lambda e: self.adjust_font_size(1))
        self.r.bind("<Control-minus>", lambda e: self.adjust_font_size(-1))
        self.r.bind("<Control-MouseWheel>", lambda e: self.adjust_font_size(1 if e.delta > 0 else -1))

        # 标题
        tk.Label(
            top_frame, text="社交网络分析系统", font=("Microsoft YaHei", 16, "bold"), bg='#F0F6FB'
        ).pack(pady=(0, 15))

        # ID 输入与选择联动区
        input_frame = tk.Frame(top_frame, bg='#F0F6FB')
        input_frame.pack(fill=tk.X)

        tk.Label(input_frame, text="当前用户:", bg='#F0F6FB').pack(side=tk.LEFT, padx=(0, 5))
        self.entry_u1_var = tk.StringVar()
        self.entry_u1 = ttk.Combobox(input_frame, textvariable=self.entry_u1_var, width=25)
        self.entry_u1.pack(side=tk.LEFT, padx=5)
        self.entry_u1.insert(0, "1")
        # ── 自研联想浮窗系统（彻底替代 ttk::combobox::Post 焦点抢夺问题）──
        self._autocomplete_popup = None
        
        def _close_autocomplete():
            if self._autocomplete_popup:
                self._autocomplete_popup.destroy()
                self._autocomplete_popup = None
        self._close_autocomplete = _close_autocomplete # Make it accessible for FriendPanel
        
        def _show_autocomplete(cb, items):
            _close_autocomplete()
            if not items:
                return
            
            popup = tk.Toplevel(self.r)
            popup.wm_overrideredirect(True)
            popup.wm_attributes('-topmost', True)
            self._autocomplete_popup = popup
            
            listbox = tk.Listbox(popup, font=("Microsoft YaHei", 9), 
                                 selectmode=tk.SINGLE, bd=1, relief=tk.SOLID,
                                 activestyle='dotbox')
            listbox.pack(fill=tk.BOTH, expand=True)
            
            display_items = items[:8]
            for item in display_items:
                listbox.insert(tk.END, item)
            
            # 定位到输入框正下方
            cb.update_idletasks()
            x = cb.winfo_rootx()
            y = cb.winfo_rooty() + cb.winfo_height()
            w = max(cb.winfo_width(), 200)
            h = len(display_items) * 22
            popup.wm_geometry(f"{w}x{h}+{x}+{y}")
            
            def on_listbox_click(e):
                sel = listbox.curselection()
                if sel:
                    val = listbox.get(sel[0])
                    cb.set(val)
                    cb._last_val = val
                _close_autocomplete()
                cb.focus_set()
                cb.icursor(tk.END)
            
            listbox.bind('<Button-1>', on_listbox_click)
        
        def on_combo_keyrelease(event):
            cb = event.widget
            
            if event.keysym in ('Up', 'Down', 'Left', 'Right', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R'):
                return
            if event.keysym == 'Escape':
                _close_autocomplete()
                return
            if event.keysym == 'Return':
                _close_autocomplete()
                return
            
            val = cb.get()
            
            # 防抖动与输入法保护
            if getattr(cb, '_last_val', None) == val:
                return
            cb._last_val = val

            if val == '':
                cb['values'] = self.global_user_list
                _close_autocomplete()
            else:
                filtered = [u for u in self.global_user_list if val.lower() in u.lower()]
                cb['values'] = filtered
                _show_autocomplete(cb, filtered)
                
                
        self.on_combo_keyrelease = on_combo_keyrelease
        self.entry_u1.bind("<KeyRelease>", on_combo_keyrelease)
        self.entry_u1.bind("<<ComboboxSelected>>", self.on_combo_select)
        self.entry_u1.bind("<FocusOut>", lambda e: self.r.after(200, _close_autocomplete))

        # 按钮矩阵区: 流式布局自动换行
        btn_frame_main = FlowFrame(top_frame, bg='#F0F6FB')
        btn_frame_main.pack(fill=tk.X, pady=15)

        ttk.Button(btn_frame_main, text="加载数据", command=self.load_data_dialog, style="Btn1.TButton")
        ttk.Button(btn_frame_main, text="查询直接好友", command=self.do_1st, style="Btn2.TButton")
        ttk.Button(btn_frame_main, text="查找二度人脉", command=self.do_2nd, style="Btn3.TButton")
        ttk.Button(btn_frame_main, text="计算社交距离", command=self.do_dist, style="Btn4.TButton")
        
        self.target_var = tk.StringVar()
        self.combo_target = ttk.Combobox(btn_frame_main, textvariable=self.target_var, width=15)
        self.combo_target.bind("<KeyRelease>", on_combo_keyrelease)
        
        ttk.Button(btn_frame_main, text="智能推荐", command=self.do_rec, style="Btn5.TButton")
        ttk.Button(btn_frame_main, text="清空结果", command=self.clear_output, style="Btn6.TButton")
        ttk.Button(btn_frame_main, text="添加用户", command=self.show_add_user_dialog, style="Btn7.TButton")
        ttk.Button(btn_frame_main, text="修改信息", command=self.show_edit_user_dialog, style="Btn8.TButton")
        ttk.Button(btn_frame_main, text="删除用户", command=self.delete_user, style="Btn9.TButton")
        
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
        
        # 图谱工具栏
        graph_toolbar = tk.Frame(self.tab_graph, bg='#F0F6FB')
        graph_toolbar.pack(fill=tk.X, padx=5, pady=2)
        ttk.Button(graph_toolbar, text="重置视图", command=self._reset_graph_view, style="Btn6.TButton").pack(side=tk.LEFT, padx=2)
        tk.Label(graph_toolbar, text="提示: 滚轮缩放 | 右键拖拽平移", bg='#F0F6FB', fg='#888', font=("Microsoft YaHei", 8)).pack(side=tk.RIGHT)
        
        # 内置 Matplotlib 图像画布容器
        self.fig, self.ax = plt.subplots(figsize=(10, 6))
        self.fig.patch.set_facecolor('#F0F8FF')
        self.fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.tab_graph)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # --- 图谱交互：滚轮缩放 + 右键拖拽平移 ---
        self._graph_drag_data = {}
        self._graph_zoom_level = 1.0
        self._graph_node_collections = []
        self._graph_base_node_size = 400
        self._graph_label_texts = {}
        self._graph_base_font_size = 9
        self._graph_edge_collection = None
        self._graph_base_line_width = 1.5
        
        def on_graph_scroll(event):
            if event.inaxes != self.ax:
                return
            xlim = self.ax.get_xlim()
            ylim = self.ax.get_ylim()
            xc = (xlim[0] + xlim[1]) / 2
            yc = (ylim[0] + ylim[1]) / 2
            scale = 0.8 if event.button == 'up' else 1.25
            self._graph_zoom_level /= scale
            xw = (xlim[1] - xlim[0]) * scale / 2
            yw = (ylim[1] - ylim[0]) * scale / 2
            self.ax.set_xlim(xc - xw, xc + xw)
            self.ax.set_ylim(yc - yw, yc + yw)
            # 同步缩放节点圆圈大小和标签字号
            new_size = self._graph_base_node_size * (self._graph_zoom_level ** 2)
            for coll in self._graph_node_collections:
                coll.set_sizes([new_size] * len(coll.get_offsets()))
            new_font = self._graph_base_font_size * self._graph_zoom_level
            for txt in self._graph_label_texts.values():
                txt.set_fontsize(new_font)
            if self._graph_edge_collection:
                self._graph_edge_collection.set_linewidths(
                    [self._graph_base_line_width * self._graph_zoom_level])
            self.canvas.draw_idle()
        
        def on_graph_press(event):
            if event.inaxes != self.ax or event.button != 3:
                return
            self._graph_drag_data = {'x': event.xdata, 'y': event.ydata}
        
        def on_graph_motion(event):
            if not self._graph_drag_data or event.inaxes != self.ax or event.button != 3:
                return
            dx = self._graph_drag_data['x'] - event.xdata
            dy = self._graph_drag_data['y'] - event.ydata
            xlim = self.ax.get_xlim()
            ylim = self.ax.get_ylim()
            self.ax.set_xlim(xlim[0] + dx, xlim[1] + dx)
            self.ax.set_ylim(ylim[0] + dy, ylim[1] + dy)
            self.canvas.draw_idle()
        
        def on_graph_release(event):
            self._graph_drag_data = {}
        
        self.fig.canvas.mpl_connect('scroll_event', on_graph_scroll)
        self.fig.canvas.mpl_connect('button_press_event', on_graph_press)
        self.fig.canvas.mpl_connect('motion_notify_event', on_graph_motion)
        self.fig.canvas.mpl_connect('button_release_event', on_graph_release)

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
        sorted_ids = self._get_sorted_user_ids()
        if sorted_ids:
            first_uid = sorted_ids[0]
            uinfo = self.hash_table.get(first_uid)
            self.entry_u1.set(f"{first_uid} - {uinfo['name']}")
            self.update_stats_panel(first_uid)
        else:
            self.update_stats_panel("")
        self.r.after(100, self.draw_graph) # 延迟绘制防止阻塞GUI初始化

    def refresh_user_combos(self):
        self.global_user_list = []
        for k in self._get_sorted_user_ids():
            uval = self.hash_table.get(k)
            self.global_user_list.append(f"{k} - {uval['name']}")
            
        try:
            self.entry_u1['values'] = self.global_user_list
            self.combo_target['values'] = self.global_user_list
        except AttributeError:
            pass

    def _get_sorted_user_ids(self):
        def _uid_sort(uid):
            uid_str = str(uid)
            if uid_str.isdigit():
                return (0, int(uid_str))
            return (1, uid_str)

        return sorted(self.hash_table.get_all_keys(), key=_uid_sort)

    def load_data_from_paths(self, user_path, friend_path, refresh_ui=True):
        """
        从指定路径加载数据。为避免半加载状态，采用临时结构成功后再替换。
        """
        new_graph = Graph()
        new_hash_table = HashTable()
        load_all_data(user_path, friend_path, new_hash_table, new_graph)

        self.graph = new_graph
        self.hash_table = new_hash_table
        self.user_data_path = user_path
        self.friend_data_path = friend_path

        if refresh_ui:
            self.refresh_user_combos()
            self.lbl_overview_users.config(text=f"用户总数: {len(self.hash_table.get_all_keys())}")
            sorted_ids = self._get_sorted_user_ids()
            if sorted_ids:
                uid = sorted_ids[0]
                uinfo = self.hash_table.get(uid)
                self.entry_u1.set(f"{uid} - {uinfo['name']}")
                self.combo_target.set("")
                self.update_stats_panel(uid)
            else:
                self.entry_u1.set("")
                self.combo_target.set("")
                self.update_stats_panel("")

            self.draw_graph()
            self.status_var.set(f"数据加载成功: {len(self.hash_table.get_all_keys())} 名用户")

        return len(self.hash_table.get_all_keys())

    def load_data_dialog(self):
        init_dir = os.path.join(self.base_dir, "data")
        user_path = filedialog.askopenfilename(
            title="选择用户信息文件",
            initialdir=init_dir,
            filetypes=[("CSV/TXT 文件", "*.csv *.txt"), ("所有文件", "*.*")]
        )
        if not user_path:
            return

        friend_path = filedialog.askopenfilename(
            title="选择好友关系文件",
            initialdir=init_dir,
            filetypes=[("TXT/CSV 文件", "*.txt *.csv"), ("所有文件", "*.*")]
        )
        if not friend_path:
            return

        try:
            count = self.load_data_from_paths(user_path, friend_path, refresh_ui=True)
            self.out(f"[系统日志] 数据重载成功：当前共 {count} 名用户。", clear=True)
            self.out(f"[系统日志] 用户文件: {self.user_data_path}")
            self.out(f"[系统日志] 关系文件: {self.friend_data_path}")
        except Exception as e:
            messagebox.showerror("加载失败", str(e))

    def draw_graph(self):
        """利用 NetworkX 计算节点坐标并渲染自定义图结构"""
        self.ax.clear()
        
        G = nx.Graph()
        
        valid_users = set(self.hash_table.get_all_keys())
        
        # 添加节点: 严密排序插入以保证图底层的顺序一致性
        for uid in sorted(valid_users, key=lambda x: (0, int(str(x))) if str(x).isdigit() else (1, str(x))):
            u_info = self.hash_table.get(uid)
            G.add_node(uid, label=u_info['name'])
            
        # 添加边: 按排序遍历
        for u in sorted(self.graph.get_all_nodes(), key=lambda x: (0, int(str(x))) if str(x).isdigit() else (1, str(x))):
            if u not in valid_users:
                continue
            for v in sorted(self.graph.get_neighbors(u), key=lambda x: (0, int(str(x))) if str(x).isdigit() else (1, str(x))):
                if v in valid_users and not G.has_edge(u, v):
                    G.add_edge(u, v)

        labels = nx.get_node_attributes(G, 'label')
        total_nodes = len(G.nodes())
        
        # --- 自适应视觉参数：根据节点规模动态调整 ---
        node_size = max(250, 800 - total_nodes * 12)
        label_font_size = max(7, 10 - total_nodes // 15)
        edge_alpha = max(0.4, 0.8 - total_nodes * 0.005)
        spring_k = max(0.3, 0.8 - total_nodes * 0.01)
        
        # --- 智能分层布局：主网居中舒展 + 孤岛外环固定 ---
        import math
        pos = {}
        components = list(nx.connected_components(G))
        components.sort(key=len, reverse=True)
        
        main_nodes = set()
        isolated_nodes = []
        
        if components:
            main_nodes = components[0]
            main_graph = G.subgraph(main_nodes)
            main_pos = nx.spring_layout(main_graph, seed=42, k=spring_k, iterations=80)
            pos.update(main_pos)
            
            for comp in components[1:]:
                isolated_nodes.extend(list(comp))
                
            if isolated_nodes:
                num_iso = len(isolated_nodes)
                radius = 1.35
                for i, node in enumerate(isolated_nodes):
                    angle = 2 * math.pi * i / num_iso - math.pi / 2
                    pos[node] = (radius * math.cos(angle), radius * math.sin(angle))
        else:
            pos = nx.spring_layout(G, seed=42)
        
        # --- 分层渲染：主网与孤岛使用不同视觉风格 ---
        main_list = [n for n in G.nodes() if n in main_nodes]
        iso_list = [n for n in G.nodes() if n in isolated_nodes]
        self._graph_node_collections = []
        self._graph_base_node_size = node_size
        self._graph_zoom_level = 1.0
        
        # 主网络节点：蓝色系
        if main_list:
            c1 = nx.draw_networkx_nodes(G, pos, nodelist=main_list, ax=self.ax,
                                        node_color='#7EB6FF', edgecolors='#4A90E2',
                                        node_size=node_size, alpha=0.9)
            if c1:
                self._graph_node_collections.append(c1)
        # 孤岛节点：橙红醒目色，一眼就能区分
        if iso_list:
            c2 = nx.draw_networkx_nodes(G, pos, nodelist=iso_list, ax=self.ax,
                                        node_color='#FFAB91', edgecolors='#E64A19',
                                        node_size=node_size, alpha=0.85)
            if c2:
                self._graph_node_collections.append(c2)
        
        # 连接线：半透明防止视觉混乱
        edge_coll = nx.draw_networkx_edges(G, pos, ax=self.ax, edge_color='#A6C8FF',
                                            width=1.5, alpha=edge_alpha)
        self._graph_edge_collection = edge_coll
        self._graph_base_line_width = 1.5
        # 标签（保存文本对象以供缩放时同步调整字号）
        self._graph_label_texts = nx.draw_networkx_labels(
            G, pos, labels, ax=self.ax,
            font_size=label_font_size, font_family='Microsoft YaHei')
        self._graph_base_font_size = label_font_size
        
        self.ax.set_axis_off()
        self.canvas.draw()

    def _reset_graph_view(self):
        """重置图谱视图到初始全景状态"""
        self.draw_graph()
        self.status_var.set("图谱视图已重置")

    def on_combo_select(self, event):
        # 选中目标后不再截断文字，保留 "ID - 姓名" 的全称美观展示
        val = event.widget.get()
        if val and " - " in val:
            uid = val.split(" - ")[0]
            # 焦点转移防止继续强占输入法
            self.r.focus_set()
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
        else:
            self.lbl_s_uid.config(text="用户ID:   暂无")
            self.lbl_s_name.config(text="姓名:     暂无")
            self.lbl_s_int.config(text="兴趣:     暂无")
            self.lbl_s_fri.config(text="直接好友数: 暂无")

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
            save_all_data(self.user_data_path, self.friend_data_path, self.hash_table, self.graph)
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
        dialog.title(f"修改档案与好友管理 - {uid}")
        dialog.minsize(450, 400)
        dialog.configure(bg='#F0F6FB')
        dialog.grab_set()
        
        # --- 基本信息修改区 ---
        frame_basic = tk.LabelFrame(dialog, text="基本信息修改", bg='#F0F6FB', font=("Microsoft YaHei", 9, "bold"))
        frame_basic.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(frame_basic, text="姓名 (必填):", bg='#F0F6FB').grid(row=0, column=0, padx=10, pady=10, sticky=tk.E)
        entry_name = tk.Entry(frame_basic, width=20)
        entry_name.insert(0, uinfo['name'])
        entry_name.grid(row=0, column=1, padx=10, pady=10, sticky=tk.W)
        
        tk.Label(frame_basic, text="兴趣标签:", bg='#F0F6FB').grid(row=1, column=0, padx=10, pady=10, sticky=tk.NE)
        ip = InterestPanel(frame_basic, initial_interests=uinfo['interests'])
        ip.grid(row=1, column=1, padx=10, pady=10, sticky=tk.EW)
        
        # --- 好友关系管理区 ---
        frame_friends = tk.LabelFrame(dialog, text="直接好友管理", bg='#F0F6FB', font=("Microsoft YaHei", 9, "bold"))
        frame_friends.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        current_friends = self.graph.get_neighbors(uid)
        fp = FriendPanel(
            frame_friends, candidates=self.global_user_list,
            initial_friends=current_friends,
            on_combo_keyrelease=self.on_combo_keyrelease
        )
        fp.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # --- 保存动作 ---
        def confirm_edit():
            name = entry_name.get().strip()
            interests = ip.get_interests_str()
            
            if not name:
                messagebox.showerror("错误", "姓名不能为空！", parent=dialog)
                return
                
            self.hash_table.put(uid, {"name": name, "interests": interests})
            
            # 重建好友关系：先清空旧关系，再根据纸片标签重新添加
            old_neighbors = list(self.graph.get_neighbors(uid))
            for old_n in old_neighbors:
                self.graph.remove_edge(uid, old_n)
            
            for fid in fp.get_friend_ids():
                self.graph.add_edge(uid, fid)
            
            self.refresh_user_combos()
            self.update_stats_panel(uid)
            self.draw_graph()
            self.out(f"[系统日志] 用户 {name} ({uid}) 档案及好友结构调整完毕。")
            self.save_to_disk()
            messagebox.showinfo("成功", "所有信息及关系统一保存至磁盘！", parent=dialog)
            dialog.destroy()
            
        ttk.Button(dialog, text="保存所有修改并退出", command=confirm_edit, style="Btn3.TButton").pack(pady=10)

    def show_add_user_dialog(self):
        dialog = tk.Toplevel(self.r)
        dialog.title("添加新用户")
        dialog.minsize(380, 280)
        dialog.configure(bg='#F0F6FB')
        dialog.grab_set()
        
        # 自动计算下一个有效 ID
        all_keys = self.hash_table.get_all_keys()
        max_id = 0
        for k in all_keys:
            try:
                num = int(k)
                if num > max_id:
                    max_id = num
            except ValueError:
                pass
        next_id = str(max_id + 1)
        
        tk.Label(dialog, text="用户ID (自动分配):", bg='#F0F6FB').grid(row=0, column=0, padx=10, pady=10, sticky=tk.E)
        entry_id = tk.Entry(dialog, width=20, state='normal')
        entry_id.insert(0, next_id)
        entry_id.config(state='readonly')
        entry_id.grid(row=0, column=1, padx=10, pady=10)
        
        tk.Label(dialog, text="姓名 (必填):", bg='#F0F6FB').grid(row=1, column=0, padx=10, pady=10, sticky=tk.E)
        entry_name = tk.Entry(dialog, width=20)
        entry_name.grid(row=1, column=1, padx=10, pady=10)
        
        tk.Label(dialog, text="兴趣标签:", bg='#F0F6FB').grid(row=2, column=0, padx=10, pady=10, sticky=tk.NE)
        ip = InterestPanel(dialog)
        ip.grid(row=2, column=1, padx=10, pady=10, sticky=tk.EW)
        
        tk.Label(dialog, text="直接好友:", bg='#F0F6FB').grid(row=3, column=0, padx=10, pady=10, sticky=tk.NE)
        fp = FriendPanel(
            dialog, candidates=self.global_user_list,
            on_combo_keyrelease=self.on_combo_keyrelease
        )
        fp.grid(row=3, column=1, padx=10, pady=10, sticky=tk.EW)
        
        def confirm_add():
            uid = entry_id.get().strip()
            name = entry_name.get().strip()
            interests = ip.get_interests_str()
            friend_ids = fp.get_friend_ids()
            
            if not name:
                messagebox.showerror("错误", "姓名不能为空！", parent=dialog)
                return
                
            if self.hash_table.get(uid):
                messagebox.showerror("错误", f"用户ID '{uid}' 已存在！", parent=dialog)
                return
                
            # 存入哈希表
            self.hash_table.put(uid, {"name": name, "interests": interests})
            
            for fid in friend_ids:
                if self.hash_table.get(fid):
                    self.graph.add_edge(uid, fid)
            
            self.refresh_user_combos()
            self.lbl_overview_users.config(text=f"用户总数: {len(self.hash_table.get_all_keys())}")
            self.update_stats_panel(uid)
            self.draw_graph()
            
            self.out(f"[系统日志] 新用户 {name}({uid}) 已接入系统网络。", clear=False)
            self.save_to_disk()
            messagebox.showinfo("成功", f"用户 {name} ({uid}) 添加成功！", parent=dialog)
            dialog.destroy()
            
        ttk.Button(dialog, text="确认添加", command=confirm_add, style="Btn3.TButton").grid(row=4, column=0, columnspan=2, pady=15)

    def do_1st(self):
        uid = self.entry_u1.get().strip().split(" - ")[0]
        if self._validate_input(uid):
            res = algo.get_first_degree(self.graph, uid)
            u_name = self.hash_table.get(uid)['name']
            
            self.out(f"=== 用户 {uid} ({u_name}) 的直接好友 ===", clear=True)
            self.out("")
            
            for fid in res:
                f_info = self.hash_table.get(fid)
                if not f_info:
                    continue
                f_name = f_info['name']
                f_ints = f_info['interests'].replace(";", ", ")
                sim = int(algo.get_interest_similarity(self.hash_table.get(uid)['interests'], f_info['interests']) * 10) + 1
                self.out(f"ID: {fid:>3} | 姓名: {f_name:<4} | 亲密度: {sim} | 兴趣: {f_ints}")
                
            self.out(f"\n共 {len(res)} 位直接好友。")
            self.status_var.set("查询完成: 直接好友")
            self.update_stats_panel(uid)

    def do_2nd(self):
        uid = self.entry_u1.get().strip().split(" - ")[0]
        if self._validate_input(uid):
            res_with_paths = algo.get_second_degree_with_paths(self.graph, uid)
            u_name = self.hash_table.get(uid)['name']
            u_ints_set = set(self.hash_table.get(uid)['interests'].split(";"))
            
            self.out(f"=== 用户 {uid} ({u_name}) 的可能认识的人 (二度人脉) ===", clear=True)
            self.out("")
            
            for fid, path in res_with_paths:
                f_info = self.hash_table.get(fid)
                if not f_info:
                    continue
                f_name = f_info['name']
                f_ints = f_info['interests'].replace(";", ", ")
                f_ints_set = set(f_info['interests'].split(";"))
                common_ints = len(u_ints_set.intersection(f_ints_set))

                path_display = []
                for pid in path:
                    p_info = self.hash_table.get(pid)
                    p_name = p_info['name'] if p_info else "未知"
                    path_display.append(f"{pid}({p_name})")

                self.out(f"ID: {fid:>3} | 姓名: {f_name:<4} | 社交距离: 2度 | 共同兴趣: {common_ints} | 兴趣: {f_ints}")
                self.out(f"连接路径: {' -> '.join(path_display)}")
                self.out("")
                
            self.out(f"\n共 {len(res_with_paths)} 位二度人脉。")
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
                    path_names = []
                    for pid in path:
                        p_info = self.hash_table.get(pid)
                        p_name = p_info['name'] if p_info else '未知'
                        path_names.append(f"[{pid} {p_name}]")
                    self.out(f"探测连通路径: {' -> '.join(path_names)}")
                self.status_var.set("计算完成: 社交距离")

    def show_about(self):
        messagebox.showinfo(
            "关于", 
            "社交网络分析及智能推荐系统\n\n仓库地址：https://github.com/ywtiny/Social-Network-System\n联系邮箱：ywtiny@outlook.com"
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
            style.configure("TCombobox", font=("Microsoft YaHei", self.current_font_size))
            style.configure("TLabelframe.Label", font=("Microsoft YaHei", self.current_font_size, "bold"))
            
            # 4. 逐一击穿 9 个独立配色按钮的子类样式（它们有独立的 font 声明，不会继承父类）
            for i in range(1, 10):
                style.configure(f"Btn{i}.TButton", font=("Microsoft YaHei", self.current_font_size))
            
            # 5. 直接对搜索框 Combobox 实例设置字体（ttk Style 无法穿透到输入区文字）
            combo_font = ("Microsoft YaHei", self.current_font_size)
            self.entry_u1.configure(font=combo_font)
            self.combo_target.configure(font=combo_font)
            self.r.option_add("*TCombobox*Listbox.font", combo_font)
            
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
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icon_ico_path = os.path.join(base_dir, "assets", "icons", "app_icon.ico")
    icon_png_path = os.path.join(base_dir, "assets", "icons", "app_icon.png")
    try:
        if os.path.exists(icon_png_path):
            root._icon_img = tk.PhotoImage(file=icon_png_path)
            root.iconphoto(True, root._icon_img)
        elif os.path.exists(icon_ico_path):
            root.iconbitmap(icon_ico_path)
    except Exception:
        pass

    # 为ttk应用一个好看的渐变主题
    from tkinter import ttk
    style = ttk.Style()
    if "clam" in style.theme_names():
        style.theme_use("clam")
        
    gradient_colors = [
        '#FF9AA2', # 粉红 (Btn1)
        '#FFB7B2', # 浅粉 (Btn2)
        '#FFDAC1', # 肉桃 (Btn3)
        '#E2F0CB', # 嫩绿 (Btn4)
        '#B5EAD7', # 薄荷 (Btn5)
        '#C7CEEA', # 浅紫 (Btn6)
        '#A0C4FF', # 仙女蓝 (Btn7)
        '#9BF6FF', # 天青 (Btn8)
        '#8AECFF'  # 纯青蓝 (Btn9)
    ]
    
    for i, color in enumerate(gradient_colors):
        style_name = f"Btn{i+1}.TButton"
        style.configure(style_name, font=('Microsoft YaHei', 9), padding=5, background=color, foreground='#444444')
        style.map(style_name, background=[('active', '#F0F6FB')])
        
    app = App(root)
    root.mainloop()

