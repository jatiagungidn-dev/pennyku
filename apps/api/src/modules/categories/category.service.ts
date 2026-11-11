import { categoryRepository } from "./category.repository.js";

export const categoryService = {
  async getCategories(userId: string) {
    return await categoryRepository.getCategories(userId);
  },
};
