import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/db/dynamodb.js', async () => {
  const { memoryDb } = await import('../helpers/memoryDb.js');
  return memoryDb;
});

import app from '../../src/app.js';

describe('system routes', () => {
  it('GET /api/health reports ok with a timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('404s an unknown route', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
