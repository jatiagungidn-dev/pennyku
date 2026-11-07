import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    req.log.warn({ err, statusCode: err.statusCode }, err.message);

    return res.status(err.statusCode).json({ error: err.message });
  }

  req.log.error({ err }, "An unexpected error occurred");

  return res.status(500).json({ error: "Internal server error" });
};
