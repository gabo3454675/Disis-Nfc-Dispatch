const express = require("express");
const rateLimit = require("express-rate-limit");
const { prisma } = require("../lib/prisma");
const { dispatchItem } = require("../services/dispatch.service");
const { getIO } = require("../lib/socket");
const { validateBody } = require("../middlewares/validate");
const { dispatchSchema } = require("../schemas/dispatch.schema");
const { apiKeyAuth } = require("../middlewares/apiKeyAuth");
const { AppError } = require("../lib/errors");

const router = express.Router();
const dispatchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.header("x-bypass-rate-limit") === "1"
    && req.header("x-internal-api-key") === process.env.INTERNAL_API_KEY,
});

router.post("/", dispatchLimiter, apiKeyAuth, validateBody(dispatchSchema), async (req, res, next) => {
  try {
    const { nfcUid, sku, pointId, quantity } = req.body;
    const existingPoint = await prisma.dispatchPoint.findUnique({
      where: { pointId },
    });

    if (existingPoint && !existingPoint.isActive) {
      throw new AppError("Punto de despacho inactivo", 409);
    }

    const result = await dispatchItem({ nfcUid, sku, pointId, quantity });
    await prisma.dispatchPoint.upsert({
      where: { pointId },
      update: {
        lastHeartbeat: new Date(),
      },
      create: {
        pointId,
        name: pointId,
        isActive: true,
        lastHeartbeat: new Date(),
      },
    });

    const io = getIO();
    if (io) {
      io.emit("update-inventory", {
        sku: result.sku,
        globalStock: result.globalStock,
      });
    }

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { dispatchRouter: router };
