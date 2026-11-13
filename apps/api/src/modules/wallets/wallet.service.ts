import { walletRepository } from "./wallet.repository.js";
import { AppError } from "../../errors/AppError.js";
import { createWalletSchema, updateWalletSchema } from "./wallet.schema.js";
import { pool } from "../../config/db.js";
import type {
  CreateWalletPayload,
  UpdateWalletData,
  UpdateWalletPayload,
  Wallet,
} from "../../types/wallet.js";

export const walletService = {
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

    return await walletRepository.postWallet(userId, payload);
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
};
