const Product = require('../models/Product');
const { rankProducts } = require('./rankingService');
const { buildOffsetPagination, buildOffsetMeta, decodeCursor, encodeCursor } = require('../utils/pagination');
const { getOrSetCached } = require('./cacheService');

function buildMongoQuery({ q, category, minPrice, maxPrice, minRating }) {
  const query = {};
  if (q) query.$text = { $search: q };
  if (category) query.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }
  if (minRating !== undefined) query.rating = { $gte: minRating };
  return query;
}

function buildSort(sort) {
  switch (sort) {
    case 'price_asc': return { price: 1 };
    case 'price_desc': return { price: -1 };
    case 'rating': return { rating: -1 };
    case 'popularity': return { popularity: -1 };
    case 'newest': return { createdAt: -1 };
    case 'relevance':
    default:
      return null; // relevance sort is done in-app via rankingService
  }
}

/** Offset (skip/limit) pagination path. */
async function searchOffset(params) {
  const { q, page, limit, category, minPrice, maxPrice, minRating, sort } = params;
  const mongoQuery = buildMongoQuery({ q, category, minPrice, maxPrice, minRating });
  const mongoSort = buildSort(sort);
  const { skip, limit: safeLimit } = buildOffsetPagination(page, limit);

  const cacheKey = `search:offset:${JSON.stringify({ ...params })}`;
  const cached = await getOrSetCached(cacheKey, async () => {
    let cursor = Product.find(mongoQuery);
    if (mongoSort) cursor = cursor.sort(mongoSort);
    cursor = cursor.skip(skip).limit(safeLimit);

    const [results, totalResults] = await Promise.all([
      cursor.exec(),
      Product.countDocuments(mongoQuery),
    ]);

    const finalResults = sort === 'relevance' || !sort ? rankProducts(results, q) : results;

    return {
      results: finalResults,
      pagination: buildOffsetMeta(page, safeLimit, totalResults),
    };
  }, 30);

  // getOrSetCached wraps the real payload as { data, source } so callers can
  // show where a response came from (local LRU / shared Redis / freshly
  // computed). Unwrap here so callers of searchOffset get the same flat
  // { results, pagination } shape as searchCursor, plus cacheSource for the UI.
  return { ...cached.data, cacheSource: cached.source };
}

/** Cursor pagination path: query on _id > cursor, indexed, O(1) regardless of depth. */
async function searchCursor(params) {
  const { q, after, limit, category, minPrice, maxPrice, minRating } = params;
  const mongoQuery = buildMongoQuery({ q, category, minPrice, maxPrice, minRating });

  if (after) {
    const decodedId = decodeCursor(after);
    if (decodedId) {
      mongoQuery._id = { $gt: decodedId };
    }
  }

  const safeLimit = Math.max(1, Math.min(50, limit || 20));
  const results = await Product.find(mongoQuery)
    .sort({ _id: 1 })
    .limit(safeLimit + 1) // fetch one extra to know if there's a next page
    .exec();

  const hasNextPage = results.length > safeLimit;
  const page = hasNextPage ? results.slice(0, safeLimit) : results;
  const nextCursor = page.length > 0 ? encodeCursor(page[page.length - 1]._id) : null;

  return {
    results: page,
    pagination: { limit: safeLimit, hasNextPage, nextCursor },
    cacheSource: 'live', // cursor path always hits Mongo directly (not cached)
  };
}

module.exports = { searchOffset, searchCursor, buildMongoQuery, buildSort };
