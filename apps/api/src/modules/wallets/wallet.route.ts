import { Router } from "express";
import { pool } from "../../config/db.js";
import { createWalletSchema, updateWalletSchema } from "./wallet.schema.js";
import { AppError } from "../../errors/AppError.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug(
    { userId },
    "Fetching wallets with calculated current balance...",
  );

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

  req.log.info(
    { userId, count: result.rowCount },
    "Successfully fetched wallets",
  );

  res.status(200).json({ data: result.rows });
});

router.post("/", async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Creating a new wallet...");

  const parsed = createWalletSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      { userId, errors: parsed.error.flatten().fieldErrors },
      "Wallet creation failed: Invalid request data",
    );

    throw new AppError("Invalid wallet data", 400);
  }

  const { name, type, initial_balance } = parsed.data;

  const result = await pool.query(
    `
        INSERT INTO wallets (name, type, initial_balance, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, type, initial_balance, created_at, updated_at
    `,
    [name, type, initial_balance, userId],
  );

  const wallet = result.rows[0];

  req.log.info(
    { userId, walletId: wallet.id, walletName: wallet.name },
    "successfully created wallet",
  );

  res.status(201).json({ data: wallet });
});

router.patch("/:id", async (req, res) => {
  const userId = req.auth!.userId;
  const { id } = req.params;

  if (!id) {
    req.log.warn(
      { userId, walletId: id },
      "Wallet update failed: Missing wallet ID",
    );

    throw new AppError("Invalid wallet ID", 400);
  }

  req.log.debug({ userId, walletId: id }, "Updating wallet...");

  const parsed = updateWalletSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      {
        userId,
        walletId: id,
        errors: parsed.error.flatten().fieldErrors,
      },
      "Wallet update failed: Invalid wallet data",
    );

    throw new AppError("Invalid wallet data", 400);
  }

  const updates = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const walletResult = await client.query(
      `
        SELECT id, name, type
        FROM wallets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [id, userId],
    );

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");

      req.log.warn(
        { userId, walletId: id },
        "Wallet update failed: Wallet not found",
      );

      throw new AppError("Wallet not found", 404);
    }

    const existing = walletResult.rows[0];

    const { name, type } = {
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
    };

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
      [name, type, id, userId],
    );

    await client.query("COMMIT");

    req.log.info({ userId, walletId: id }, "Successfully updated wallet");

    return res.status(200).json({
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.auth!.userId;

  req.log.debug({ userId, walletId: id }, "Deleting wallet...");

  if (!id) {
    req.log.warn({ userId }, "Wallet deletion failed: Missing wallet ID");

    return res.status(400).json({ error: "Invalid wallet ID" });
  }

  const result = await pool.query(
    `
      DELETE FROM wallets
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `,
    [id, userId],
  );

  if (result.rowCount === 0) {
    req.log.warn(
      { userId, walletId: id },
      "Wallet deletion failed: Wallet not found",
    );

    return res.status(404).json({ error: "Wallet not found" });
  }

  req.log.info({ userId, walletId: id }, "Wallet deleted successfully");

  res.status(200).json({ data: result.rows[0].id });
});

export default router;
