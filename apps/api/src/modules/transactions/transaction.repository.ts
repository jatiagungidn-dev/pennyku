import type { PoolClient } from "pg";
import { pool } from "../../config/db.js";

export const transactionRepository = {
  async getSummary(userId: string) {
    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS total,
      COALESCE(
        SUM(t.amount) FILTER (WHERE t.type = 'income'), 0
      )::text AS total_income,
      COALESCE(
        SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0
      )::text AS total_expense
      FROM transactions t
      JOIN wallets w ON w.id = t.wallet_id
      WHERE w.user_id = $1
    `,
      [userId],
    );

    return result.rows[0];
  },

  async findAll(userId: string, limit: number, offset: number) {
    const result = await pool.query(
      `
      SELECT 
            t.id,
            t.wallet_id,
            t.category_id,
            t.type,
            t.amount,
            t.description,
            t.transaction_date,
            t.created_at,
            t.updated_at,
            w.name AS wallet_name,
            c.name AS category_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE w.user_id = $1
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset],
    );

    return result.rows;
  },

  async claimIdempotencyKey(
    client: PoolClient,
    userId: string,
    key: string,
    requestHash: string,
  ) {
    return client.query(
      `
        INSERT INTO idempotency_keys (
          user_id,
          idempotency_key,
          request_hash,
          expires_at
        )
        VALUES (
          $1, $2, $3,
          NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (user_id, idempotency_key)
        DO UPDATE SET
          request_hash = EXCLUDED.request_hash,
          response_status = NULL,
          response_body = NULL,
          created_at = NOW(),
          expires_at = NOW() + INTERVAL '24 hours'
        WHERE idempotency_keys.expires_at <= NOW()
        RETURNING id
      `,
      [userId, key, requestHash],
    );
  },

  async findIdempotencyKey(client: PoolClient, userId: string, key: string) {
    const result = await client.query(
      `
        SELECT
          request_hash,
          response_status,
          response_body
        FROM idempotency_keys
        WHERE user_id = $1
          AND idempotency_key = $2
      `,
      [userId, key],
    );

    return result.rows[0];
  },

  async updateIdempotencyResponse(
    client: PoolClient,
    userId: string,
    key: string,
    status: number,
    body: object,
  ) {
    return client.query(
      `
        UPDATE idempotency_keys
        SET
          response_status = $1,
          response_body = $2
        WHERE user_id = $3
          AND idempotency_key = $4
      `,
      [status, body, userId, key],
    );
  },

  async findOwnedWallet(client: PoolClient, walletId: string, userId: string) {
    const result = await client.query(
      `
        SELECT id
        FROM wallets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [walletId, userId],
    );

    return result.rows[0] ?? null;
  },

  async findAccessibleCategory(
    client: PoolClient,
    categoryId: string,
    type: string,
    userId: string,
  ) {
    const result = await client.query(
      `
        SELECT id
        FROM categories
        WHERE id = $1
          AND type = $2
          AND (user_id IS NULL OR user_id = $3)
      `,
      [categoryId, type, userId],
    );

    return result.rows[0] ?? null;
  },

  async create(
    client: PoolClient,
    data: {
      wallet_id: string;
      category_id: string | null;
      type: string;
      amount: number;
      description: string | null;
      transaction_date: string | null;
    },
  ) {
    const result = await client.query(
      `
        INSERT INTO transactions (
          wallet_id,
          category_id,
          type,
          amount,
          description,
          transaction_date
        )
        VALUES (
          $1, $2, $3, $4, $5,
          COALESCE($6::date, CURRENT_DATE)
        )
        RETURNING
          id,
          wallet_id,
          category_id,
          type,
          amount,
          description,
          transaction_date,
          created_at,
          updated_at
      `,
      [
        data.wallet_id,
        data.category_id,
        data.type,
        data.amount,
        data.description,
        data.transaction_date,
      ],
    );

    return result.rows[0];
  },

  async findOwnedTransaction(
    client: PoolClient,
    transactionId: string,
    userId: string,
  ) {
    const result = await client.query(
      `
      SELECT
        t.id,
        t.wallet_id,
        t.category_id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date
      FROM transactions t
      JOIN wallets w ON w.id = t.wallet_id
      WHERE t.id = $1 AND w.user_id = $2
      FOR UPDATE OF t
    `,
      [transactionId, userId],
    );

    return result.rows[0] ?? null;
  },

  async update(
    client: PoolClient,
    transactionId: string,
    data: {
      wallet_id: string;
      category_id: string | null;
      type: string;
      amount: number;
      description: string | null;
      transaction_date: string;
    },
  ) {
    const result = await client.query(
      `
      UPDATE transactions
      SET
        wallet_id = $1,
        category_id = $2,
        type = $3,
        amount = $4,
        description = $5,
        transaction_date = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING
        id,
        wallet_id,
        category_id,
        type,
        amount,
        description,
        transaction_date,
        created_at,
        updated_at
    `,
      [
        data.wallet_id,
        data.category_id,
        data.type,
        data.amount,
        data.description,
        data.transaction_date,
        transactionId,
      ],
    );

    return result.rows[0];
  },

  async deleteTransaction(userId: string, id: string) {
    const result = await pool.query(
      `
      DELETE FROM transactions t
      USING wallets w
      WHERE t.id = $1
        AND w.id = t.wallet_id
        AND w.user_id = $2
      RETURNING t.id
    `,
      [id, userId],
    );

    return result.rows[0].id;
  },
};
