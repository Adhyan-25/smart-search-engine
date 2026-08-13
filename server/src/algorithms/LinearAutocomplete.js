/**
 * Naive baseline: O(N*L) linear scan over all terms for every query.
 * Exists purely so we can benchmark it against Trie.getSuggestions().
 */
class LinearAutocomplete {
  constructor() {
    this.terms = []; // [{ word, popularity }]
  }

  insert(word, popularity = 1) {
    const normalized = word.toLowerCase();
    const existing = this.terms.find((t) => t.word === normalized);
    if (existing) {
      existing.popularity += popularity;
    } else {
      this.terms.push({ word: normalized, popularity });
    }
  }

  getSuggestions(prefix, limit = 10) {
    const normalized = prefix.toLowerCase();
    const matches = this.terms.filter((t) => t.word.startsWith(normalized));
    matches.sort((a, b) => {
      if (b.popularity !== a.popularity) return b.popularity - a.popularity;
      return a.word.localeCompare(b.word);
    });
    return matches.slice(0, limit);
  }

  count() {
    return this.terms.length;
  }
}

module.exports = { LinearAutocomplete };
