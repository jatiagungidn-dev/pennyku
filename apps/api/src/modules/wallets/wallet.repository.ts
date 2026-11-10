import { pool } from "../../config/db.js";
import { PoolClient } from "pg";

type WalletType = "cash" | "bank" | "e-wallet" | "other";

export const walletRepository = {
  async getWallets(userId: string) {
    const result = await pool.query(
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
            GROUP BY w.id
            ORDER BY w.created_at DESC;
        `,
      [userId],
    );

    return { data: result.rows, count: result.rowCount };
  },

  async postWallet(
    name: string,
    type: WalletType,
    initialBalance: number,
    userId: string,
  ) {
    const result = await pool.query(
      `
        INSERT INTO wallets (name, type, initial_balance, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, type, initial_balance, created_at, updated_at
    `,
      [name, type, initialBalance, userId],
    );

    return result.rows[0];
  },

  async findOwnedWallet(walletId: string, userId: string) {
    const result = await pool.query(
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
    data: {
      name: string;
      type: WalletType;
    },
  ) {
    const result = await client.query(
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

  async deleteWallet(walletId: string, userId: string) {
    const result = await pool.query(
      `
        DELETE FROM wallets
        WHERE id = $1 AND user_id = $2
        RETURNING id
    `,
      [walletId, userId],
    );

    return result.rows[0];
  },
};
