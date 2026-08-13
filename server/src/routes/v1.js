const express = require('express');
const { search } = require('../controllers/searchController');
const { autocomplete } = require('../controllers/autocompleteController');
const { health } = require('../controllers/healthController');
const { metrics, analytics } = require('../controllers/metricsController');
const authRoutes = require('./authRoutes');
const { validateQuery, searchQuerySchema, autocompleteQuerySchema } = require('../middleware/validate');
const { rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);
router.get('/search', rateLimitMiddleware(), validateQuery(searchQuerySchema), search);
router.get('/autocomplete', rateLimitMiddleware(), validateQuery(autocompleteQuerySchema), autocomplete);
router.get('/health', health);
router.get('/metrics', metrics);
router.get('/analytics', analytics);

module.exports = router;
