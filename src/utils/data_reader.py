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
                raw = lines[i].strip()
                if not raw:
                    continue
                parts = raw.split(",", 2)
                if len(parts) < 3:
                    raise ValueError(f"用户信息格式错误(第{i + 1}行): {raw}")

                uid = parts[0].strip()
                name = parts[1].strip()
                interests = parts[2].strip()
                if not uid or not name:
                    raise ValueError(f"用户信息缺少必要字段(第{i + 1}行): {raw}")

                # 记录核心用户兴趣元数据
                hash_table.put(uid, {"name": name, "interests": interests})
                # 保证无好友关系的孤立用户也进入图结构
                graph.add_node(uid)

        with open(friend_path, "r", encoding="utf-8-sig") as f:
            for line_no, line in enumerate(f, start=1):
                raw = line.strip()
                if not raw:
                    continue
                parts = raw.split(",")
                if len(parts) != 2:
                    raise ValueError(f"好友关系格式错误(第{line_no}行): {raw}")

                u = parts[0].strip()
                v = parts[1].strip()
                # 兼容包含表头的关系文件
                if line_no == 1 and "用户" in u and "ID" in u:
                    continue
                if not u or not v:
                    raise ValueError(f"好友关系缺少用户ID(第{line_no}行): {raw}")
                if not hash_table.get(u) or not hash_table.get(v):
                    raise ValueError(f"好友关系引用了不存在的用户(第{line_no}行): {raw}")
                # 并入图网络无向连线
                graph.add_edge(u, v)
    except Exception as e:
        raise ValueError("文件物理拉取异常崩溃: " + str(e))

def save_all_data(user_path, friend_path, hash_table, graph):
    """
    将内存中的用户哈希表与关系图序列化回写至物理文件中实现持久化
    """
    try:
        def _sort_uid(uid):
            uid_str = str(uid)
            if uid_str.isdigit():
                return (0, int(uid_str))
            return (1, uid_str)

        # 重写用户档案 (带表头)
        with open(user_path, "w", encoding="utf-8") as f:
            f.write("用户ID,姓名,兴趣标签\n")
            # 排序保障文本的顺序一致性
            sorted_keys = sorted(hash_table.get_all_keys(), key=_sort_uid)
            for uid in sorted_keys:
                uinfo = hash_table.get(uid)
                f.write(f"{uid},{uinfo['name']},{uinfo['interests']}\n")
                
        # 重写好友无向图关系 (去重写入)
        written_edges = set()
        with open(friend_path, "w", encoding="utf-8") as f:
            for u in sorted(graph.get_all_nodes(), key=_sort_uid):
                for v in sorted(graph.get_neighbors(u), key=_sort_uid):
                    # 为了无向图不写两遍 1,2 和 2,1，统一按从小到大排序形成 tuple 签名
                    edge = tuple(sorted((str(u), str(v))))
                    if edge not in written_edges:
                        f.write(f"{u},{v}\n")
                        written_edges.add(edge)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise ValueError("文件物理写入持久化异常崩溃: " + str(e))
