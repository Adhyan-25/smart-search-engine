const express = require('express');
const { register, login, googleAuth, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticate, me);

module.exports = router;
