import tkinter as tk
from tkinter import messagebox
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.hash_table import HashTable
from data_structure.adjacency_list import Graph
from utils.data_reader import load_all_data
import algorithm.algorithms as algo

class App:
    def __init__(self, root):
        self.r = root
        self.r.title("社交图谱验证及推荐主控 (DataStructure)")
        self.r.geometry("550x580")
        
        self.graph = Graph()
        self.hash_table = HashTable()
        
        try:
            load_all_data("../data/user_sample.csv", "../data/friend_sample.txt", self.hash_table, self.graph)
        except Exception as e:
            messagebox.showwarning("警告", "初始测试数据未找到，请检查路径。")
            
        tk.Label(self.r, text="测试查询用户 ID:").pack(pady=3)
        self.entry_u1 = tk.Entry(self.r)
        self.entry_u1.pack()
        
        tk.Button(self.r, text="[必做] 一度好友人脉探测", width=30, bg="lightblue", command=self.do_1st).pack(pady=3)
        tk.Button(self.r, text="[必做] BFS探测二度人脉", width=30, bg="lightblue", command=self.do_2nd).pack(pady=3)
        tk.Button(self.r, text="[扩展] Top 3 智能引流推荐", width=30, bg="lightgreen", command=self.do_rec).pack(pady=3)
        
        tk.Label(self.r, text="社交路径目标端用户 ID:").pack(pady=3)
        self.entry_u2 = tk.Entry(self.r)
        self.entry_u2.pack()
        tk.Button(self.r, text="[必做] 计算社交最小距离", width=30, bg="orange", command=self.do_dist).pack(pady=3)
        
        self.txt = tk.Text(self.r, height=18, width=65)
        self.txt.pack(pady=10)
        self.txt.insert(tk.END, "[系统消息] 数据结构引擎就绪，等待挂载算法！\n\n")

    def _validate_input(self, val):
        if not val or not self.hash_table.get(val):
            messagebox.showerror("错误", "非法的ID或者ID不在库内。")
            return False
        return True
        
    def out(self, text):
        self.txt.insert(tk.END, f"{text}\n")
        
    def do_1st(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.get_first_degree(self.graph, uid)
            self.out(f"=> 【{uid} - {self.hash_table.get(uid)['name']}】的直系好友 ID:\n {res}")
        
    def do_2nd(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.get_second_degree(self.graph, uid)
            self.out(f"=> 【{uid} - {self.hash_table.get(uid)['name']}】的二度人脉 ID:\n {res}")
            
    def do_rec(self):
        uid = self.entry_u1.get()
        if self._validate_input(uid):
            res = algo.recommend_top_k(self.graph, self.hash_table, uid, 3)
            self.out(f"=> 【{uid}】基于共同兴趣与好友特征的 Top推荐(分数,ID,名称):")
            for r in res: self.out(f"    - {r}")

    def do_dist(self):
        u1, u2 = self.entry_u1.get(), self.entry_u2.get()
        if self._validate_input(u1) and self._validate_input(u2):
            dist, path = algo.shortest_distance(self.graph, u1, u2)
            if dist == -1:
                self.out(f"=> 目标 【{u1}】 到 【{u2}】 没有任何图结构连通！[无社交关联]")
            else:
                self.out(f"=> 最短距离为: {dist} | BFS穿越路径: {' -> '.join(path)}")

if __name__ == '__main__':
    root = tk.Tk()
    app = App(root)
    root.mainloop()
