"""
核心图算法处理模块

包含：
1. 一度 / 二度好友网络发现 (基于自定义封装邻接表)
2. 社交距离探测计算 (限制深度的广度优先遍历)
3. 智能推荐引擎 (交并比计算 + 最小堆过滤)
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.heap import MinHeap


def get_first_degree(graph, user_id):
    """
    获取一度人脉 (直接相连的邻居节点)

    Args:
        graph (Graph): 无向图邻接表实例
        user_id (str): 查询节点ID

    Returns:
        list: 直接相连的好友 ID 集合
    """
    return graph.get_neighbors(user_id)


def get_second_degree(graph, user_id):
    """
    获取二度人脉 (好友的好友)
    内置排除回路功能：二度网络中剔除目标本身以及直接的一度好友。

    Args:
        graph (Graph): 无向图邻接表实例
        user_id (str): 目标查询节点ID

    Returns:
        list: 满足条件的二度人脉 ID 集合
    """
    # 排斥循环引用与自回环的二度BFS
    first = set(graph.get_neighbors(user_id))
    second = set()
    for f in first:
        for f_of_f in graph.get_neighbors(f):
            if f_of_f != user_id and f_of_f not in first:
                second.add(f_of_f)
    return list(second)


def shortest_distance(graph, start, end):
    """
    基于 BFS 广度优先搜索计算两人间的最短距离与路径

    Args:
        graph (Graph): 无向图数据结构
        start (str): 起点用户 ID
        end (str): 终点用户 ID

    Returns:
        tuple[int, list]: (最短路径边数, [经过路径的ID序列])。若无连通路径返回 (-1, [])
    """
    # 基于 BFS 的全距离最短路径探测
    if start == end:
        return 0, [start]

    queue = [(start, [start])]
    visited = {start}

    while queue:
        curr, path = queue.pop(0)
        for neighbor in graph.get_neighbors(curr):
            if neighbor == end:
                return len(path), path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    return -1, []


def get_interest_similarity(u1_int, u2_int):
    """
    计算两名用户间的兴趣爱好相似度 (Jaccard 交并比)

    Args:
        u1_int (str): 用户1 的序列化兴趣串 例: '运动;看书'
        u2_int (str): 用户2 的序列化兴趣串

    Returns:
        float: 取值区间在 0.0 ~ 1.0 的重合度比例
    """
    st1 = set(u1_int.split(";")) if u1_int else set()
    st2 = set(u2_int.split(";")) if u2_int else set()
    if not st1 or not st2:
        return 0.0
    return len(st1.intersection(st2)) / len(st1.union(st2))


def recommend_top_k(graph, hash_table, target_user, k=3):
    """
    基于用户画像及社交关系拓扑进行的 Top-K 个性化推荐引擎

    依据算法:
        1. 获取所有非目标、非一度关联的其他潜在节点
        2. 基于兴趣交并比 (权重 0.7) + 共同好友数量 (权重 0.1) 计算综合匹配 Score
        3. 利用定长最小堆 (MinHeap) 实时保留评分最为优异的 K 个个体推荐

    Args:
        graph (Graph): 底层社交网络图谱
        hash_table (HashTable): 利用哈希拉链表 O(1) 获取用户详情缓存
        target_user (str): 推荐基准发起用户
        k (int): 截断返回的推荐列表容量，默认返回 3 席

    Returns:
        list[tuple]: 排序好的推荐列表 (最终合并分数, 被推用户ID, 被推用户姓名)
    """
    u_info = hash_table.get(target_user)
    if not u_info:
        return []
    first_deg = set(graph.get_neighbors(target_user))
    heap = MinHeap()

    for uid in hash_table.get_all_keys():
        if uid == target_user or uid in first_deg:
            continue
        o_info = hash_table.get(uid)

        sim = get_interest_similarity(u_info["interests"], o_info["interests"])
        common = len(
            set(graph.get_neighbors(target_user)).intersection(
                set(graph.get_neighbors(uid))
            )
        )
        score = sim * 0.7 + common * 0.1

        if score > 0:
            if len(heap.heap) < k:
                heap.push((score, uid, o_info["name"]))
            elif score > heap.heap[0][0]:
                heap.pop()
                heap.push((score, uid, o_info["name"]))

    res = []
    while len(heap.heap) > 0:
        res.insert(0, heap.pop())
    return [(round(s, 2), u, n) for s, u, n in res]
