"""
自定义哈希表功能模块

基于拉链法（链地址法）解决哈希冲突问题。
提供平均 O(1) 的用户信息增删改查支持。
"""

class Node:
    """
    单链表节点（用于解决哈希冲突的拉链法桶结构）
    """
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.next = None


class HashTable:
    """
    自研哈希表数据结构 (缓存管理器)
    核心机制: 取模运算 + 链地址法防冲突
    """
    def __init__(self, capacity=100):
        # 核心数据结构二：哈希表，采用链地址法解决冲突
        self.capacity = capacity
        self.table = [None] * capacity

    def _hash(self, key):
        """
        内部哈希函数

        Args:
            key: 任意可转化为字符串键的值

        Returns:
            int: 散列在数组槽位范围内的索引
        """
        return hash(str(key)) % self.capacity

    def put(self, key, value):
        """
        向哈希表中插入或更新键值对

        Args:
            key (str): 用户 ID (作为主键)
            value (dict): 用户信息的字典
        """
        idx = self._hash(key)
        if not self.table[idx]:
            self.table[idx] = Node(key, value)
        else:
            curr = self.table[idx]
            while curr:
                if str(curr.key) == str(key):
                    curr.value = value
                    return
                if not curr.next:
                    break
                curr = curr.next
            curr.next = Node(key, value)

    def get(self, key):
        """
        根据键名在哈希表中获取存放的数据

        Args:
            key (str): 用户 ID

        Returns:
            dict | None: 对应的用户信息，若无则返回 None
        """
        idx = self._hash(key)
        curr = self.table[idx]
        while curr:
            if str(curr.key) == str(key):
                return curr.value
            curr = curr.next
        return None

    def get_all_keys(self):
        """
        获取缓存在哈希表中的全量独立 Key 集合

        Returns:
            list: 用户 ID 的列表
        """
        keys = []
        for node in self.table:
            curr = node
            while curr:
                keys.append(curr.key)
                curr = curr.next
        return keys
