require("dotenv").config();
const express = require("express");
const { internalRouter } = require("./api/internal.routes");
const { dispatchRouter } = require("./api/dispatch.routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-internal-api-key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/v1/internal", internalRouter);
app.use("/api/v1/dispatch", dispatchRouter);
app.use(errorHandler);

module.exports = { app };
