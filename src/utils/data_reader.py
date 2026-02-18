def load_all_data(user_path, friend_path, hash_table, graph):
    # 强异常处理防御机制
    try:
        with open(user_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i in range(1, len(lines)): # 跳过头内容
                parts = lines[i].strip().split(',')
                if len(parts) >= 3:
                    hash_table.put(parts[0], {"name": parts[1], "interests": parts[2]})
                    
        with open(friend_path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(',')
                if len(parts) == 2:
                    graph.add_edge(parts[0], parts[1])
    except Exception as e:
        raise ValueError('文件挂载崩溃: ' + str(e))
