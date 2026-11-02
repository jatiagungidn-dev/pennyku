import { api } from "../lib/api";

export type WalletType = "cash" | "bank" | "e-wallet" | "other";

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  initial_balance: string | number;
  current_balance: string | number;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletInput {
  name: string;
  type: WalletType;
  initial_balance: number;
}

interface WalletListResponse {
  data: Wallet[];
}

interface WalletResponse {
  data: Wallet;
}

export async function getWallets(): Promise<Wallet[]> {
  const response = await api.get<WalletListResponse>("/api/wallets");

  return response.data.data;
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const response = await api.post<WalletResponse>("/api/wallets", input);

  return response.data.data;
}

export async function deleteWallet(id: string): Promise<void> {
  await api.delete(`/api/wallets/${id}`);
}
