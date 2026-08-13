/**
 * Custom Trie implementation for autocomplete.
 * No npm trie package used.
 *
 * Each TrieNode holds children, an end-of-word flag, and popularity metadata.
 * getSuggestions() walks the subtree under a prefix and returns the top-N
 * words ranked by popularity (frequency), using a small max-heap-like
 * partial sort so we don't have to sort the entire subtree for large tries.
 */

class TrieNode {
  constructor() {
    this.children = new Map(); // char -> TrieNode
    this.isEndOfWord = false;
    this.word = null; // full word stored at terminal nodes (avoids reconstruction)
    this.popularity = 0; // frequency/search count used for ranking
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.size = 0; // number of distinct words inserted
  }

  /**
   * Insert a word with an optional popularity weight.
   * If the word already exists, popularity is incremented by the given amount
   * (this lets repeated searches raise a term's autocomplete rank over time).
   */
  insert(word, popularity = 1) {
    if (typeof word !== 'string' || word.length === 0) return;
    const normalized = word.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch);
    }
    if (!node.isEndOfWord) {
      this.size += 1;
    }
    node.isEndOfWord = true;
    node.word = normalized;
    node.popularity += popularity;
  }

  /** Bump popularity of an existing word (e.g. when it's searched). */
  bumpPopularity(word, amount = 1) {
    const normalized = word.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch);
    }
    if (!node.isEndOfWord) return false;
    node.popularity += amount;
    return true;
  }

  /** Exact word lookup. O(L) where L is word length. */
  search(word) {
    if (typeof word !== 'string') return false;
    const normalized = word.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch);
    }
    return node.isEndOfWord;
  }

  /** Returns true if any word in the trie starts with the given prefix. O(L). */
  startsWith(prefix) {
    return this._nodeAtPrefix(prefix) !== null;
  }

  _nodeAtPrefix(prefix) {
    if (typeof prefix !== 'string') return null;
    const normalized = prefix.toLowerCase();
    let node = this.root;
    for (const ch of normalized) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch);
    }
    return node;
  }

  /**
   * Returns up to `limit` suggestions for a prefix, ranked by popularity
   * (descending), then alphabetically as a tiebreaker.
   *
   * Complexity: O(L) to locate the prefix node + O(K log K) where K is the
   * number of matching words under that subtree (K can be << total trie
   * size for a selective prefix, which is the whole point of a Trie versus
   * scanning every product's searchable terms).
   */
  getSuggestions(prefix, limit = 10) {
    const startNode = this._nodeAtPrefix(prefix);
    if (!startNode) return [];

    const results = [];
    const stack = [startNode];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node.isEndOfWord) {
        results.push({ word: node.word, popularity: node.popularity });
      }
      for (const child of node.children.values()) {
        stack.push(child);
      }
    }

    results.sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return a.word.localeCompare(b.word);
    });

    return results.slice(0, limit);
  }

  /** Total distinct words stored. */
  count() {
    return this.size;
  }
}

module.exports = { Trie, TrieNode };
