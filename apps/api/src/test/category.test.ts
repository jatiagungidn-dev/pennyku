import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../config/db.js";
import { TEST_USER_ID, testAuth } from "./test-auth.js";

const app = createApp(testAuth);

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
    throw new Error("Test user does not exist");
  }
});

describe("GET /categories", () => {
  it("should return categories fetched successfully", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
  });
});
