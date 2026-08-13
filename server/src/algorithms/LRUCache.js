/**
 * Custom LRU cache: HashMap + Doubly Linked List, O(1) get/put.
 * No npm lru-cache package used.
 *
 * DLL ordering: head.next = most recently used, tail.prev = least recently used.
 * Map stores key -> DLL node so both lookup and unlink are O(1).
 */

class DLLNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity = 100) {
    if (capacity <= 0) throw new Error('LRUCache capacity must be > 0');
    this.capacity = capacity;
    this.map = new Map(); // key -> DLLNode
    this.head = new DLLNode(null, null); // sentinel, most-recent side
    this.tail = new DLLNode(null, null); // sentinel, least-recent side
    this.head.next = this.tail;
    this.tail.prev = this.head;

    this.hits = 0;
    this.misses = 0;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _insertAtHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) {
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    this._remove(node);
    this._insertAtHead(node);
    return node.value;
  }

  put(key, value) {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this._remove(existing);
      this._insertAtHead(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev;
      if (lru !== this.head) {
        this._remove(lru);
        this.map.delete(lru.key);
      }
    }

    const node = new DLLNode(key, value);
    this.map.set(key, node);
    this._insertAtHead(node);
  }

  has(key) {
    return this.map.has(key);
  }

  get size() {
    return this.map.size;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.map.size,
      capacity: this.capacity,
    };
  }

  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
  }
}

module.exports = { LRUCache };
