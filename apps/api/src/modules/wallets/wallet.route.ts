import { Router } from "express";
import { pool } from "../../config/db.js";
import { createWalletSchema } from "./wallet.schema.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;

  try {
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

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("Failed to fetch wallets:", err);

    res.status(500).json({ error: "Failed to fetch wallets" });
  }
});

router.post("/", async (req, res) => {
  const parsed = createWalletSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid wallet data",
      detail: parsed.error.flatten().fieldErrors,
    });
  }

  const userId = req.auth!.userId;
  const { name, type, initial_balance } = parsed.data;

  try {
    const result = await pool.query(
      `
        INSERT INTO wallets (name, type, initial_balance, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, type, initial_balance, created_at, updated_at
    `,
      [name, type, initial_balance, userId],
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error("Failed to create wallets:", err);

    res.status(500).json({ error: "Failed to create wallets" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }

    const userId = req.auth!.userId;

    const result = await pool.query(
      `
      DELETE FROM wallets
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `,
      [id, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.status(200).json({ data: result.rows[0].id });
  } catch (err) {
    console.error("Failed to delete wallet:", err);

    res.status(500).json({ error: "Failed to delete wallet" });
  }
});

export default router;
