import { api } from "../lib/api";

export type TransactionType = "income" | "expense";

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

export interface UpdateTransactionInput {
  wallet_id?: string;
  category_id?: string | null;
  type?: TransactionType;
  amount?: number;
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
    await api.get<ListResponse<Transaction>>("/api/transactions");

  return response.data.data;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const response = await api.post<ItemResponse<Transaction>>(
    "/api/transactions",
    input,
  );

  return response.data.data;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const response = await api.patch<ItemResponse<Transaction>>(
    `/api/transaction/${id}`,
    input,
  );

  return response.data.data;
}
