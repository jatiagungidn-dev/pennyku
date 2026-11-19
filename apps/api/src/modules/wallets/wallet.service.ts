import { walletRepository } from "./wallet.repository.js";
import { AppError } from "../../errors/AppError.js";
import { createWalletSchema, updateWalletSchema } from "./wallet.schema.js";
import { pool } from "../../config/db.js";
import type {
  CreateWalletPayload,
  UpdateWalletData,
  Wallet,
  WalletRepositoryResult,
} from "../../types/wallet.js";

export const walletService = {
  async get(userId: string): Promise<WalletRepositoryResult<Wallet>> {
    const wallets = await walletRepository.getWallets(userId);

    return wallets;
  },

  async create(
    userId: string,
    input: unknown,
  ): Promise<Omit<Wallet, "current_balance"> | null> {
    const parsed = createWalletSchema.safeParse(input);

    if (!parsed.success) {
      throw new AppError("Invalid wallet data", 400);
    }

    const data = parsed.data;

    const payload: CreateWalletPayload = {
      name: data.name,
      type: data.type,
      initialBalance: data.initial_balance,
    };

    const wallet = await walletRepository.postWallet(userId, payload);

    if (!wallet) {
      throw new AppError("Failed to create wallet", 500);
    }

    return wallet;
  },

  async update(
    walletId: string,
    userId: string,
    input: unknown,
  ): Promise<Omit<Wallet, "current_balance"> | null> {
    const parsed = updateWalletSchema.safeParse(input);

    if (!parsed.success) {
      throw new AppError("Invalid wallet data", 400);
    }

    const updates = parsed.data;

    if (updates.name === undefined && updates.type === undefined) {
      throw new AppError("At least one field must be provided", 400);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await walletRepository.findOwnedWallet(
        client,
        walletId,
        userId,
      );

      if (!existing) {
        throw new AppError("Wallet not found", 404);
      }

      const payload: UpdateWalletData = {
        name: updates.name ?? existing.name,
        type: updates.type ?? existing.type,
      };

      const result = await walletRepository.patchWallet(
        client,
        walletId,
        userId,
        payload,
      );

      await client.query("COMMIT");

      if (!result) {
        throw new AppError("Failed to update wallet", 500);
      }

      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to rollback wallet update", rollbackError);
      }

      throw err;
    } finally {
      client.release();
    }
  },

  async delete(walletId: string, userId: string): Promise<Pick<Wallet, "id">> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await walletRepository.findOwnedWallet(
        client,
        walletId,
        userId,
      );

      if (!existing) {
        throw new AppError("Wallet not found", 404);
      }

      const hasTransactions = await walletRepository.hasTransactions(
        client,
        walletId,
      );

      if (hasTransactions) {
        throw new AppError(
          "Wallet has transactions and cannot be deleted",
          409,
        );
      }

      const wallet = await walletRepository.deleteWallet(
        client,
        walletId,
        userId,
      );

      if (!wallet) {
        throw new AppError("Wallet not found", 404);
      }

      await client.query("COMMIT");

      return wallet;
    } catch (err) {
      client.query("ROLLBACK").catch((rollbackError: unknown) => {
        console.error("Rollback failed:", rollbackError);
      });

      throw err;
    } finally {
      client.release();
    }
  },
};
