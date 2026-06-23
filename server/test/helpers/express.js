import { vi } from 'vitest';

// Minimal Express req/res doubles for testing controllers in isolation (no HTTP
// server, no routing). res methods are chainable spies so a controller's
// `res.status(400).json({...})` records both the code and the payload.

export const makeReq = ({ body = {}, params = {}, query = {}, userId, username, headers = {}, cookies = {} } = {}) => ({
  body,
  params,
  query,
  userId,
  username,
  headers,
  cookies,
});

export const makeRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.cookies = {};
  res.clearedCookies = [];
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((payload) => { res.body = payload; return res; });
  res.cookie = vi.fn((name, value, opts) => { res.cookies[name] = { value, opts }; return res; });
  res.clearCookie = vi.fn((name, opts) => { res.clearedCookies.push({ name, opts }); return res; });
  res.setHeader = vi.fn();
  return res;
};
