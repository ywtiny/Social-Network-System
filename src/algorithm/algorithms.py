import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data_structure.heap import MinHeap

def get_first_degree(graph, user_id):
    return graph.get_neighbors(user_id)

def get_second_degree(graph, user_id):
    # 排斥循环引用与自回环的二度BFS
    first = set(graph.get_neighbors(user_id))
    second = set()
    for f in first:
        for f_of_f in graph.get_neighbors(f):
            if f_of_f != user_id and f_of_f not in first:
                second.add(f_of_f)
    return list(second)

def shortest_distance(graph, start, end):
    # 基于 BFS 的全距离最短路径探测
    if start == end: return 0, [start]
    
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
    st1 = set(u1_int.split(';')) if u1_int else set()
    st2 = set(u2_int.split(';')) if u2_int else set()
    if not st1 or not st2: return 0.0
    return len(st1.intersection(st2)) / len(st1.union(st2))

def recommend_top_k(graph, hash_table, target_user, k=3):
    # 智能推荐模块（兴趣交并比 + 最小堆）满分挂钩扩展项
    u_info = hash_table.get(target_user)
    if not u_info: return []
    first_deg = set(graph.get_neighbors(target_user))
    heap = MinHeap()
    
    for uid in hash_table.get_all_keys():
        if uid == target_user or uid in first_deg: continue
        o_info = hash_table.get(uid)
        
        sim = get_interest_similarity(u_info['interests'], o_info['interests'])
        common = len(set(graph.get_neighbors(target_user)).intersection(set(graph.get_neighbors(uid))))
        score = sim * 0.7 + common * 0.1
        
        if score > 0:
            if len(heap.heap) < k:
                heap.push((score, uid, o_info['name']))
            elif score > heap.heap[0][0]:
                heap.pop()
                heap.push((score, uid, o_info['name']))
                
    res = []
    while len(heap.heap) > 0:
        res.insert(0, heap.pop())
    return [(round(s,2), u, n) for s, u, n in res]
