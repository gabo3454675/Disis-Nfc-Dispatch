function buildWalletSummary(wallet) {
  const items = (wallet?.items || []).map((item) => {
    const remainingQuantity = Math.max(0, item.totalQuantity - item.servedQuantity);
    const prepaidAmount = item.totalQuantity * item.unitPrice;
    const consumedAmount = item.servedQuantity * item.unitPrice;
    const remainingAmount = remainingQuantity * item.unitPrice;

    return {
      id: item.id,
      sku: item.sku,
      productName: item.productName,
      unitPrice: item.unitPrice,
      totalQuantity: item.totalQuantity,
      servedQuantity: item.servedQuantity,
      remainingQuantity,
      prepaidAmount,
      consumedAmount,
      remainingAmount,
    };
  });

  const totals = items.reduce(
    (acc, item) => ({
      prepaidAmount: acc.prepaidAmount + item.prepaidAmount,
      consumedAmount: acc.consumedAmount + item.consumedAmount,
      remainingAmount: acc.remainingAmount + item.remainingAmount,
      prepaidUnits: acc.prepaidUnits + item.totalQuantity,
      consumedUnits: acc.consumedUnits + item.servedQuantity,
      remainingUnits: acc.remainingUnits + item.remainingQuantity,
    }),
    {
      prepaidAmount: 0,
      consumedAmount: 0,
      remainingAmount: 0,
      prepaidUnits: 0,
      consumedUnits: 0,
      remainingUnits: 0,
    },
  );

  return {
    id: wallet.id,
    nfcUid: wallet.nfcUid,
    customerName: wallet.customerName || "Cliente",
    isActive: wallet.isActive,
    createdAt: wallet.createdAt,
    items,
    totals,
  };
}

module.exports = { buildWalletSummary };
