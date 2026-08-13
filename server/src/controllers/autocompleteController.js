const { getSuggestions } = require('../services/autocompleteService');

async function autocomplete(req, res, next) {
  try {
    const { q, limit } = req.validatedQuery;
    const startMs = Date.now();
    const suggestions = await getSuggestions(q, limit);
    const responseTimeMs = Date.now() - startMs;
    res.json({ query: q, suggestions, _meta: { responseTimeMs } });
  } catch (err) {
    next(err);
  }
}

module.exports = { autocomplete };
