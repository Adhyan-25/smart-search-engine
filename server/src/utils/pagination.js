/**
 * Offset pagination (skip/limit) - simple, but skip(N) gets linearly more
 * expensive as N grows because MongoDB still has to walk past N documents.
 */
function buildOffsetPagination(page, limit) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  return { skip: (safePage - 1) * safeLimit, limit: safeLimit };
}

function buildOffsetMeta(page, limit, totalResults) {
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));
  return {
    page,
    limit,
    totalResults,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Cursor pagination - the cursor is the _id of the last document seen.
 * Query becomes `_id > cursor` (indexed), so performance stays constant
 * regardless of how deep into the result set you are, unlike skip(N).
 */
function encodeCursor(id) {
  return Buffer.from(String(id)).toString('base64');
}

function decodeCursor(cursor) {
  try {
    return Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { buildOffsetPagination, buildOffsetMeta, encodeCursor, decodeCursor };
