'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs express-validator checks and returns 400 if any fail.
 * Usage: add this after your validation chain middleware.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', errors: errors.array() });
  }
  next();
};

module.exports = validate;
