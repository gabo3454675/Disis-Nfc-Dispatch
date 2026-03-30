const { z } = require("zod");

const dispatchSchema = z.object({
  nfcUid: z.string().trim().min(3).max(100),
  sku: z.string().trim().min(1).max(100),
  pointId: z.string().trim().min(1).max(50),
  quantity: z.number().int().positive().max(12).default(1),
});

module.exports = { dispatchSchema };
