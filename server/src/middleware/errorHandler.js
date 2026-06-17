'use strict';

/**
 * Global error handler middleware.
 * Must be the last middleware added to the app.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err.message);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists', detail: err.detail });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Referenced record does not exist', detail: err.detail });
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    return res.status(400).json({ error: 'Required field is missing', detail: err.detail });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
