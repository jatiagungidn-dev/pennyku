import { pool } from "../../config/db.js";

export const categoryRepository = {
  async getCategories(userId: string) {
    const result = await pool.query(
      `
        SELECT id, name, type, icon, color
            FROM categories
            WHERE user_id IS NULL OR user_id = $1
            ORDER BY type, name
    `,
      [userId],
    );

    return { data: result.rows, count: result.rowCount ?? 0 };
  },
};
