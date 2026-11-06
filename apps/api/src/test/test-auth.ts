import type { RequestHandler } from "express";

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

export const testAuth: RequestHandler = (req, _res, next) => {
  req.auth = {
    userId: TEST_USER_ID,
  };

  next();
};
