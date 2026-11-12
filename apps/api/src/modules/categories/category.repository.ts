import { pool } from "../../config/db.js";
import type {
  Category,
  CategoryRepositoryResult,
  CreateCategoryPayload,
} from "../../types/category.js";

export const categoryRepository = {
  async getCategories(
    userId: string,
  ): Promise<CategoryRepositoryResult<Category>> {
    const result = await pool.query<Category>(
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

  async postCategory(
    userId: string,
    data: CreateCategoryPayload,
  ): Promise<Category | null> {
    const result = await pool.query<Category>(
      `
      INSERT INTO categories
        (name, type, icon, color, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, type, icon, color, created_at, updated_at
    `,
      [data.name, data.type, data.icon, data.color, userId],
    );

    return result.rows[0] ?? null;
  },
};
