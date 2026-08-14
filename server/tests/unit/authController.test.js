process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

const mockVerifyIdToken = jest.fn();

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/services/authService', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const User = require('../../src/models/User');
const { comparePassword, generateToken } = require('../../src/services/authService');
const { login, googleAuth } = require('../../src/controllers/authController');

describe('authController', () => {
  const next = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a user on first Google signup', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-id',
        email: 'new-user@example.com',
        email_verified: true,
      }),
    });
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'u1', email: 'new-user@example.com', role: 'user' });
    generateToken.mockReturnValue('signed-jwt');

    await googleAuth({ body: { idToken: 'valid-token' } }, res, next);

    expect(User.create).toHaveBeenCalledWith({
      email: 'new-user@example.com',
      googleId: 'google-user-id',
    });
    expect(res.json).toHaveBeenCalledWith({
      token: 'signed-jwt',
      user: { id: 'u1', email: 'new-user@example.com', role: 'user' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('links Google id to an existing email account', async () => {
    const save = jest.fn();
    const existingUser = {
      _id: 'u2',
      email: 'existing@example.com',
      role: 'user',
      googleId: null,
      save,
    };

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-existing-id',
        email: 'existing@example.com',
        email_verified: true,
      }),
    });
    User.findOne.mockResolvedValue(existingUser);
    generateToken.mockReturnValue('signed-jwt');

    await googleAuth({ body: { idToken: 'valid-token' } }, res, next);

    expect(existingUser.googleId).toBe('google-existing-id');
    expect(save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      token: 'signed-jwt',
      user: { id: 'u2', email: 'existing@example.com', role: 'user' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects password login for Google-only account', async () => {
    User.findOne.mockResolvedValue({
      email: 'oauth@example.com',
      passwordHash: null,
    });
    comparePassword.mockResolvedValue(false);

    await login({ body: { email: 'oauth@example.com', password: 'irrelevant' } }, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      message: expect.stringContaining('Google sign-in'),
    }));
  });
});
