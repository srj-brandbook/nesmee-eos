const ApiError = require("../utils/ApiError");

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      { abortEarly: false, stripUnknown: true, allowUnknown: true }
    );

    if (error) {
      const fields = {};
      error.details.forEach((detail) => {
        const key = detail.path.filter((part) => !["body", "query", "params"].includes(part)).join(".") || detail.path.join(".");
        fields[key] = detail.message.replace(/["]/g, "");
      });
      return next(ApiError.validation(fields));
    }

    if (value.body) req.body = value.body;
    if (value.query) Object.assign(req.query, value.query);
    if (value.params) req.params = value.params;
    return next();
  };
}

module.exports = validate;
