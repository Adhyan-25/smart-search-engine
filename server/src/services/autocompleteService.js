const { Trie } = require('../algorithms/Trie');
const { LinearAutocomplete } = require('../algorithms/LinearAutocomplete');
const { termsBloomFilter } = require('./cacheService');
const Product = require('../models/Product');

// Trie is the production structure. LinearAutocomplete is kept only for the
// benchmark suite (see benchmarks/trieVsLinear.js) - it is never used on the
// live request path.
const trie = new Trie();
const linear = new LinearAutocomplete(); // benchmark-only

let initialized = false;

/** Populate the Trie (and Bloom filter) from a list of { term, popularity }. */
function initFromTerms(terms) {
  terms.forEach(({ term, popularity }) => {
    trie.insert(term, popularity);
    termsBloomFilter.add(term.toLowerCase());
  });
  initialized = true;
}

function isInitialized() {
  return initialized;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getSuggestions(prefix, limit = 10) {
  if (!prefix || prefix.trim().length === 0) return [];
  const normalized = prefix.trim().toLowerCase();
  const indexed = trie.getSuggestions(normalized, limit);
  if (indexed.length) return indexed;

  const startsWith = new RegExp(`^${escapeRegex(normalized)}`, 'i');
  const products = await Product.find(
    { $or: [{ title: startsWith }, { keywords: startsWith }] },
    { title: 1, keywords: 1, popularity: 1 }
  ).sort({ popularity: -1 }).limit(limit * 10).lean();

  const matches = new Map();
  for (const product of products) {
    for (const term of [product.title, ...(product.keywords || [])]) {
      const word = term.toLowerCase();
      if (word.startsWith(normalized)) {
        matches.set(word, Math.max(matches.get(word) || 0, product.popularity || 0));
      }
    }
  }

  return [...matches]
    .map(([word, popularity]) => ({ word, popularity }))
    .sort((a, b) => b.popularity - a.popularity || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/**
 * Fast existence check using Bloom filter first. Negative -> skip the Trie
 * walk entirely. Positive -> confirm with the authoritative Trie (never
 * trust the Bloom filter's "maybe" on its own).
 */
function termExists(term) {
  const normalized = term.toLowerCase();
  if (!termsBloomFilter.mightContain(normalized)) {
    return false; // definitely absent, no need to check the Trie
  }
  return trie.search(normalized); // confirm against authoritative structure
}

function recordSearch(term) {
  trie.bumpPopularity(term, 1);
}

module.exports = {
  trie,
  linear,
  initFromTerms,
  isInitialized,
  getSuggestions,
  termExists,
  recordSearch,
};
