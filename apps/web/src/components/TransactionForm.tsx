import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createTransaction,
  getCategories,
  type Category,
  type Transaction,
  type TransactionType,
} from "../lib/transactions";
import type { Wallet } from "../lib/wallets";
import { today } from "../lib/format";

type TransactionFormProps = {
  wallets: Wallet[];
  onTransactionCreated: (transaction: Transaction) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function TransactionForm({
  wallets,
  onTransactionCreated,
  onError,
  onSuccess,
}: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<TransactionType>("expense");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Gagal memuat kategori.");
      }
    }

    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId("");
    }
  }, [filteredCategories, categoryId]);

  useEffect(() => {
    if (!walletId && wallets.length > 0) {
      setWalletId(wallets[0].id);
    }
  }, [walletId, wallets]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    onSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      onError("Nominal harus lebih besar dari nol.");
      return;
    }

    if (!walletId) {
      onError("Buat wallet terlebih dahulu sebelum mencatat transaksi.");
      return;
    }

    setSaving(true);

    try {
      const created = await createTransaction({
        wallet_id: walletId,
        category_id: categoryId || null,
        type,
        amount: numericAmount,
        description: description.trim() || undefined,
        transaction_date: transactionDate,
      });

      const wallet = wallets.find((item) => item.id === created.wallet_id);
      const category = categories.find(
        (item) => item.id === created.category_id,
      );

      onTransactionCreated({
        ...created,
        wallet_name: created.wallet_name ?? wallet?.name,
        category_name: created.category_name ?? category?.name ?? null,
      });

      setAmount("");
      setDescription("");
      setCategoryId("");
      setTransactionDate(today());
      onSuccess("Transaksi berhasil disimpan!");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (wallets.length === 0) {
    return (
      <div className="empty-state">
        <h3>Belum ada wallet</h3>
        <p>Buat wallet terlebih dahulu sebelum mencatat transaksi.</p>
      </div>
    );
  }

  return (
    <form className="wallet-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Transaction type</label>

        <div className="transaction-type-options">
          <button
            type="button"
            className={
              type === "expense" ? "type-option selected" : "type-option"
            }
            onClick={() => setType("expense")}
            aria-pressed={type === "expense"}
          >
            Expense
          </button>

          <button
            type="button"
            className={
              type === "income" ? "type-option selected" : "type-option"
            }
            onClick={() => setType("income")}
            aria-pressed={type === "income"}
          >
            Income
          </button>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="transaction-wallet">Wallet</label>
        <select
          id="transaction-wallet"
          value={walletId}
          onChange={(event) => setWalletId(event.target.value)}
          required
        >
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="transaction-category">Category</label>
        <select
          id="transaction-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Uncategorized</option>

          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="transaction-amount">Amount (IDR)</label>
        <input
          id="transaction-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="50000"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="transaction-description">Description</label>
        <input
          id="transaction-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={255}
          placeholder="Contoh: Makan siang"
        />
      </div>

      <div className="form-field">
        <label htmlFor="transaction-date">Transaction date</label>
        <input
          id="transaction-date"
          type="date"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          required
        />
      </div>

      <button className="submit-button" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save transaction"}
      </button>
    </form>
  );
}
