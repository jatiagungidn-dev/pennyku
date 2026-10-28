import { Router } from "express";
import { pool } from "../../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;

  const result = await pool.query(
    `
        SELECT
            id,
            name,
            type,
            initial_balance,
            created_at,
            updated_at,
            user_id
        FROM wallets
        WHERE user_id = $1;
    `,
    [userId],
  );

  res.status(200).json({ data: result.rows });
});

router.post("/", async (req, res) => {
  const { name, type, initial_balance } = req.body;
  const userId = req.auth!.userId;

  const result = await pool.query(
    `
        INSERT INTO wallets (name, type, initial_balance, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, type, initial_balance, created_at, updated_at, user_id
    `,
    [name, type, initial_balance, userId],
  );

  res.status(201).json({ data: result.rows });
});

export default router;
