import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

const jwks = createRemoteJWKSet(new URL(env.NEON_AUTH_JWKS_URL));

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auhtorization = req.headers.authorization;

  if (!auhtorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = auhtorization.slice("Bearer".length).trim();

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.NEON_AUTH_ISSUER,
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    req.auth = { userId: payload.sub };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}
