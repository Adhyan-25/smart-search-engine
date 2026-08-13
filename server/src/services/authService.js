const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function generateToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { hashPassword, comparePassword, generateToken, verifyToken };
