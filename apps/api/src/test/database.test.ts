import { describe, it, expect, afterAll } from "vitest";
import { pool } from "../config/db.js";

describe("Database connection", () => {
  it("should connect to the testing database", async () => {
    const result = await pool.query(
      "SELECT current_database() AS database_name",
    );

    expect(result.rows[0].database_name).toBe("neondb");
  });
});

afterAll(async () => {
  await pool.end();
});
