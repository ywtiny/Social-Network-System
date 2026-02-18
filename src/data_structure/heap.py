class MinHeap:
    # 核心数据结构三：自研最小堆结构（用于Top-K推荐排序截断）
    def __init__(self):
        self.heap = []
        
    def push(self, item):
        self.heap.append(item)
        self._sift_up(len(self.heap) - 1)
        
    def pop(self):
        if len(self.heap) == 0: return None
        if len(self.heap) == 1: return self.heap.pop()
        root = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return root
        
    def _sift_up(self, idx):
        parent = (idx - 1) // 2
        # item[0] 存放分数作比较标准
        if idx > 0 and self.heap[idx][0] < self.heap[parent][0]:
            self.heap[idx], self.heap[parent] = self.heap[parent], self.heap[idx]
            self._sift_up(parent)
            
    def _sift_down(self, idx):
        smallest = idx
        left = 2 * idx + 1
        right = 2 * idx + 2
        if left < len(self.heap) and self.heap[left][0] < self.heap[smallest][0]: smallest = left
        if right < len(self.heap) and self.heap[right][0] < self.heap[smallest][0]: smallest = right
        if smallest != idx:
            self.heap[idx], self.heap[smallest] = self.heap[smallest], self.heap[idx]
            self._sift_down(smallest)
