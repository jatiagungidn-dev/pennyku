import { createHash } from "node:crypto";
import { pool } from "../../config/db.js";
import { AppError } from "../../errors/AppError.js";
import { transactionRepository } from "./transaction.repository.js";
import {
  paginationSchema,
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
} from "./transaction.schema.js";

export const transactionService = {
  async getAll(userId: string, query: unknown) {
    const parsed = paginationSchema.safeParse(query);

    if (!parsed.success) {
      throw new AppError("Invalid pagination parameters", 400, true, {
        detail: parsed.error.issues,
      });
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const summary = await transactionRepository.getSummary(userId);

    const transaction = await transactionRepository.findAll(
      userId,
      limit,
      offset,
    );

    return {
      data: transaction,
      pagination: {
        page,
        limit,
        total: summary.total,
        totalPages: Math.ceil(summary.total / limit),
      },
      summary: {
        totalIncome: summary.total_income,
        totalExpense: summary.total_expense,
        totalTransactions: summary.total,
      },
    };
  },

  async create(
    userId: string,
    idempotencyKey: string,
    data: CreateTransactionInput,
  ) {
    const normalizedPayload = {
      wallet_id: data.wallet_id,
      category_id: data.category_id ?? null,
      type: data.type,
      amount: data.amount,
      description: data.description?.trim() || null,
      transaction_date: data.transaction_date ?? null,
    };

    const requestHash = createHash("sha256")
      .update(JSON.stringify(normalizedPayload))
      .digest("hex");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const claimResult = await transactionRepository.claimIdempotencyKey(
        client,
        userId,
        idempotencyKey,
        requestHash,
      );

      if (claimResult.rowCount === 0) {
        const existing = await transactionRepository.findIdempotencyKey(
          client,
          userId,
          idempotencyKey,
        );

        if (!existing) {
          throw new AppError("Unable to process idempotency key", 500);
        }

        if (existing.request_hash !== requestHash) {
          throw new AppError(
            "Idempotency key has already been used with a different request",
            409,
          );
        }

        if (
          existing.response_status === null ||
          existing.response_body === null
        ) {
          throw new AppError("Idempotency response is unavailable", 500);
        }

        await client.query("COMMIT");

        return {
          status: existing.response_status,
          body: existing.response_body,
          replayed: true,
        };
      }

      const wallet = await transactionRepository.findOwnedWallet(
        client,
        data.wallet_id,
        userId,
      );

      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      if (data.type === "expense") {
        const sufficient = await transactionRepository.hasSufficientBalance(
          client,
          data.wallet_id,
          data.amount,
        );

        if (!sufficient) {
          throw new AppError("Insufficient wallet balance", 409);
        }
      }

      if (data.category_id) {
        const category = await transactionRepository.findAccessibleCategory(
          client,
          data.category_id,
          data.type,
          userId,
        );

        if (!category) {
          throw new AppError(
            "Category not found or incompatible with transaction type",
            404,
          );
        }
      }

      const transaction = await transactionRepository.create(
        client,
        normalizedPayload,
      );

      const responseBody = {
        data: transaction,
      };

      const updateResult =
        await transactionRepository.updateIdempotencyResponse(
          client,
          userId,
          idempotencyKey,
          201,
          responseBody,
        );

      if (updateResult.rowCount !== 1) {
        throw new AppError("Failed to store idempotency response", 500);
      }

      await client.query("COMMIT");

      return {
        status: 201,
        body: responseBody,
        replayed: false,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch((rollbackError) => {
        console.error("Rollback failed:", rollbackError);
      });

      throw err;
    } finally {
      client.release();
    }
  },

  async update(userId: string, transactionId: string, input: unknown) {
    if (!transactionId) {
      throw new AppError("Invalid transaction ID", 400);
    }

    const parsed = updateTransactionSchema.safeParse(input);

    if (!parsed.success) {
      throw new AppError("Invalid transaction data", 400, true, {
        detail: parsed.error.issues,
      });
    }

    const updates = parsed.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const walletSnapshot =
        await transactionRepository.findOwnedTransactionWallet(
          client,
          transactionId,
          userId,
        );

      if (!walletSnapshot) {
        throw new AppError("Transaction not found", 404);
      }

      const targetWalletId = updates.wallet_id ?? walletSnapshot.wallet_id;
      const walletIds = [
        ...new Set([walletSnapshot.wallet_id, targetWalletId]),
      ].sort();

      for (const id of walletIds) {
        const wallet = await transactionRepository.findOwnedWallet(
          client,
          id,
          userId,
        );

        if (!wallet) {
          throw new AppError("Wallet not found", 404);
        }
      }

      const existing = await transactionRepository.findOwnedTransaction(
        client,
        transactionId,
        userId,
      );

      if (!existing) {
        throw new AppError("Transaction not found", 404);
      }

      if (existing.wallet_id !== walletSnapshot.wallet_id) {
        throw new AppError(
          "Transaction changed while being updated; please retry",
          409,
        );
      }

      const mergedData = {
        wallet_id: updates.wallet_id ?? existing.wallet_id,

        category_id:
          updates.category_id !== undefined
            ? updates.category_id
            : existing.category_id,

        type: updates.type ?? existing.type,

        amount: updates.amount ?? existing.amount,

        description:
          updates.description !== undefined
            ? updates.description
            : (existing.description ?? ""),

        transaction_date:
          updates.transaction_date ??
          (existing.transaction_date instanceof Date
            ? existing.transaction_date.toISOString().slice(0, 10)
            : existing.transaction_date),
      };

      const validated = createTransactionSchema.safeParse(mergedData);

      if (!validated.success) {
        throw new AppError("Invalid transaction data", 400, true, {
          detail: validated.error.issues,
        });
      }

      const {
        wallet_id,
        category_id,
        type,
        amount,
        description,
        transaction_date = existing.transaction_date,
      } = validated.data;

      const normalizedCategoryId = category_id ?? null;

      if (existing.wallet_id !== wallet_id) {
        const sourceBalanceValid =
          await transactionRepository.hasNonNegativeBalanceAfterUpdate(
            client,
            existing.wallet_id,
            transactionId,
            null,
            0,
          );

        if (!sourceBalanceValid) {
          throw new AppError(
            "Updating this transaction would make the source balance negative",
            409,
          );
        }
      }

      const targetBalanceValid =
        await transactionRepository.hasNonNegativeBalanceAfterUpdate(
          client,
          wallet_id,
          transactionId,
          type,
          amount,
        );

      if (!targetBalanceValid) {
        throw new AppError("Insufficient wallet balance", 409);
      }

      if (normalizedCategoryId) {
        const category = await transactionRepository.findAccessibleCategory(
          client,
          normalizedCategoryId,
          type,
          userId,
        );

        if (!category) {
          throw new AppError(
            "Category not found or incompatible with transaction type",
            404,
          );
        }
      }

      const transaction = await transactionRepository.update(
        client,
        transactionId,
        {
          wallet_id,
          category_id: normalizedCategoryId,
          type,
          amount,
          description: description?.trim() || null,
          transaction_date,
        },
      );

      await client.query("COMMIT");

      return transaction;
    } catch (err) {
      await client.query("ROLLBACK").catch((rollbackError: unknown) => {
        console.error("Rollback failed:", rollbackError);
      });

      throw err;
    } finally {
      client.release();
    }
  },

  async delete(userId: string, transactionId: string) {
    if (!transactionId) {
      throw new AppError("Invalid transaction ID", 400);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const walletSnapshot =
        await transactionRepository.findOwnedTransactionWallet(
          client,
          transactionId,
          userId,
        );

      if (!walletSnapshot) {
        throw new AppError("Transaction not found", 404);
      }

      const wallet = await transactionRepository.findOwnedWallet(
        client,
        walletSnapshot.wallet_id,
        userId,
      );

      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      const existing = await transactionRepository.findOwnedTransaction(
        client,
        transactionId,
        userId,
      );

      if (!existing) {
        throw new AppError("Transaction not found", 404);
      }

      if (existing.wallet_id !== walletSnapshot.wallet_id) {
        throw new AppError(
          "Transaction changed while being deleted; please retry",
          409,
        );
      }

      if (existing.type === "income") {
        const balanceValid =
          await transactionRepository.hasNonNegativeBalanceAfterUpdate(
            client,
            existing.wallet_id,
            transactionId,
            null,
            0,
          );

        if (!balanceValid) {
          throw new AppError(
            "Deleting this income would make the wallet balance negative",
            409,
          );
        }
      }

      const transaction = await transactionRepository.deleteTransaction(
        client,
        userId,
        transactionId,
      );

      if (!transaction) {
        throw new AppError("Transaction not found", 404);
      }

      await client.query("COMMIT");
      return transaction;
    } catch (err) {
      await client.query("ROLLBACK").catch((rollbackError: unknown) => {
        console.error("Rollback failed:", rollbackError);
      });

      throw err;
    } finally {
      client.release();
    }
  },
};
