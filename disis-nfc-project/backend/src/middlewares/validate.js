const { AppError } = require("../lib/errors");

function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return next(new AppError(`Payload invalido: ${issue.message}`, 400));
    }

    req.body = parsed.data;
    return next();
  };
}

module.exports = { validateBody };
