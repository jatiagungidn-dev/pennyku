import { Router } from "express";
import { pool } from "../../config/db.js";
import { createWalletSchema, updateWalletSchema } from "./wallet.schema.js";
import { AppError } from "../../errors/AppError.js";
import {
  createWallet,
  getWallets,
  updateWallet,
  walletDelete,
} from "./wallet.controller.js";

const router = Router();

router.get("/", getWallets);

router.post("/", createWallet);

router.patch("/:id", updateWallet);

router.delete("/:id", walletDelete);

export default router;
