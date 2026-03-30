require("dotenv").config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const DEMO_API_KEY = process.env.INTERNAL_API_KEY || "";
const N = 100;
const SKU = "CERVEZA_355";
const NFC_UID = "BRAZALETE_TEST_01";

function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (DEMO_API_KEY) {
    headers["x-internal-api-key"] = DEMO_API_KEY;
    headers["x-bypass-rate-limit"] = "1";
  }
  return headers;
}

async function setupMockData() {
  await fetch(`${API_BASE_URL}/api/v1/internal/reset-demo`, {
    method: "POST",
    headers: getHeaders(),
  });

  await fetch(`${API_BASE_URL}/api/v1/internal/mock-sale`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      nfcUid: NFC_UID,
      customerName: "Cliente Concurrencia",
      items: [{ productName: "Cerveza 355ml", sku: SKU, totalQuantity: 10 }],
    }),
  });
}

async function run() {
  await setupMockData();

  const jobs = Array.from({ length: N }, () =>
    fetch(`${API_BASE_URL}/api/v1/dispatch`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        nfcUid: NFC_UID,
        sku: SKU,
        pointId: "POINT_STRESS",
        quantity: 1,
      }),
    }).then(async (response) => ({
      status: response.status,
      body: await response.json().catch(() => ({})),
    })),
  );

  const results = await Promise.all(jobs);
  const success = results.filter((r) => r.status === 200).length;
  const conflict = results.filter((r) => r.status === 409).length;
  const otherErrors = results.filter((r) => ![200, 409].includes(r.status)).length;
  const statusHistogram = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const first500 = results.find((r) => r.status === 500);

  const snapshotResponse = await fetch(`${API_BASE_URL}/api/v1/internal/inventory`);
  const snapshotJson = await snapshotResponse.json();
  const item = (snapshotJson.inventory || []).find((i) => i.sku === SKU);
  const remaining = item ? item.globalStock : 0;
  const served = 10 - remaining;

  // eslint-disable-next-line no-console
  console.log({
    totalRequests: N,
    success,
    conflict,
    otherErrors,
    statusHistogram,
    first500,
    served,
    remaining,
    ruleOk: served <= 10,
  });
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error en prueba de concurrencia:", error);
  process.exit(1);
});
