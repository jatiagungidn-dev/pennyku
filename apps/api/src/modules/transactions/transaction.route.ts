import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "./transaction.controller.js";

const router = Router();

router.get("/", getTransaction);

router.post("/", createTransaction);

router.patch("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);

export default router;
