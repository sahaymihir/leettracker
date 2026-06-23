import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { auth, TOKEN_COOKIE } from '../../../src/middleware/auth.js';
import { makeReq, makeRes } from '../../helpers/express.js';

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('auth middleware', () => {
  it('rejects a request with no token (401)', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token from the HttpOnly cookie', () => {
    const req = makeReq({ cookies: { [TOKEN_COOKIE]: sign({ id: 'a@b.com', username: 'alice' }) } });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('a@b.com');
    expect(req.username).toBe('alice');
  });

  it('falls back to a Bearer authorization header', () => {
    const req = makeReq({ headers: { authorization: `Bearer ${sign({ id: 'x@y.com', username: 'x' })}` } });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('x@y.com');
  });

  it('rejects a malformed/invalid token (401)', () => {
    const req = makeReq({ cookies: { [TOKEN_COOKIE]: 'not-a-jwt' } });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an expired token (401)', () => {
    const expired = jwt.sign({ id: 'a@b.com' }, process.env.JWT_SECRET, { expiresIn: -1 });
    const req = makeReq({ cookies: { [TOKEN_COOKIE]: expired } });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
