import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Run the real Express app + controllers + repositories against an in-memory
// table. Only the AWS seam (dynamodb.js) is faked, so routing, middleware,
// validation and JWT issuance are all genuinely exercised end-to-end.
vi.mock('../../src/db/dynamodb.js', async () => {
  const { memoryDb } = await import('../helpers/memoryDb.js');
  return memoryDb;
});

import app from '../../src/app.js';
import { resetMemoryDb } from '../helpers/memoryDb.js';

beforeEach(() => resetMemoryDb());

const register = (over = {}) =>
  request(app).post('/api/auth/register').send({ username: 'alice', email: 'a@b.com', password: 'secret', ...over });

describe('auth routes', () => {
  it('registers a new user and returns a token + profile', async () => {
    const res = await register();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ id: 'a@b.com', username: 'alice', email: 'a@b.com' });
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
  });

  it('rejects a duplicate email', async () => {
    await register();
    const res = await register({ username: 'bob' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and 401s on a wrong password', async () => {
    await register();

    const ok = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'secret' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'nope' });
    expect(bad.status).toBe(401);
  });

  it('guards /me and returns the profile for a valid token', async () => {
    const { body } = await register();

    const unauth = await request(app).get('/api/auth/me');
    expect(unauth.status).toBe(401);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: 'a@b.com', username: 'alice', syncPreference: 'manual' });
  });

  it('logs out (clears the cookie)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
