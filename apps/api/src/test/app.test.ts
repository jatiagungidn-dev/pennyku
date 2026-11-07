import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("GET /", () => {
  it("should return API health status", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "PennyKu",
    });
  });
});

describe("Unknown routes", () => {
  it("should return 404 when route doesn't exist", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Route GET /api/unknown not found");
  });
});
