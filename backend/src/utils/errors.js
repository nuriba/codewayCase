export class AppError extends Error {
  constructor(code, message, httpStatus, details = undefined) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (message, details) => new AppError('bad_request', message, 400, details),
  unauthorized: (message = 'Unauthorized') => new AppError('unauthorized', message, 401),
  forbidden: (message = 'Forbidden') => new AppError('forbidden', message, 403),
  notFound: (message = 'Not found') => new AppError('not_found', message, 404),
  conflict: (message, details) => new AppError('conflict', message, 409, details),
  tooManyRequests: (message = 'Too many requests') => new AppError('too_many_requests', message, 429),
  internal: (message = 'Internal server error') => new AppError('internal_error', message, 500),
};
