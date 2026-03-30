function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Error interno del servidor" : err.message;

  return res.status(statusCode).json({
    ok: false,
    error: message,
  });
}

module.exports = { errorHandler };
