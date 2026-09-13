const ApiError = require('../utils/ApiError');

// Central error handler - keep this as the last middleware registered in app.js
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details || undefined,
    });
  }

  // Postgres unique_violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }

  // Postgres foreign_key_violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Related record not found.' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
