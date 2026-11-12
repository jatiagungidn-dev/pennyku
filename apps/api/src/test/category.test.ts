import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../config/db.js";
import { TEST_USER_ID, testAuth } from "./test-auth.js";

const app = createApp(testAuth);

const cleanUpCategoryByUserId = async () => {
  await pool.query(
    `
    DELETE FROM categories
    WHERE user_id = $1
  `,
    [TEST_USER_ID],
  );
};

beforeEach(async () => {
  await cleanUpCategoryByUserId();
});

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
    throw new Error("Test user does not exist");
  }
});

afterAll(async () => {
  try {
    await cleanUpCategoryByUserId();
  } finally {
    await pool.end();
  }
});

const payload = {
  name: "Gaming",
  type: "expense",
  color: "#64748B",
  icon: "gamepad",
};

const requiredPayload = {
  name: "Shopping",
  type: "expense",
};

const invalidPayload = {
  name: "Bonus",
  type: "pemasukan",
  color: "#64748B",
  icon: "gamepad",
};

const expected = {
  name: "Gaming",
  type: "expense",
  color: "#64748B",
  icon: "gamepad",
};

describe("GET /categories", () => {
  it("should return categories fetched successfully", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("count");
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(typeof response.body.count).toBe("number");
  });
});

describe("POST /categories", () => {
  it("should return category created successfully", async () => {
    const response = await request(app).post("/api/categories").send(payload);

    const categoryId = response.body.data.id;

    const result = await pool.query(
      "SELECT user_id FROM categories WHERE id = $1",
      [categoryId],
    );

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject(expected);
    expect(result.rows[0].user_id).toBe(TEST_USER_ID);
  });

  it("should return category created successfully when only send required payload", async () => {
    const response = await request(app)
      .post("/api/categories")
      .send(requiredPayload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "Shopping",
      type: "expense",
      icon: "tag",
      color: "#64748B",
    });
  });

  it("should reject invalid category data", async () => {
    const response = await request(app)
      .post("/api/categories")
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid category data");
  });
});
