import { Router } from "express";
import { pool } from "../../config/db.js";
import { createTransactionSchema } from "./transaction.schema.js";

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
    }
  } catch (err) {
    console.error("Failed to create transactions:", err);

    res.status(500).json({ error: "Failed to create transactions" });
  } finally {
    client.release();
  }
});

export default router;
