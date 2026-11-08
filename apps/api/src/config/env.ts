import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../../.env"),
});

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: resolve(currentDir, "../../.env.test") });
  override: true;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().trim().min(1),
  NEON_AUTH_JWKS_URL: z.string().url(),
  NEON_AUTH_ISSUER: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
