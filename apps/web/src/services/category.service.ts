import { api } from "../lib/api";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

interface ListResponse<T> {
  data: T[];
}

interface ItemResponse<T> {
  data: T;
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<ListResponse<Category>>("/api/categories");

  return response.data.data;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const response = await api.post<ItemResponse<Category>>(
    "/api/categories",
    input,
  );

  return response.data.data;
}
