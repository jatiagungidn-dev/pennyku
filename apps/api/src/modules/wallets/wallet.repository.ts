import { pool } from "../../config/db.js";
import type { PoolClient } from "pg";
import type {
  CreateWalletPayload,
  UpdateWalletData,
  Wallet,
  WalletRepositoryResult,
} from "../../types/wallet.js";

export const walletRepository = {
  async getWallets(userId: string): Promise<WalletRepositoryResult<Wallet>> {
    const result = await pool.query<Wallet>(
      `
        SELECT 
            w.id,
            w.name,
            w.type,
            w.initial_balance,
            w.initial_balance + COALESCE(
                SUM(
                CASE
                    WHEN t.type = 'income' THEN t.amount
                    WHEN t.type = 'expense' THEN -t.amount
                    ELSE 0
                END
                ),
                0
            ) AS current_balance,
            w.created_at,
            w.updated_at
            FROM wallets w
            LEFT JOIN transactions t ON t.wallet_id = w.id
            WHERE w.user_id = $1
            GROUP BY 
              w.id,
              w.name,
              w.type,
              w.initial_balance,
              w.created_at,
              w.updated_at
            ORDER BY w.created_at DESC;
        `,
      [userId],
    );

    return { data: result.rows, count: result.rowCount ?? 0 };
  },

  async postWallet(
    userId: string,
    data: CreateWalletPayload,
  ): Promise<Omit<Wallet, "current_balance"> | null> {
    const result = await pool.query<Omit<Wallet, "current_balance">>(
      `
        INSERT INTO wallets (name, type, initial_balance, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, type, initial_balance, created_at, updated_at
    `,
      [data.name, data.type, data.initialBalance, userId],
    );

    return result.rows[0] ?? null;
  },

  async findOwnedWallet(
    client: PoolClient,
    walletId: string,
    userId: string,
  ): Promise<Pick<Wallet, "id" | "name" | "type"> | null> {
    const result = await client.query<Pick<Wallet, "id" | "name" | "type">>(
      `
        SELECT id, name, type
        FROM wallets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
    `,
      [walletId, userId],
    );

    return result.rows[0] ?? null;
  },

  async patchWallet(
    client: PoolClient,
    walletId: string,
    userId: string,
    data: UpdateWalletData,
  ): Promise<Omit<Wallet, "current_balance"> | null> {
    const result = await client.query<Omit<Wallet, "current_balance">>(
      `
        UPDATE wallets
        SET
          name = $1,
          type = $2,
          updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING
          id,
          name,
          type,
          initial_balance,
          created_at,
          updated_at
    `,
      [data.name, data.type, walletId, userId],
    );

    return result.rows[0] ?? null;
  },

  async deleteWallet(
    walletId: string,
    userId: string,
  ): Promise<Pick<Wallet, "id"> | null> {
    const result = await pool.query<Pick<Wallet, "id">>(
      `
        DELETE FROM wallets
        WHERE id = $1 AND user_id = $2
        RETURNING id
    `,
      [walletId, userId],
    );

    return result.rows[0] ?? null;
  },
};
