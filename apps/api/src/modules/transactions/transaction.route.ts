import { Router } from "express";
import z from "zod";
import { pool } from "../../config/db.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "./transaction.schema.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;
  req.log.debug({ userId }, "Fetching transactions...");

  try {
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

    if (result.rowCount === 0) {
      req.log.warn(
        { userId },
        "Fetching transactions failed: Transaction is empty",
      );

      return res.status(404).json({ error: "Transaction is empty" });
    }

    req.log.info(
      { userId, count: result.rowCount },
      "Fetching transactions successfully",
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    req.log.error({ userId, err }, "Failed to fetch transactions");

    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Creating transaction...");

  const parsed = createTransactionSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      { userId, error: parsed.error.flatten().fieldErrors },
      "Creating transaction failed: Missing transaction data",
    );

    return res
      .status(400)
      .json({ error: "Invalid transaction data", detail: parsed.error.issues });
  }

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
      req.log.warn({ userId }, "Creating transaction failed: Wallet not found");

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
        req.log.warn(
          { userId },
          "Creating transaction failed: Category not found or incompatible with transaction type",
        );

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

    req.log.info({ userId }, "Creating transaction successfully");

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ userId, err }, "Failed to create transactions");

    res.status(500).json({ error: "Failed to create transactions" });
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req, res) => {
  const userId = req.auth!.userId;
  const { id } = req.params;

  req.log.debug({ userId, transactionId: id }, "Updating transaction...");

  if (!id) {
    req.log.warn(
      { userId, transactionId: id },
      "Updating transaction failed: Invalid transaction ID",
    );

    return res.status(400).json({ error: "Invalid transaction ID" });
  }

  const parsed = updateTransactionSchema.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn(
      { userId, transactionId: id, error: parsed.error.flatten().fieldErrors },
      "Updating transaction failed: Invalid transaction data",
    );

    return res
      .status(400)
      .json({ error: "Invalid transaction data", detail: parsed.error.issues });
  }

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
      req.log.warn(
        { userId, transactionId: id },
        "Updating transaction failed: Transaction not found",
      );

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

      req.log.warn(
        { userId, transactionId: id, error: validated.error.issues },
        "Updating transaction failed: Invalid transaction data",
      );

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
      [wallet_id, userId],
    );

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");

      req.log.warn(
        { userId, transactionId: id },
        "Updating transaction failed: Wallet not found",
      );

      return res.status(404).json({ error: "Wallet not found" });
    }

    if (category_id) {
      const categoryResult = await client.query(
        `
          SELECT id
          FROM categories
          WHERE id = $1 AND type = $2 AND (user_id IS NULL OR user_id = $3)
        `,
        [category_id, type, userId],
      );

      if (categoryResult.rowCount === 0) {
        await client.query("ROLLBACK");

        req.log.warn(
          { userId, transactionId: id },
          "Updating transaction failed: Category not found or incompatible with transaction type",
        );

        return res.status(404).json({
          error: "Category not found or incompatible with transaction type",
        });
      }
    }

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

    req.log.info(
      { userId, transactionId: id },
      "Update transaction successfully",
    );

    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error(
      { userId, transactionId: id, err },
      "Failed to update transaction",
    );

    res.status(500).json({ error: "Failed to update transaction" });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.auth!.userId;
  const { id } = req.params;

  req.log.debug({ userId, transactionId: id }, "Deleting transaction...");

  if (!id) {
    req.log.warn(
      { userId, transactionId: id },
      "Deleting transaction failed: Invalid transaction ID",
    );

    return res.status(400).json({ error: "Invalid transaction ID" });
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2
    `,
      [id, userId],
    );

    if (result.rowCount === 0) {
      req.log.warn(
        { userId },
        "Deleting transaction failed: Transaction not found",
      );

      return res.status(404).json({ error: "Transaction not found" });
    }

    req.log.info(
      { userId, transactionId: id },
      "Transaction deleted successfully",
    );

    res.status(204);
  } catch (err) {
    req.log.error(
      { userId, transactionId: id },
      "Failed to delete transaction",
    );

    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;
