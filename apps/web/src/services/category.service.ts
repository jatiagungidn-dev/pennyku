import { api } from "../lib/api";

export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
}

interface ListResponse<T> {
  data: T[];
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<ListResponse<Category>>("/api/categories");

  return response.data.data;
}
