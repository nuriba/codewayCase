import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still run timingSafeEqual on equal-length buffers to avoid early-exit timing leak.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export function authApiToken(req, _res, next) {
  const header = req.headers.authorization;
  let presented = null;
  if (header?.startsWith('Bearer ')) {
    presented = header.slice('Bearer '.length).trim();
  } else if (req.headers['x-api-token']) {
    presented = String(req.headers['x-api-token']).trim();
  }

  if (!presented) {
    return next(Errors.unauthorized('Missing API token'));
  }

  if (!safeEqual(presented, env.MOBILE_API_TOKEN)) {
    return next(Errors.unauthorized('Invalid API token'));
  }

  next();
}
