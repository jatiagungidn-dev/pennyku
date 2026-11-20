import { describe, it, expect, afterAll, beforeAll, beforeEach } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import {
  OTHER_USER_ID,
  TEST_USER_ID,
  testAuth,
  createTestAuth,
} from "./test-auth.js";
import { pool } from "../config/db.js";

const app = createApp(testAuth);
const otherUserApp = createApp(createTestAuth(OTHER_USER_ID));

async function cleanUpTestData() {
  const userIds = [TEST_USER_ID, OTHER_USER_ID];

  await pool.query(
    `
    DELETE FROM idempotency_keys
    WHERE user_id = ANY($1::uuid[])
  `,
    [userIds],
  );

  await pool.query(
    `
    DELETE FROM transactions
    WHERE wallet_id IN (
      SELECT id
      FROM wallets
      WHERE user_id = ANY($1::uuid[])
    )
  `,
    [userIds],
  );

  await pool.query(
    `
    DELETE FROM wallets
    WHERE user_id = ANY($1::uuid[])
  `,
    [userIds],
  );
}

async function createWallet() {
  const response = await request(app).post("/api/wallets").send(providedWallet);

  expect(response.status).toBe(201);

  return response.body.data.id as string;
}

async function createTransaction(
  walletId: string,
  type: "income" | "expense",
  amount: number,
  idempotencyKey: string,
) {
  return request(app)
    .post("/api/transactions")
    .set("Idempotency-Key", idempotencyKey)
    .send({
      wallet_id: walletId,
      type,
      amount,
      description: "Wallet balance test",
    });
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
});

afterAll(async () => {
  try {
    await cleanUpTestData();
  } finally {
    await pool.end();
  }
});

const providedWallet = {
  name: "Test Wallet",
  type: "cash",
  initial_balance: 10000,
};

const expectedWallet = {
  name: "Test Wallet",
  type: "cash",
  initial_balance: "10000.00",
};

const updatedWallet = {
  name: "Updated Wallet",
  type: "bank",
};

const invalidWallet = {
  name: "",
  type: "lol",
  initial_balance: 30000,
};

describe("GET /api/wallets", () => {
  it("should return 200 and an empty array when user has no wallets", async () => {
    const response = await request(app).get("/api/wallets");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], count: 0 });
  });

  it("should return wallet belonging to the user", async () => {
    await createWallet();

    const response = await request(app).get("/api/wallets");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      name: "Test Wallet",
      type: "cash",
      initial_balance: "10000.00",
      current_balance: "10000.00",
    });
  });

  it("should calculate current balance from income and expense transactions", async () => {
    const walletId = await createWallet();

    const incomeResponse = await createTransaction(
      walletId,
      "income",
      5000,
      "wallet-income-001",
    );

    const expenseResponse = await createTransaction(
      walletId,
      "expense",
      2000,
      "wallet-expense-001",
    );

    expect(incomeResponse.status).toBe(201);
    expect(expenseResponse.status).toBe(201);

    const response = await request(app).get("/api/wallets");

    expect(response.status).toBe(200);
    expect(response.body.data[0].initial_balance).toBe("10000.00");
    expect(response.body.data[0].current_balance).toBe("13000.00");
  });
});

