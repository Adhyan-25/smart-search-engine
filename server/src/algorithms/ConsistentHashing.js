/**
 * Custom consistent hashing ring, built from scratch (no npm package).
 *
 * Demonstrates: when a node is added/removed, only ~K/N keys remap
 * (K = key count, N = node count), versus simple modulo hashing where
 * adding/removing a node remaps almost every key.
 *
 * Virtual nodes: each physical node gets `virtualNodesPerNode` points on
 * the ring, which smooths out load distribution (without them, a single
 * physical node can end up owning a disproportionate arc of the ring).
 */

function hashString(str) {
  // djb2 accumulation, then a murmur-style finalizer (fmix32) to fix djb2's
  // weak avalanche behavior: without this step, strings differing only in
  // their last character (e.g. "key-1" vs "key-2") produce near-sequential
  // hashes, which clusters keys onto a single ring node instead of spreading
  // them uniformly. The finalizer scrambles bits so single-character input
  // differences produce uncorrelated outputs.
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  hash >>>= 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

class ConsistentHashRing {
  constructor(virtualNodesPerNode = 100) {
    this.virtualNodesPerNode = virtualNodesPerNode;
    this.ring = new Map(); // hash -> physical node id
    this.sortedHashes = []; // kept sorted for binary search
    this.nodes = new Set();
  }

  _rebuildSorted() {
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  addNode(nodeId) {
    if (this.nodes.has(nodeId)) return;
    this.nodes.add(nodeId);
    for (let i = 0; i < this.virtualNodesPerNode; i++) {
      const vHash = hashString(`${nodeId}#${i}`);
      this.ring.set(vHash, nodeId);
    }
    this._rebuildSorted();
  }

  removeNode(nodeId) {
    if (!this.nodes.has(nodeId)) return;
    this.nodes.delete(nodeId);
    for (let i = 0; i < this.virtualNodesPerNode; i++) {
      const vHash = hashString(`${nodeId}#${i}`);
      this.ring.delete(vHash);
    }
    this._rebuildSorted();
  }

  /** Binary search for the first ring point >= hash(key), wrapping around. */
  getNode(key) {
    if (this.sortedHashes.length === 0) return null;
    const h = hashString(String(key));
    let lo = 0;
    let hi = this.sortedHashes.length - 1;
    if (h > this.sortedHashes[hi]) return this.ring.get(this.sortedHashes[0]);
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedHashes[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    return this.ring.get(this.sortedHashes[lo]);
  }
}

/** Simple modulo hashing, for the comparison demo. */
function moduloAssign(key, nodeCount, nodeList) {
  const h = hashString(String(key));
  return nodeList[h % nodeCount];
}

module.exports = { ConsistentHashRing, hashString, moduloAssign };
