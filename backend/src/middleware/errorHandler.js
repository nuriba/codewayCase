import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: { code: 'not_found', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'bad_request', message: 'Invalid JSON body' },
    });
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Internal server error' },
  });
}
