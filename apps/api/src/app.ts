import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";

import walletsRouter from "./modules/wallets/wallet.route.js";
import categoriesRouter from "./modules/categories/category.route.js";
import transactionsRouter from "./modules/transactions/transaction.route.js";
import { requireAuth } from "./middlewares/requireAuth.js";
import { logger } from "./config/logger.js";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(pinoHttp({ logger }));
app.use(express.json());

app.use("/api/wallets", requireAuth, walletsRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/transactions", requireAuth, transactionsRouter);

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "PennyKu" });
});

export default app;
