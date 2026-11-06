import express, { type RequestHandler } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";

import walletsRouter from "./modules/wallets/wallet.route.js";
import categoriesRouter from "./modules/categories/category.route.js";
import transactionsRouter from "./modules/transactions/transaction.route.js";

import { requireAuth } from "./middlewares/requireAuth.js";
import { logger } from "./config/logger.js";

export function createApp(authMiddleware: RequestHandler = requireAuth) {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
      customSuccessMessage: (req, res, responseTime) => {
        return `${req.method} ${req.url} -> HTTP ${res.statusCode} (${responseTime}ms)`;
      },
      customErrorMessage: (req, res, error) => {
        return `${req.method} ${req.url} -> HTTP ${res.statusCode} ERROR: ${error.message}`;
      },
    }),
  );
  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(express.json());

  app.use("/api/wallets", authMiddleware, walletsRouter);
  app.use("/api/categories", authMiddleware, categoriesRouter);
  app.use("/api/transactions", authMiddleware, transactionsRouter);

  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", service: "PennyKu" });
  });

  return app;
}

const app = createApp();

export default app;
