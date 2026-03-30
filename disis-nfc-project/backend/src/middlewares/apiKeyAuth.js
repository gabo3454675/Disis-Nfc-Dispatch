const { AppError } = require("../lib/errors");

function apiKeyAuth(req, _res, next) {
  const expectedApiKey = process.env.INTERNAL_API_KEY;
  if (!expectedApiKey) {
    return next();
  }

  const providedApiKey = req.header("x-internal-api-key");
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return next(new AppError("No autorizado", 401));
  }

  return next();
}

module.exports = { apiKeyAuth };
