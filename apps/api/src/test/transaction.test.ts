import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { testAuth, TEST_USER_ID } from "./test-auth.js";
import { pool } from "../config/db.js";

const app = createApp(testAuth);

const transactionPayload = {
  type: "expense",
  amount: 50000,
  describe: "Idempotency test",
};

let walletId: string;

async function cleanUpTestData() {
  await pool.query(
    `
            DELETE FROM idempotency_keys WHERE user_id = $1
        `,
    [TEST_USER_ID],
  );

  await pool.query(
    `
            DELETE FROM transactions
            WHERE wallet_id IN (
                SELECT id FROM wallets WHERE user_id = $1
            )
        `,
    [TEST_USER_ID],
  );

  await pool.query(
    `
        DELETE FROM wallets WHERE user_id = $1
    `,
    [TEST_USER_ID],
  );
}

beforeAll(async () => {
  const result = await pool.query(
    `
            SELECT id
            FROM neon_auth."user"
            WHERE id = $1
        `,
    [TEST_USER_ID],
  );

  if (result.rowCount === 0) {
    throw new Error("Test user doesn't exist");
  }
});

beforeEach(async () => {
  await cleanUpTestData();

  const response = await request(app).post("/api/wallets").send({
    name: "Idempotency Test Wallet",
    type: "cash",
    initial_balance: 100000,
  });

  expect(response.status).toBe(201);

  walletId = response.body.data.id;
});

afterAll(async () => {
  try {
    await cleanUpTestData();
  } finally {
    await pool.end();
  }
});

async function countTransaction() {
  const result = await pool.query(
    `
            SELECT COUNT(*)::int AS count
            FROM transactions t
            JOIN wallets w ON w.id = t.wallet_id
            WHERE w.user_id = $1
        `,
    [TEST_USER_ID],
  );

  return result.rows[0].count as number;
}

function createTransactionRequest(key: string, payload = transactionPayload) {
  return request(app)
    .post("/api/transactions")
    .set("Idempotency-Key", key)
    .send({
      ...payload,
      wallet_id: walletId,
    });
}

describe("POST /api/transactions idempotency", () => {
  it("should replay the original response for the same key and payload", async () => {
    const firstResponse = await createTransactionRequest("same-key-001");
    const secondResponse = await createTransactionRequest("same-key-001");

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstResponse.body.data.id).toBe(secondResponse.body.data.id);
    expect(firstResponse.headers["idempotency-replayed"]).toBe("false");
    expect(secondResponse.headers["idempotency-replayed"]).toBe("true");
    expect(await countTransaction()).toBe(1);
  });
});
