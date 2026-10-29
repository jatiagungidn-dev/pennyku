import { Router } from "express";
import { pool } from "../../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const result = await pool.query(
      `
        SELECT id, name, type, icon, color
        FROM categories
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY type, name
    `,
      [userId],
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("Failed to fetch categories:", err);

    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
