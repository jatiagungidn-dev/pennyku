import express from "express";
import walletsRouter from "./modules/wallets/wallet.route.js";
import { requireAuth } from "./middlewares/requireAuth.js";

const app = express();

app.use(express.json());

app.use("/api/wallets", requireAuth, walletsRouter);

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "PennyKu" });
});

export default app;
