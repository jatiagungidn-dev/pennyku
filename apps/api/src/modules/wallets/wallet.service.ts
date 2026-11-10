import { walletRepository } from "./wallet.repository.js";
import { AppError } from "../../errors/AppError.js";
import { createWalletSchema, updateWalletSchema } from "./wallet.schema.js";
import { pool } from "../../config/db.js";

type WalletType = "cash" | "bank" | "e-wallet" | "other";

export const walletService = {
  async create(
    name: string,
    type: WalletType,
    initial_balance: number,
    userId: string,
  ) {
    const wallet = await walletRepository.postWallet(
      name,
      type,
      initial_balance,
      userId,
    );

    return wallet;
  },

  async update(walletId: string, userId: string, input: unknown) {
    const parsed = updateWalletSchema.safeParse(input);

    if (!parsed.success) {
      throw new AppError("Invalid wallet data", 400);
    }

    const updates = parsed.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const walletResult = await walletRepository.findOwnedWallet(
        walletId,
        userId,
      );

      if (!walletResult) {
        throw new AppError("Wallet not found", 404);
      }

      const existing = walletResult;

      const { name, type } = {
        name: updates.name ?? existing.name,
        type: updates.type ?? existing.type,
      };

      const result = await walletRepository.patchWallet(
        client,
        walletId,
        userId,
        { name, type },
      );

      await client.query("COMMIT");

      return result;
    } catch (err) {
      await client.query("ROLLBACK");

      throw err;
    } finally {
      client.release();
    }
  },
};
