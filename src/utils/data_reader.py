"""
文件持久化模块

支持将规定格式的 CSV 序列与 TXT 用户网络拓扑结构序列挂载到物理内存对应的图与哈希表中。
含有鲁棒型的脏数据防崩溃与类型捕获异常流转。
"""

def load_all_data(user_path, friend_path, hash_table, graph):
    """
    挂载所有的物理测试文件数据到数据结构骨架之上

    Args:
        user_path (str): 用户基础画像表位置 (需含表头)
        friend_path (str): 拓扑关系交集表位置
        hash_table (HashTable): 注入用户基本信息的目的地结构
        graph (Graph): 构造网络连通边的目的地邻接表

    Raises:
        ValueError: 从底层接管异常抛往上端展现给用户
    """
    try:
        with open(user_path, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()
            for i in range(1, len(lines)):  # 跳过首行表头内容
                if not lines[i].strip():
                    continue
                parts = lines[i].strip().split(",")
                if len(parts) >= 3:
                    # 记录核心用户兴趣元数据
                    hash_table.put(parts[0], {"name": parts[1], "interests": parts[2]})

        with open(friend_path, "r", encoding="utf-8-sig") as f:
            for line in f:
                if not line.strip():
                    continue
                parts = line.strip().split(",")
                if len(parts) == 2:
                    # 并入图网络无向连线
                    graph.add_edge(parts[0], parts[1])
    except Exception as e:
        raise ValueError("文件物理拉取异常崩溃: " + str(e))

def save_all_data(user_path, friend_path, hash_table, graph):
    """
    将内存中的用户哈希表与关系图序列化回写至物理文件中实现持久化
    """
    try:
        # 重写用户档案 (带表头)
        with open(user_path, "w", encoding="utf-8") as f:
            f.write("用户ID,姓名,兴趣标签\n")
            # 排序保障文本的顺序一致性
            sorted_keys = sorted(hash_table.get_all_keys(), key=lambda x: int(x))
            for uid in sorted_keys:
                uinfo = hash_table.get(uid)
                f.write(f"{uid},{uinfo['name']},{uinfo['interests']}\n")
                
        # 重写好友无向图关系 (去重写入)
        written_edges = set()
        with open(friend_path, "w", encoding="utf-8") as f:
            for u in sorted(graph.get_all_nodes(), key=lambda x: int(x)):
                for v in sorted(graph.get_neighbors(u), key=lambda x: int(x)):
                    # 为了无向图不写两遍 1,2 和 2,1，统一按从小到大排序形成 tuple 签名
                    u_int, v_int = int(u), int(v)
                    edge = (min(u_int, v_int), max(u_int, v_int))
                    if edge not in written_edges:
                        f.write(f"{u},{v}\n")
                        written_edges.add(edge)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise ValueError("文件物理写入持久化异常崩溃: " + str(e))
