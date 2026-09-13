const ApiError = require('../utils/ApiError');

// Usage: validate(schemas.login)
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new ApiError(400, 'Validation failed', error.details.map((d) => d.message)));
    }
    req.body = value;
    next();
  };
}

module.exports = validate;
