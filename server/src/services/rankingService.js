/**
 * Simple, explainable relevance ranking. NOT a production search-relevance
 * algorithm (no TF-IDF, no learning-to-rank) - just transparent scoring
 * signals so the "why did this rank higher" question always has a clear
 * answer.
 *
 * Score = weighted sum of:
 *   - exact title match       (highest weight)
 *   - partial/substring title match
 *   - keyword match
 *   - normalized popularity   (0-1, log-scaled to avoid runaway products dominating)
 *   - normalized rating       (0-1)
 */
const WEIGHTS = {
  exactTitleMatch: 50,
  partialTitleMatch: 20,
  keywordMatch: 10,
  popularity: 10,
  rating: 10,
};

function scoreProduct(product, queryLower) {
  const titleLower = (product.title || '').toLowerCase();
  const keywordsLower = (product.keywords || []).map((k) => k.toLowerCase());

  let score = 0;
  const breakdown = {};

  if (titleLower === queryLower) {
    score += WEIGHTS.exactTitleMatch;
    breakdown.exactTitleMatch = WEIGHTS.exactTitleMatch;
  } else if (titleLower.includes(queryLower)) {
    score += WEIGHTS.partialTitleMatch;
    breakdown.partialTitleMatch = WEIGHTS.partialTitleMatch;
  }

  if (keywordsLower.some((k) => k.includes(queryLower))) {
    score += WEIGHTS.keywordMatch;
    breakdown.keywordMatch = WEIGHTS.keywordMatch;
  }

  // log-scale popularity so a handful of viral products don't dominate every query
  const popularityScore = Math.min(1, Math.log10((product.popularity || 0) + 1) / 4);
  score += popularityScore * WEIGHTS.popularity;
  breakdown.popularity = +(popularityScore * WEIGHTS.popularity).toFixed(2);

  const ratingScore = (product.rating || 0) / 5;
  score += ratingScore * WEIGHTS.rating;
  breakdown.rating = +(ratingScore * WEIGHTS.rating).toFixed(2);

  return { score: +score.toFixed(2), breakdown };
}

function rankProducts(products, query) {
  const queryLower = (query || '').toLowerCase();
  return products
    .map((p) => {
      const { score, breakdown } = scoreProduct(p, queryLower);
      return { ...(p.toObject ? p.toObject() : p), _relevance: { score, breakdown } };
    })
    .sort((a, b) => b._relevance.score - a._relevance.score);
}

module.exports = { scoreProduct, rankProducts, WEIGHTS };
