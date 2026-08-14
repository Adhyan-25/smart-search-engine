const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../services/authService');
const { OAuth2Client } = require('google-auth-library');
const { config } = require('../config');
const { ApiError } = require('../middleware/errorHandler');

let googleClient;

function getGoogleClient() {
  if (!config.google.clientId) {
    throw new ApiError(500, 'Google OAuth is not configured on the server');
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(config.google.clientId);
  }
  return googleClient;
}

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
    if (!user) {
      return next(new ApiError(401, 'Invalid email or password'));
    }
    if (!user.passwordHash) {
      return next(new ApiError(401, 'This account uses Google sign-in. Continue with Google to access it.'));
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      return next(new ApiError(401, 'Invalid email or password'));
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return next(new ApiError(400, 'Google idToken is required'));
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      return next(new ApiError(401, 'Invalid Google token payload'));
    }
    if (!payload.email_verified) {
      return next(new ApiError(401, 'Google account email is not verified'));
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        googleId: payload.sub,
      });
    } else if (user.googleId && user.googleId !== payload.sub) {
      return next(new ApiError(409, 'This email is already linked to a different Google account'));
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
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

module.exports = { register, login, googleAuth, me };
