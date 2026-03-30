const express = require("express");
const { prisma } = require("../lib/prisma");
const { getInventorySnapshot } = require("../services/dispatch.service");
const { getIO } = require("../lib/socket");
const { buildWalletSummary } = require("../lib/wallet-summary");

const router = express.Router();

router.get("/inventory", async (_req, res) => {
  try {
    const inventory = await getInventorySnapshot();
    return res.status(200).json({
      ok: true,
      inventory,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo consultar inventario",
    });
  }
});

router.get("/wallet/:nfcUid", async (req, res) => {
  try {
    const nfcUid = String(req.params.nfcUid || "").trim();
    const wallet = await prisma.prepaidWallet.findUnique({
      where: { nfcUid },
      include: { items: true },
    });

    if (!wallet) {
      return res.status(404).json({
        ok: false,
        error: "Billetera no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      wallet: buildWalletSummary(wallet),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo consultar la billetera",
    });
  }
});

router.get("/admin/summary", async (_req, res) => {
  try {
    const [inventory, wallets, points, logs] = await Promise.all([
      getInventorySnapshot(),
      prisma.prepaidWallet.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.dispatchPoint.findMany({
        orderBy: { pointId: "asc" },
      }),
      prisma.dispatchLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
    ]);

    const walletSummaries = wallets.map(buildWalletSummary);
    const totals = walletSummaries.reduce(
      (acc, wallet) => ({
        prepaidAmount: acc.prepaidAmount + wallet.totals.prepaidAmount,
        consumedAmount: acc.consumedAmount + wallet.totals.consumedAmount,
        remainingAmount: acc.remainingAmount + wallet.totals.remainingAmount,
      }),
      { prepaidAmount: 0, consumedAmount: 0, remainingAmount: 0 },
    );

    const pointStatsMap = new Map();
    for (const point of points) {
      pointStatsMap.set(point.pointId, {
        pointId: point.pointId,
        name: point.name,
        isActive: point.isActive,
        lastHeartbeat: point.lastHeartbeat,
        dispatchCount: 0,
        consumedUnits: 0,
        lastDispatchAt: null,
      });
    }
    for (const log of logs) {
      const current = pointStatsMap.get(log.pointId) || {
        pointId: log.pointId,
        name: log.pointId,
        isActive: true,
        lastHeartbeat: null,
        dispatchCount: 0,
        consumedUnits: 0,
        lastDispatchAt: null,
      };
      current.dispatchCount += 1;
      current.consumedUnits += Number(log.quantity) || 0;
      if (!current.lastDispatchAt || new Date(log.createdAt) > new Date(current.lastDispatchAt)) {
        current.lastDispatchAt = log.createdAt;
      }
      pointStatsMap.set(log.pointId, current);
    }

    return res.status(200).json({
      ok: true,
      inventory,
      wallets: walletSummaries,
      points: Array.from(pointStatsMap.values()),
      totals,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo cargar resumen admin",
    });
  }
});

router.post("/admin/points", async (req, res) => {
  try {
    const pointId = String(req.body?.pointId || "").trim();
    const name = String(req.body?.name || pointId).trim();
    if (!pointId) {
      return res.status(400).json({ ok: false, error: "pointId es obligatorio" });
    }

    const point = await prisma.dispatchPoint.upsert({
      where: { pointId },
      update: { name },
      create: {
        pointId,
        name: name || pointId,
        isActive: true,
      },
    });

    return res.status(201).json({ ok: true, point });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo crear/actualizar punto",
    });
  }
});

router.patch("/admin/points/:pointId", async (req, res) => {
  try {
    const pointId = String(req.params.pointId || "").trim();
    const isActive = Boolean(req.body?.isActive);
    const point = await prisma.dispatchPoint.update({
      where: { pointId },
      data: { isActive },
    });

    return res.status(200).json({ ok: true, point });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo actualizar punto",
    });
  }
});

router.post("/reset-demo", async (_req, res) => {
  try {
    await prisma.$transaction([
      prisma.dispatchLog.deleteMany(),
      prisma.walletItem.deleteMany(),
      prisma.prepaidWallet.deleteMany(),
    ]);

    const io = getIO();
    if (io) {
      io.emit("update-inventory", { sku: "ALL", globalStock: 0 });
    }

    return res.status(200).json({
      ok: true,
      message: "Datos demo reiniciados",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo resetear la demo",
    });
  }
});

router.post("/mock-sale", async (req, res) => {
  try {
    const nfcUid = String(req.body?.nfcUid || "BRAZALETE_TEST_01").trim();
    const externalId = req.body?.externalId || `MOCK_SALE_${nfcUid}`;
    const customerName = String(req.body?.customerName || "Cliente de Prueba").trim();
    const pointId = String(req.body?.pointId || "POINT_01").trim();

    const shouldRecharge = Boolean(req.body?.recharge);
    const inputItems = Array.isArray(req.body?.items) && req.body.items.length > 0
      ? req.body.items
      : [
          {
            productName: "Cerveza 355ml",
            sku: "CERVEZA_355",
            unitPrice: 3.5,
            totalQuantity: 1,
          },
        ];

    const wallet = await prisma.$transaction(async (tx) => {
      const existingWallet = await tx.prepaidWallet.findUnique({
        where: { nfcUid },
        include: { items: true },
      });

      if (!existingWallet) {
        return tx.prepaidWallet.create({
          data: {
            nfcUid,
            externalId,
            customerName,
            isActive: true,
            items: {
              create: inputItems.map((item) => ({
                productName: item.productName,
                sku: item.sku,
                unitPrice: Number(item.unitPrice) || 3.5,
                totalQuantity: Number(item.totalQuantity) || 1,
              })),
            },
          },
          include: { items: true },
        });
      }

      if (shouldRecharge) {
        for (const item of inputItems) {
          const existingItem = existingWallet.items.find((w) => w.sku === item.sku);
          if (existingItem) {
            await tx.walletItem.update({
              where: { id: existingItem.id },
              data: {
                unitPrice: Number(item.unitPrice) || existingItem.unitPrice,
                totalQuantity: { increment: Number(item.totalQuantity) || 1 },
              },
            });
          } else {
            await tx.walletItem.create({
              data: {
                walletId: existingWallet.id,
                productName: item.productName,
                sku: item.sku,
                unitPrice: Number(item.unitPrice) || 3.5,
                totalQuantity: Number(item.totalQuantity) || 1,
              },
            });
          }
        }
      }

      return tx.prepaidWallet.findUnique({
        where: { id: existingWallet.id },
        include: { items: true },
      });
    });

    const io = getIO();
    if (io) {
      const inventory = await getInventorySnapshot();
      for (const item of inventory) {
        io.emit("update-inventory", item);
      }
    }

    return res.status(201).json({
      ok: true,
      message: shouldRecharge ? "Billetera recargada" : "Billetera consultada/creada",
      pointId,
      wallet: buildWalletSummary(wallet),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "No se pudo crear la venta mock",
    });
  }
});

module.exports = { internalRouter: router };
