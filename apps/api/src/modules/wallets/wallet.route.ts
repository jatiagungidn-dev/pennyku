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
            id,
            name,
            type,
            initial_balance,
            created_at,
            updated_at
        FROM wallets
        WHERE user_id = $1
        ORDER BY created_at DESC;
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

export default router;
