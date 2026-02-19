"""
无向图功能模块 - 采用邻接表实现

自主实现基于字典与列表的无向图结构。
避免使用任何第三方图论库 (如 NetworkX)。
"""

class Graph:
    """
    无向图邻接表数据结构
    存储结构: dict[node_id] = list[neighbor_ids]
    """
    def __init__(self):
        # 核心数据结构一：基于字典与列表底层的自实现无向图邻接表
        self.adj_list = {}

    def add_node(self, node_id):
        """
        向图中添加独立节点

        Args:
            node_id (str): 节点的唯一标识符
        """
        if node_id not in self.adj_list:
            self.adj_list[node_id] = []

    def remove_node(self, node_id):
        """
        从图中移除一个节点，并清理所有与之相连的边
        """
        if node_id in self.adj_list:
            # 先从其所有邻居的邻接表中移除该节点
            for neighbor in self.adj_list[node_id]:
                if neighbor in self.adj_list and node_id in self.adj_list[neighbor]:
                    self.adj_list[neighbor].remove(node_id)
            # 最后删除该节点本身
            del self.adj_list[node_id]

    def add_edge(self, u, v):
        """
        添加无向边 (若节点不存在则自动新建)
        内部包含重边过滤机制

        Args:
            u (str): 节点 u 的 ID
            v (str): 节点 v 的 ID
        """
        self.add_node(u)
        self.add_node(v)
        # 禁止直接调用库，需自主判定重边以防止回环异常
        if v not in self.adj_list[u]:
            self.adj_list[u].append(v)
        if u not in self.adj_list[v]:
            self.adj_list[v].append(u)

    def get_neighbors(self, node_id):
        """
        获取指定节点的全部相连邻居节点（一度人脉）

        Args:
            node_id (str): 查询节点 ID

        Returns:
            list: 邻居节点 ID 的列表，若无则返回空列表
        """
        return self.adj_list.get(node_id, [])

    def get_all_nodes(self):
        """
        获取图中当前存在的所有独立节点ID集合

        Returns:
            list: 图中所有参与连通关系的唯一节点标识符列表
        """
        return list(self.adj_list.keys())
