import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/usersRepo.js', () => ({
  getByEmail: vi.fn(), getByUsername: vi.fn(), create: vi.fn(),
  updateLeetcodeUsername: vi.fn(), updateSyncPreference: vi.fn(),
}));
vi.mock('../../../src/utils/generateToken.js', () => ({ generateToken: vi.fn(() => 'signed.jwt') }));
vi.mock('bcryptjs', () => ({
  default: { hashSync: vi.fn(() => 'hashed'), compareSync: vi.fn() },
}));

import bcrypt from 'bcryptjs';
import * as usersRepo from '../../../src/repositories/usersRepo.js';
import { generateToken } from '../../../src/utils/generateToken.js';
import * as auth from '../../../src/controllers/authController.js';
import { makeReq, makeRes } from '../../helpers/express.js';

beforeEach(() => vi.clearAllMocks());

describe('register', () => {
  it('400s when fields are missing', async () => {
    const res = makeRes();
    await auth.register(makeReq({ body: { email: 'a@b.com' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400s when the email already exists', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com' });
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'a', email: 'a@b.com', password: 'p' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'User already exists' });
    expect(usersRepo.create).not.toHaveBeenCalled();
  });

  it('400s when the username already exists', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    usersRepo.getByUsername.mockResolvedValue({ username: 'a' });
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'a', email: 'a@b.com', password: 'p' } }), res);
    expect(res.statusCode).toBe(400);
    expect(usersRepo.create).not.toHaveBeenCalled();
  });

  it('creates the user, hashes the password, issues a token', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    usersRepo.getByUsername.mockResolvedValue(null);
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'alice', email: 'a@b.com', password: 'secret' } }), res);

    expect(bcrypt.hashSync).toHaveBeenCalledWith('secret', 10);
    expect(usersRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', username: 'alice', passwordHash: 'hashed' }));
    expect(generateToken).toHaveBeenCalled();
    expect(res.body).toEqual({ token: 'signed.jwt', user: { id: 'a@b.com', username: 'alice', email: 'a@b.com' } });
  });

  it('500s when the repository throws', async () => {
    usersRepo.getByEmail.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await auth.register(makeReq({ body: { username: 'a', email: 'a@b.com', password: 'p' } }), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('login', () => {
  it('400s without email/password', async () => {
    const res = makeRes();
    await auth.login(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('401s for an unknown user', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    const res = makeRes();
    await auth.login(makeReq({ body: { email: 'a@b.com', password: 'p' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('401s on a wrong password', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', passwordHash: 'hashed' });
    bcrypt.compareSync.mockReturnValue(false);
    const res = makeRes();
    await auth.login(makeReq({ body: { email: 'a@b.com', password: 'wrong' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('issues a token and returns the profile on success', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', username: 'alice', passwordHash: 'hashed', syncPreference: 'end_of_day' });
    bcrypt.compareSync.mockReturnValue(true);
    const res = makeRes();
    await auth.login(makeReq({ body: { email: 'a@b.com', password: 'secret' } }), res);

    expect(res.body.token).toBe('signed.jwt');
    expect(res.body.user).toMatchObject({ id: 'a@b.com', username: 'alice', syncPreference: 'end_of_day' });
  });
});

describe('logout', () => {
  it('clears the session cookie', () => {
    const res = makeRes();
    auth.logout(makeReq(), res);
    expect(res.clearedCookies[0].name).toBe('token');
    expect(res.body).toEqual({ success: true });
  });
});

describe('getMe', () => {
  it('404s when the user is gone', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    const res = makeRes();
    await auth.getMe(makeReq({ userId: 'a@b.com' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('defaults syncPreference to manual', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com', username: 'alice', createdAt: 't' });
    const res = makeRes();
    await auth.getMe(makeReq({ userId: 'a@b.com' }), res);
    expect(res.body).toMatchObject({ id: 'a@b.com', syncPreference: 'manual' });
  });
});

describe('updateSyncPreference', () => {
  it('400s on an invalid preference (e.g. the removed every_12h)', async () => {
    const res = makeRes();
    await auth.updateSyncPreference(makeReq({ userId: 'a@b.com', body: { syncPreference: 'every_12h' } }), res);
    expect(res.statusCode).toBe(400);
    expect(usersRepo.updateSyncPreference).not.toHaveBeenCalled();
  });

  it('404s when the user is missing', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    const res = makeRes();
    await auth.updateSyncPreference(makeReq({ userId: 'a@b.com', body: { syncPreference: 'end_of_day' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('persists a valid preference', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com' });
    const res = makeRes();
    await auth.updateSyncPreference(makeReq({ userId: 'a@b.com', body: { syncPreference: 'end_of_day' } }), res);
    expect(usersRepo.updateSyncPreference).toHaveBeenCalledWith('a@b.com', 'end_of_day');
    expect(res.body).toEqual({ success: true, syncPreference: 'end_of_day' });
  });
});

describe('updateLeetcodeUsername', () => {
  it('404s when the user is missing', async () => {
    usersRepo.getByEmail.mockResolvedValue(null);
    const res = makeRes();
    await auth.updateLeetcodeUsername(makeReq({ userId: 'a@b.com', body: { leetcodeUsername: 'x' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updates the linked username', async () => {
    usersRepo.getByEmail.mockResolvedValue({ email: 'a@b.com' });
    const res = makeRes();
    await auth.updateLeetcodeUsername(makeReq({ userId: 'a@b.com', body: { leetcodeUsername: 'leetking' } }), res);
    expect(usersRepo.updateLeetcodeUsername).toHaveBeenCalledWith('a@b.com', 'leetking');
    expect(res.body).toEqual({ success: true, leetcodeUsername: 'leetking' });
  });
});
