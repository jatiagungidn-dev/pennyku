import type { RequestHandler } from "express";
import { AppError } from "../../errors/AppError.js";
import { createTransactionSchema } from "./transaction.schema.js";
import { transactionService } from "./transaction.service.js";

export const getTransaction: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Fetching transactions...");

  const result = await transactionService.getAll(userId, req.query);

  req.log.info(
    {
      userId,
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      count: result.data.length,
    },
    "Fetching transactions successfully",
  );

  res.status(200).json(result);
};

export const createTransaction: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Creating transaction...");

  const idempotencyKey = req.get("Idempotency-Key")?.trim();

  if (!idempotencyKey || idempotencyKey.length > 255) {
    req.log.warn(
      { userId },
      "Creating transaction failed: A valid Idempotency-Key header is required",
    );

    throw new AppError("A valid Idempotency-Key header is required", 400);
  }

  const parsed = createTransactionSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      { userId, error: parsed.error.issues },
      "Creating transaction failed: Invalid transaction data",
    );

    throw new AppError("Invalid transaction data", 400, true, {
      detail: parsed.error.issues,
    });
  }

  const result = await transactionService.create(
    userId,
    idempotencyKey,
    parsed.data,
  );

  req.log.info(
    { userId, data: result.body, idempotencyKey: idempotencyKey },
    "Transaction created successfully",
  );

  res.setHeader("Idempotency-Replayed", String(result.replayed));

  req.log.info(
    { userId, idempotencyKey: idempotencyKey },
    "Idempotency-Replayed",
  );

  return res.status(result.status).json(result.body);
};

export const updateTransaction: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    throw new AppError("Invalid transaction ID", 400);
  }

  req.log.debug({ userId, transactionId: id }, "Updating transaction...");

  const transaction = await transactionService.update(userId, id, req.body);

  req.log.info(
    { userId, transactionId: id, data: transaction },
    "Update transaction successfully",
  );

  return res.status(200).json({ data: transaction });
};

export const deleteTransaction: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    throw new AppError("Invalid transaction ID", 400);
  }

  req.log.debug({ userId, transactionId: id }, "Deleting transaction...");

  const transaction = await transactionService.delete(userId, id);

  req.log.info(
    { userId, transactionId: id },
    "Deleting transaction successfully",
  );

  res.status(200).json(transaction);
};
