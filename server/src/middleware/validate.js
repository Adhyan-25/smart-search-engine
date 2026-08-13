const Joi = require('joi');
const { ApiError } = require('./errorHandler');
const { config } = require('../config');

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().max(200).allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(config.pagination.maxLimit).default(config.pagination.defaultLimit),
  after: Joi.string().max(500).optional(),
  category: Joi.string().trim().max(100).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  sort: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'rating', 'popularity', 'newest').optional(),
});

const autocompleteQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(20).default(10),
});

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new ApiError(400, 'Invalid query parameters', error.details.map((d) => d.message)));
    }
    req.validatedQuery = value;
    next();
  };
}

module.exports = { validateQuery, searchQuerySchema, autocompleteQuerySchema };
