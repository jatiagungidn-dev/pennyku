import type { RequestHandler } from "express";

export const authTest: RequestHandler = (req, _res, next) => {
  req.auth = {
    userId: "test-user-123",
  };

  next();
};
