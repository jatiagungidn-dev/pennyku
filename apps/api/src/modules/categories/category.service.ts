import { AppError } from "../../errors/AppError.js";
import { categoryRepository } from "./category.repository.js";
import { createCategorySchema } from "./category.schema.js";

export const categoryService = {
  getCategories(userId: string) {
    return categoryRepository.getCategories(userId);
  },

  async postCategory(userId: string, input: unknown) {
    const parsed = createCategorySchema.safeParse(input);

    if (!parsed.success) {
      throw new AppError("Invalid category data", 400);
    }

    const category = await categoryRepository.postCategory(userId, parsed.data);

    if (!category) {
      throw new AppError("Failed to create category", 500);
    }

    return category;
  },
};
