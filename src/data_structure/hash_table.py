class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.next = None

class HashTable:
    def __init__(self, capacity=100):
        # 核心数据结构二：哈希表，采用链地址法解决冲突
        self.capacity = capacity
        self.table = [None] * capacity

    def _hash(self, key):
        return hash(str(key)) % self.capacity

    def put(self, key, value):
        idx = self._hash(key)
        if not self.table[idx]:
            self.table[idx] = Node(key, value)
        else:
            curr = self.table[idx]
            while curr:
                if str(curr.key) == str(key):
                    curr.value = value
                    return
                if not curr.next: break
                curr = curr.next
            curr.next = Node(key, value)

    def get(self, key):
        idx = self._hash(key)
        curr = self.table[idx]
        while curr:
            if str(curr.key) == str(key): return curr.value
            curr = curr.next
        return None

    def get_all_keys(self):
        keys = []
        for node in self.table:
            curr = node
            while curr:
                keys.append(curr.key)
                curr = curr.next
        return keys
