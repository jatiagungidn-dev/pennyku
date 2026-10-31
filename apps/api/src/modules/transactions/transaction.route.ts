import { Router } from "express";
import z from "zod";
import { pool } from "../../config/db.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "./transaction.schema.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.auth!.userId;
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
    `,
      [userId],
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("Failed to fetch transactions:", err);

    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/", async (req, res) => {
  const parsed = createTransactionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid transaction data", detail: parsed.error.issues });
  }

  const userId = req.auth!.userId;
  const {
    wallet_id,
    category_id,
    type,
    amount,
    description,
    transaction_date,
  } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const walletResult = await client.query(
      `
        SELECT id
        FROM wallets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
    `,
      [wallet_id, userId],
    );

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (category_id) {
      const categoryResult = await client.query(
        `
            SELECT id
            FROM categories
            WHERE id = $1
                AND type = $2
                AND (user_id IS NULL OR user_id = $3)
        `,
        [category_id, type, userId],
      );

      if (categoryResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Category not found or incompatible with transaction type",
        });
      }
    }

    const result = await client.query(
      `
        INSERT INTO transactions (wallet_id, category_id, type, amount, description, transaction_date)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
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
        wallet_id,
        category_id ?? null,
        type,
        amount,
        description?.trim() || null,
        transaction_date ?? null,
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create transactions:", err);

    res.status(500).json({ error: "Failed to create transactions" });
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const idResult = z.uuid().safeParse(id);

  if (!idResult) {
    return res.status(400).json({ error: "Invalid transaction ID" });
  }

  const parsed = updateTransactionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid transaction data", detail: parsed.error.issues });
  }

  const userId = req.auth!.userId;
  const updates = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const transactionResult = await client.query(
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
      [id, userId],
    );

    if (transactionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Transaction not found" });
    }

    const existing = transactionResult.rows[0];

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

      transaction_date: updates.transaction_date ?? existing.transaction_date,
    };

    const validated = createTransactionSchema.safeParse(mergedData);

    if (!validated.success) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Invalid transaction data",
        detail: validated.error.issues,
      });
    }

    const {
      wallet_id,
      category_id,
      type,
      amount,
      description,
      transaction_date,
    } = validated.data;

    const walletResult = await client.query(
      `
        SELECT id
        FROM wallets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [id, userId],
    );

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (category_id) {
      const categoryResult = await client.query(
        `
          SELECT id
          FROM categories
          WHERE id = $1 AND type = $2 AND (user_id IS NULL OR user_id = $3)
        `,
        [category_id, id, userId],
      );

      if (categoryResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Category not found or incompatible with transaction type",
        });
      }
    }

    const result = await client.query(
      `
        UPDATE transaction
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
        wallet_id,
        category_id,
        type,
        amount,
        description?.trim() || null,
        transaction_date,
        id,
      ],
    );

    await client.query("COMMIT");

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to update transaction:", err);

    res.status(500).json({ error: "Failed to update transaction" });
  } finally {
    client.release();
  }
});

export default router;
