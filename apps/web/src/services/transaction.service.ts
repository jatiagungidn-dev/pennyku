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

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionSummary {
  totalIncome: string;
  totalExpense: string;
  totalTransactions: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: TransactionPagination;
  summary: TransactionSummary;
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

interface ItemResponse<T> {
  data: T;
}

export async function getTransactions(
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedTransactions> {
  const response = await api.get<PaginatedTransactions>("/api/transactions", {
    params: { page, limit },
  });

  return response.data;
}

export async function createTransaction(
  input: CreateTransactionInput,
  idempotencyKey: string,
): Promise<Transaction> {
  const response = await api.post<ItemResponse<Transaction>>(
    "/api/transactions",
    input,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );

  return response.data.data;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const response = await api.patch<ItemResponse<Transaction>>(
    `/api/transactions/${id}`,
    input,
  );

  return response.data.data;
}
