import { apiRequest } from "./api";

export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: string | number;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  wallet_name?: string;
  category_name?: string | null;
}

export interface CreateTransactionInput {
  wallet_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description?: string;
  transaction_date?: string;
}

interface ListResponse<T> {
  data: T[];
}

interface ItemResponse<T> {
  data: T;
}

export async function getTransactions(): Promise<Transaction[]> {
  const response =
    await apiRequest<ListResponse<Transaction>>("/api/transactions");

  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiRequest<ListResponse<Category>>("/api/categories");

  return response.data;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const response = await apiRequest<ItemResponse<Transaction>>(
    "/api/transactions",
    { method: "POST", body: JSON.stringify(input) },
  );

  return response.data;
}
