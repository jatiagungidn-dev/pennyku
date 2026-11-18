export type WalletType = "cash" | "bank" | "e-wallet" | "other";
export type UpdateWalletData = Required<UpdateWalletPayload>;
export type DatabaseNumeric = string;

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  initial_balance: DatabaseNumeric;
  current_balance: DatabaseNumeric;
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
