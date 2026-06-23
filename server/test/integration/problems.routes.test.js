import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/db/dynamodb.js', async () => {
  const { memoryDb } = await import('../helpers/memoryDb.js');
  return memoryDb;
});

import app from '../../src/app.js';
import { resetMemoryDb } from '../helpers/memoryDb.js';

let token;
beforeEach(async () => {
  resetMemoryDb();
  const res = await request(app).post('/api/auth/register').send({ username: 'alice', email: 'a@b.com', password: 'secret' });
  token = res.body.token;
});

const authed = (req) => req.set('Authorization', `Bearer ${token}`);

describe('problems routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(401);
  });

  it('adds, lists, and updates the status of a problem (full lifecycle)', async () => {
    // add #1 (Two Sum) from the bundled dataset
    const add = await authed(request(app).post('/api/problems')).send({ leetcode_number: 1 });
    expect(add.status).toBe(200);
    expect(add.body).toMatchObject({ id: 1, status: 'unsolved' });

    // it now shows up in the tracked list
    const list = await authed(request(app).get('/api/problems'));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: 1, status: 'unsolved' });

    // mark it solved
    const solved = await authed(request(app).post('/api/problems/1/status')).send({ status: 'solved' });
    expect(solved.status).toBe(200);
    expect(solved.body).toEqual({ solved: 1, status: 'solved' });

    // re-adding the same problem is rejected
    const dup = await authed(request(app).post('/api/problems')).send({ leetcode_number: 1 });
    expect(dup.status).toBe(400);
  });
});
