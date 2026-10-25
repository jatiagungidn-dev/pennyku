import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 10_000,
  ssl: {
    rejectUnauthorized: false,
  },
});
