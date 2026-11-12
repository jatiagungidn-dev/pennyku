export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface CategoryRepositoryResult<T> {
  data: T[];
  count: number;
}
