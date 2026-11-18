import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import {
  testAuth,
  TEST_USER_ID,
  createTestAuth,
  OTHER_USER_ID,
} from "./test-auth.js";
import { pool } from "../config/db.js";

const app = createApp(testAuth);
const otherUserApp = createApp(createTestAuth(OTHER_USER_ID));

const transactionPayload = {
  type: "expense",
  amount: 50000,
  description: "Idempotency test",
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

  if (!result.rowCount) {
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

async function getDefaultCategoryId(type: "income" | "expense") {
  const result = await pool.query(
    `
    SELECT id
    FROM categories
    WHERE user_id IS NULL AND type = $1
    LIMIT 1
  `,
    [type],
  );

  if (!result.rows[0]) {
    throw new Error(`Default ${type} category not found`);
  }

  return result.rows[0].id as string;
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

  it("should return 409 when the same key is used with a different payload", async () => {
    const firstResponse = await createTransactionRequest("same-key-002");
    const secondResponse = await createTransactionRequest("same-key-002", {
      ...transactionPayload,
      amount: 100000,
    });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(await countTransaction()).toBe(1);
  });

  it("should create separate transactions when different keys are used", async () => {
    const firstResponse = await createTransactionRequest("different-key-001");
    const secondResponse = await createTransactionRequest("different-key-002");

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstResponse.body.data.id).not.toBe(secondResponse.body.data.id);
    expect(await countTransaction()).toBe(2);
  });

  it("should reject requests without an Idempotency_Key header", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({ ...transactionPayload, wallet_id: walletId });

    expect(response.status).toBe(400);
    expect(await countTransaction()).toBe(0);
  });

  it("should handle simultaneous requests with the same key", async () => {
    const [firstResponse, secondResponse] = await Promise.all([
      createTransactionRequest("concurrent-key-001"),
      createTransactionRequest("concurrent-key-001"),
    ]);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(firstResponse.body.data.id).toBe(secondResponse.body.data.id);
    expect(await countTransaction()).toBe(1);
  });

  it("should return transaction created successfully", async () => {
    const response = await createTransactionRequest("key-001");

    expect(response.status).toBe(201);
    expect(response.body.data.wallet_id).toBe(walletId);
    expect(await countTransaction()).toBe(1);
  });

  it("should reject insufficient transaction amount with wallet balance", async () => {
    const response = await createTransactionRequest("key-001", {
      ...transactionPayload,
      amount: 200000,
    });

    expect(response.status).toBe(409);
    expect(await countTransaction()).toBe(0);
  });

  it("should allow expense equal to wallet balance", async () => {
    const response = await createTransactionRequest("exac-balance-001", {
      ...transactionPayload,
      amount: 100000,
    });

    expect(response.status).toBe(201);
    expect(await countTransaction()).toBe(1);
  });
});

describe("Transaction authorization", () => {
  it("should not expose another user's transactions", async () => {
    const created = await createTransactionRequest("auth-get-001");

    expect(created.status).toBe(201);

    const response = await request(otherUserApp).get("/api/transactions");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
    expect(response.body.summary.totalTransactions).toBe(0);
  });

  it("should reject updating another user's transactions", async () => {
    const created = await createTransactionRequest("patch-user-001");

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    const response = await request(otherUserApp)
      .patch(`/api/transactions/${transactionId}`)
      .send({ description: "Unauthorized update" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Transaction not found");

    const ownerResponse = await request(app).get("/api/transactions");

    expect(ownerResponse.body.data).toHaveLength(1);
    expect(ownerResponse.body.data[0].description).toBe("Idempotency test");
  });

  it("should reject deleting another user's transactions", async () => {
    const created = await createTransactionRequest("delete-user-001");

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    const response = await request(otherUserApp).delete(
      `/api/transactions/${transactionId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Transaction not found");

    const ownerResponse = await request(app).get("/api/transactions");

    expect(ownerResponse.body.data).toHaveLength(1);
    expect(ownerResponse.body.data[0].id).toBe(transactionId);
  });
});

describe("Transaction business rules", () => {
  it("should reject an update that causes insufficient balance", async () => {
    const created = await createTransactionRequest("business-update-001");

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    const response = await request(app)
      .patch(`/api/transactions/${transactionId}`)
      .send({
        amount: 100001,
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Insufficient wallet balance");

    const transactions = await request(app).get("/api/transactions");

    expect(Number(transactions.body.data[0].amount)).toBe(50000);
  });

  it("should allow updating expense to exactly the available balance", async () => {
    const created = await createTransactionRequest("business-update-002");

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    const response = await request(app)
      .patch(`/api/transactions/${transactionId}`)
      .send({
        amount: 100000,
      });

    expect(response.status).toBe(400);
    expect(Number(response.body.amount)).toBe(100000);
  });

  it("should reject a category incompatible with transaction type", async () => {
    const incomeCategoryId = await getDefaultCategoryId("income");

    const created = await createTransactionRequest("business-category-001");

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    const response = await request(app)
      .patch(`/api/transactions/${transactionId}`)
      .send({
        category_id: incomeCategoryId,
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe(
      "Category not found or incompatible with transaction type",
    );
  });

  it("should reject deleting income if it causes negative balance", async () => {
    const created = await createTransactionRequest("business-delete-001", {
      type: "income",
      amount: 50000,
      description: "Income to be deleted",
    });

    expect(created.status).toBe(201);

    const transactionId = created.body.data.id;

    await pool.query(
      `
        INSERT INTO transactions (
          wallet_id,
          type,
          amount,
          description
        )
        VALUES ($1, 'expense', 120000, 'Historical expense')
      `,
      [walletId],
    );

    const response = await request(app).delete(
      `/api/transactions/${transactionId}`,
    );

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "Deleting this income would make the wallet balance negative",
    );

    const result = await pool.query(
      "SELECT id FROM transactions WHERE id = $1",
      [transactionId],
    );

    expect(result.rowCount).toBe(1);
  });
});
