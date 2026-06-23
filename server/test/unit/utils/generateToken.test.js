import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../../src/utils/generateToken.js';
import { TOKEN_COOKIE } from '../../../src/middleware/auth.js';
import { makeRes } from '../../helpers/express.js';

describe('generateToken', () => {
  it('signs a verifiable JWT carrying the identity claims', () => {
    const res = makeRes();
    const token = generateToken(res, { id: 'a@b.com', username: 'alice' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('a@b.com');
    expect(decoded.username).toBe('alice');
    expect(decoded.exp).toBeGreaterThan(decoded.iat); // has an expiry
  });

  it('sets the token as the HttpOnly session cookie', () => {
    const res = makeRes();
    const token = generateToken(res, { id: 'a@b.com', username: 'alice' });

    expect(res.cookie).toHaveBeenCalledOnce();
    expect(res.cookies[TOKEN_COOKIE].value).toBe(token);
    expect(res.cookies[TOKEN_COOKIE].opts.httpOnly).toBe(true);
  });
});
