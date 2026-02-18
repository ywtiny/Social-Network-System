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
        with open(user_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            for i in range(1, len(lines)):  # 跳过首行表头内容
                parts = lines[i].strip().split(",")
                if len(parts) >= 3:
                    # 记录核心用户兴趣元数据
                    hash_table.put(parts[0], {"name": parts[1], "interests": parts[2]})

        with open(friend_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split(",")
                if len(parts) == 2:
                    # 并入图网络无向连线
                    graph.add_edge(parts[0], parts[1])
    except Exception as e:
        raise ValueError("文件物理拉取异常崩溃: " + str(e))
