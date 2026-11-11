export type WalletType = "cash" | "bank" | "e-wallet" | "other";
export type UpdateWalletData = Required<UpdateWalletPayload>;

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  initial_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletPayload {
  name: string;
  type: WalletType;
  initialBalance: number;
}

export interface UpdateWalletPayload {
  name?: string;
  type?: WalletType;
}

export interface WalletRepositoryResult<T> {
  data: T[];
  count: number;
}
