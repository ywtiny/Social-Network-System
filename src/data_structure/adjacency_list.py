class Graph:
    def __init__(self):
        # 核心数据结构一： 基于字典与列表底层的自实现无向图邻接表
        self.adj_list = {} 

    def add_node(self, node_id):
        if node_id not in self.adj_list:
            self.adj_list[node_id] = []

    def add_edge(self, u, v):
        self.add_node(u)
        self.add_node(v)
        # 禁止直接调用库，需自主判定回路及重边
        if v not in self.adj_list[u]: self.adj_list[u].append(v)
        if u not in self.adj_list[v]: self.adj_list[v].append(u)

    def get_neighbors(self, node_id):
        return self.adj_list.get(node_id, [])
