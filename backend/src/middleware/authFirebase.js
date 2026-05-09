import { auth } from '../config/firebase.js';
import { Errors } from '../utils/errors.js';

export async function authFirebase(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw Errors.unauthorized('Missing bearer token');

    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch (err) {
    if (err?.code?.startsWith('auth/')) {
      next(Errors.unauthorized('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}
