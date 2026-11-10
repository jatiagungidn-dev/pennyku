import { describe, it, expect, afterAll, beforeAll, beforeEach } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { TEST_USER_ID, testAuth } from "./test-auth.js";
import { pool } from "../config/db.js";

const app = createApp(testAuth);

async function cleanUpTestData() {
  await pool.query(
    `
    DELETE FROM transactions
    WHERE wallet_id IN (
      SELECT id
      FROM wallets
      WHERE user_id = $1
    )
  `,
    [TEST_USER_ID],
  );

  await pool.query(
    `
    DELETE FROM wallets
    WHERE user_id = $1
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
});

describe("PATCH /api/wallets/:id", () => {
  it("should update a wallet successfully", async () => {
    const created = await request(app)
      .post("/api/wallets/")
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
});