describe("POST /api/wallets", () => {
  it("should create a wallet successfully", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send(providedWallet);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject(expectedWallet);
    expect(response.body.data.id).toBeDefined();
  });

  it("should reject invalid wallet data", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send(invalidWallet);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid wallet data");
  });

  it("should reject an empty initial balance", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send({ ...providedWallet, initial_balance: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid wallet data");
  });

  it("should reject a negative initial balance", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send({ ...providedWallet, initial_balance: -1000 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid wallet data");
  });

  it("should reject an initial balance exceeding the maximum", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send({
        ...providedWallet,
        initial_balance: 100_000_000_000_000,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid wallet data");
  });

  it("should reject a fractional initial balance", async () => {
    const response = await request(app)
      .post("/api/wallets")
      .send({
        ...providedWallet,
        initial_balance: 10000.5,
      });

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/wallets/:id", () => {
  it("should update a wallet successfully", async () => {
    const created = await request(app)
      .post("/api/wallets")
      .send(providedWallet);

    const walletId = created.body.data.id;

    const response = await request(app)
      .patch(`/api/wallets/${walletId}`)
      .send(updatedWallet);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: walletId,
      name: "Updated Wallet",
      type: "bank",
      initial_balance: "10000.00",
    });

    const result = await pool.query(
      `
      SELECT name, type, initial_balance
      FROM wallets
      WHERE id = $1 AND user_id = $2
    `,
      [walletId, TEST_USER_ID],
    );

    expect(result.rows[0]).toMatchObject({
      name: "Updated Wallet",
      type: "bank",
      initial_balance: "10000.00",
    });
  });

  it("should reject invalid wallet data", async () => {
    const created = await request(app)
      .post("/api/wallets")
      .send(providedWallet);

    const walletId = created.body.data.id;

    const response = await request(app)
      .patch(`/api/wallets/${walletId}`)
      .send(invalidWallet);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid wallet data");
  });

  it("should return 404 when wallet doesn't exist", async () => {
    const response = await request(app)
      .patch("/api/wallets/00000000-0000-4000-8000-000000000099")
      .send(updatedWallet);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Wallet not found");
  });
});

describe("DELETE /api/wallets/:id", () => {
  it("should delete a wallet successfully", async () => {
    const created = await request(app)
      .post("/api/wallets")
      .send(providedWallet);

    const walletId = created.body.data.id;

    const response = await request(app).delete(`/api/wallets/${walletId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: walletId });

    const result = await pool.query(
      "SELECT id FROM wallets WHERE id = $1 AND user_id = $2",
      [walletId, TEST_USER_ID],
    );

    expect(result.rowCount).toBe(0);
  });

  it("should return 404 when wallet doesn't exist", async () => {
    const response = await request(app).delete(
      "/api/wallets/00000000-0000-4000-8000-000000000099",
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Wallet not found");
  });

  it("should reject deleting wallet that has transactions", async () => {
    const created = await request(app)
      .post("/api/wallets")
      .send(providedWallet);

    expect(created.status).toBe(201);

    const walletId = created.body.data.id;

    const transactionResult = await pool.query(
      `
      INSERT INTO transactions
        (wallet_id, type, amount, description)
      VALUES ($1, 'expense', 100, 'Deletion guard test')
      RETURNING id
    `,
      [walletId],
    );

    const transactionId = transactionResult.rows[0].id;

    const response = await request(app).delete(`/api/wallets/${walletId}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "Wallet has transactions and cannot be deleted",
    );

    const walletResult = await pool.query(
      "SELECT id FROM wallets WHERE id = $1",
      [walletId],
    );
    const remainingTransaction = await pool.query(
      "SELECT id FROM transactions WHERE id = $1",
      [transactionId],
    );

    expect(walletResult.rowCount).toBe(1);
    expect(remainingTransaction.rowCount).toBe(1);
  });
});

describe("Wallet authorization", () => {
  it("should not expose another user's wallets", async () => {
    await createWallet();

    const response = await request(otherUserApp).get("/api/wallets");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      count: 0,
    });
  });

  it("should reject updating another user's wallets", async () => {
    const walletId = await createWallet();

    const response = await request(otherUserApp)
      .patch(`/api/wallets/${walletId}`)
      .send(updatedWallet);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Wallet not found");

    const ownerResponse = await request(app).get("/api/wallets");

    expect(ownerResponse.body.data).toHaveLength(1);
    expect(ownerResponse.body.data[0].name).toBe("Test Wallet");
  });

  it("should reject deleting another user's wallets", async () => {
    const walletId = await createWallet();

    const response = await request(otherUserApp).delete(
      `/api/wallets/${walletId}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Wallet not found");

    const ownerResponse = await request(app).get("/api/wallets");

    expect(ownerResponse.body.data).toHaveLength(1);
    expect(ownerResponse.body.data[0].id).toBe(walletId);
  });
});
