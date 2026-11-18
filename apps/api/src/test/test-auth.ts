import type { RequestHandler } from "express";

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
export const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";

export function createTestAuth(userId: string): RequestHandler {
  return (req, _res, next) => {
    req.auth = {
      userId,
    };

    next();
  };
}

export const testAuth = createTestAuth(TEST_USER_ID);
