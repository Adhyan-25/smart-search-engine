const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');

async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || password.length < 8) {
      return next(new ApiError(400, 'Email and a password of at least 8 characters are required'));
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return next(new ApiError(409, 'An account with this email already exists'));
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({ email: normalizedEmail, passwordHash });
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required'));
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return next(new ApiError(401, 'Invalid email or password'));
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
