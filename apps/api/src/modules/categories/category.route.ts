import { Router } from "express";
import { pool } from "../../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Fetching categories...");

  const result = await pool.query(
    `
        SELECT id, name, type, icon, color
        FROM categories
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY type, name
    `,
    [userId],
  );

  req.log.info({ userId }, "Categories fetched successfully");

  res.status(200).json({ data: result.rows });
});

export default router;
