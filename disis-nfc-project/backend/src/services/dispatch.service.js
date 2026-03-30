const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/errors");

/**
 * Despacha N unidades de un SKU para un brazalete NFC,
 * garantizando consistencia en una sola transaccion.
 */
async function dispatchItem({ nfcUid, sku, pointId, quantity = 1 }) {
  if (!nfcUid || !sku || !pointId || !quantity) {
    throw new AppError("nfcUid, sku, pointId y quantity son obligatorios", 400);
  }

  const runTransaction = () => prisma.$transaction(async (tx) => {
    const wallet = await tx.prepaidWallet.findFirst({
      where: {
        nfcUid,
        isActive: true,
      },
      select: { id: true },
    });

    if (!wallet) {
      throw new AppError("Billetera no encontrada o inactiva", 404);
    }

    const item = await tx.walletItem.findFirst({
      where: {
        walletId: wallet.id,
        sku,
      },
      select: {
        id: true,
        servedQuantity: true,
        totalQuantity: true,
      },
    });

    if (!item) {
      throw new AppError("Producto no encontrado en la billetera", 404);
    }

    const availableBefore = Math.max(0, item.totalQuantity - item.servedQuantity);
    if (availableBefore < quantity) {
      throw new AppError("Saldo insuficiente", 409);
    }

    const updateResult = await tx.walletItem.updateMany({
      where: {
        id: item.id,
        servedQuantity: { lte: item.totalQuantity - quantity },
      },
      data: {
        servedQuantity: { increment: quantity },
      },
    });

    if (updateResult.count === 0) {
      throw new AppError("Saldo insuficiente (condicion de carrera detectada)", 409);
    }

    await tx.dispatchLog.create({
      data: {
        walletId: wallet.id,
        pointId,
        productSku: sku,
        quantity,
      },
    });

    const updatedItem = await tx.walletItem.findUnique({
      where: { id: item.id },
    });

    const sameSkuItems = await tx.walletItem.findMany({
      where: { sku },
      select: {
        totalQuantity: true,
        servedQuantity: true,
      },
    });

    const globalStock = sameSkuItems.reduce(
      (acc, current) => acc + Math.max(0, current.totalQuantity - current.servedQuantity),
      0,
    );

    return {
      item: updatedItem,
      sku,
      globalStock,
      remainingForWallet: Math.max(0, updatedItem.totalQuantity - updatedItem.servedQuantity),
    };
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await runTransaction();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const isTransient =
        error?.code === "P2034"
        || error?.code === "P2028"
        || error?.name?.startsWith("PrismaClient")
        || String(error?.message || "").toLowerCase().includes("database is locked");

      if (!isTransient || attempt === 3) {
        if (isTransient) {
          throw new AppError("Conflicto de concurrencia. Intenta de nuevo.", 409);
        }
        throw error;
      }
    }
  }
}

async function getInventorySnapshot() {
  const items = await prisma.walletItem.findMany({
    select: {
      sku: true,
      totalQuantity: true,
      servedQuantity: true,
    },
  });

  const grouped = new Map();
  for (const row of items) {
    const available = Math.max(0, row.totalQuantity - row.servedQuantity);
    grouped.set(row.sku, (grouped.get(row.sku) || 0) + available);
  }

  return Array.from(grouped.entries()).map(([sku, globalStock]) => ({
    sku,
    globalStock,
  }));
}

module.exports = { dispatchItem, getInventorySnapshot };
