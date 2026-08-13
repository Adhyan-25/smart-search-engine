/**
 * Custom Bloom filter: bit array + k independent hash functions.
 * No npm bloom-filter package used.
 *
 * Semantics (must never be violated):
 *  - mightContain() === false  -> definitely NOT in the set.
 *  - mightContain() === true   -> POSSIBLY in the set; caller MUST confirm
 *                                 against authoritative storage before acting.
 *
 * We use double hashing (Kirsch-Mitzenmacher) to derive k hash functions
 * from two independent base hashes (FNV-1a and djb2), which avoids needing
 * k separate hash implementations while keeping good distribution.
 */

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

class BloomFilter {
  /**
   * @param {number} expectedItems - estimated number of items to insert
   * @param {number} falsePositiveRate - desired false-positive rate, e.g. 0.01
   */
  constructor(expectedItems = 10000, falsePositiveRate = 0.01) {
    this.expectedItems = expectedItems;
    this.falsePositiveRate = falsePositiveRate;

    // Optimal bit array size: m = -(n * ln(p)) / (ln(2)^2)
    this.size = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2)
    );
    // Optimal hash count: k = (m/n) * ln(2)
    this.hashCount = Math.max(1, Math.round((this.size / expectedItems) * Math.log(2)));

    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    this.insertedCount = 0;
  }

  _setBit(index) {
    this.bitArray[index >> 3] |= 1 << (index & 7);
  }

  _getBit(index) {
    return (this.bitArray[index >> 3] & (1 << (index & 7))) !== 0;
  }

  _hashes(item) {
    const h1 = fnv1a(item);
    const h2 = djb2(item);
    const positions = [];
    for (let i = 0; i < this.hashCount; i++) {
      positions.push((h1 + i * h2) % this.size);
    }
    return positions;
  }

  add(item) {
    for (const pos of this._hashes(String(item))) {
      this._setBit(pos);
    }
    this.insertedCount += 1;
  }

  /** false = definitely absent. true = possibly present (must verify). */
  mightContain(item) {
    for (const pos of this._hashes(String(item))) {
      if (!this._getBit(pos)) return false;
    }
    return true;
  }

  /** Estimated current false-positive probability given items inserted so far. */
  currentFalsePositiveRate() {
    // p ≈ (1 - e^(-k*n/m))^k
    const { hashCount: k, size: m, insertedCount: n } = this;
    return (1 - Math.exp((-k * n) / m)) ** k;
  }

  memoryBytes() {
    return this.bitArray.byteLength;
  }
}

module.exports = { BloomFilter };
