import axios from "axios";
import "dotenv/config";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

const NFC_UID = "BRAZALETE_STRESS_01";
const SKU = "CERVEZA_355";
const TOTAL_REQUESTS = 20;

function headers() {
  const out: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_API_KEY) {
    out["x-internal-api-key"] = INTERNAL_API_KEY;
    out["x-bypass-rate-limit"] = "1";
  }
  return out;
}

async function setup() {
  await axios.post(`${API_BASE_URL}/api/v1/internal/reset-demo`, {}, { headers: headers() });
  await axios.post(
    `${API_BASE_URL}/api/v1/internal/mock-sale`,
    {
      nfcUid: NFC_UID,
      customerName: "Stress User",
      items: [{ productName: "Cerveza 355ml", sku: SKU, totalQuantity: 1 }],
    },
    { headers: headers() },
  );
}

async function run() {
  await setup();

  const jobs = Array.from({ length: TOTAL_REQUESTS }, () =>
    axios
      .post(
        `${API_BASE_URL}/api/v1/dispatch`,
        {
          nfcUid: NFC_UID,
          sku: SKU,
          pointId: "POINT_STRESS",
          quantity: 1,
        },
        { headers: headers() },
      )
      .then(() => ({ ok: true, status: 200 }))
      .catch((error) => ({
        ok: false,
        status: error?.response?.status || 0,
        error: error?.response?.data?.error || error.message,
      })),
  );

  const results = await Promise.all(jobs);
  const success = results.filter((r) => r.status === 200).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const others = results.filter((r) => ![200, 409].includes(r.status));

  console.log({
    totalRequests: TOTAL_REQUESTS,
    success,
    conflicts,
    others: others.length,
    expected: "success=1 y conflicts=19",
    pass: success === 1 && conflicts === 19,
    sampleOther: others[0],
  });
}

run().catch((error) => {
  console.error("Stress test fallo:", error);
  process.exit(1);
});
