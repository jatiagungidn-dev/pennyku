import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";

import {
  createTransaction,
  updateTransaction,
  type Transaction,
  type TransactionType,
} from "../services/transaction.service";

import { getCategories, type Category } from "../services/category.service";
import type { Wallet } from "../services/wallet.service";
import { today } from "../lib/format";

type TransactionFormProps = {
  wallets: Wallet[];
  initialTransaction?: Transaction | null;
  onTransactionSaved: (transaction: Transaction) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onCancel?: () => void;
};

export default function TransactionForm({
  wallets,
  initialTransaction = null,
  onTransactionSaved,
  onError,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const isEditing = Boolean(initialTransaction);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [type, setType] = useState<TransactionType>(
    initialTransaction?.type ?? "expense",
  );

  const [walletId, setWalletId] = useState(initialTransaction?.wallet_id ?? "");

  const [categoryId, setCategoryId] = useState(
    initialTransaction?.category_id ?? "",
  );

  const [amount, setAmount] = useState(
    initialTransaction ? String(initialTransaction.amount) : "",
  );

  const [description, setDescription] = useState(
    initialTransaction?.description ?? "",
  );

  const [transactionDate, setTransactionDate] = useState(
    initialTransaction?.transaction_date.slice(0, 10) ?? today(),
  );

  const [saving, setSaving] = useState(false);

  const idempotencyKeyRef = useRef<string | null>(null);

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
      } finally {
        setCategoriesLoaded(true);
      }
    }

    void loadCategories();
  }, [onError]);

  const selectedCategoryId = useMemo(() => {
    if (
      !categoriesLoaded ||
      !categoryId ||
      filteredCategories.some((category) => category.id === categoryId)
    ) {
      return categoryId;
    }

    return "";
  }, [categoriesLoaded, categoryId, filteredCategories]);

  const selectedWalletId = walletId || wallets[0]?.id || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onError("");
    onSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      onError("Nominal harus lebih besar dari nol.");
      return;
    }

    if (!selectedWalletId) {
      onError("Buat wallet terlebih dahulu sebelum mencatat transaksi.");
      return;
    }

    setSaving(true);

    try {
      const input = {
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId || null,
        type,
        amount: numericAmount,
        description: description.trim(),
        transaction_date: transactionDate,
      };

      let saved: Transaction;

      if (initialTransaction) {
        saved = await updateTransaction(initialTransaction.id, input);
      } else {
        const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
        idempotencyKeyRef.current = idempotencyKey;
        saved = await createTransaction(input, idempotencyKey);
      }

      const wallet = wallets.find((item) => item.id === saved.wallet_id);

      const category = categories.find((item) => item.id === saved.category_id);

      const transactionWithNames: Transaction = {
        ...saved,
        wallet_name: saved.wallet_name ?? wallet?.name,
        category_name: saved.category_name ?? category?.name ?? null,
      };

      onTransactionSaved(transactionWithNames);

      onSuccess(
        isEditing
          ? "Transaksi berhasil diperbarui!"
          : "Transaksi berhasil disimpan!",
      );

      if (!isEditing) {
        idempotencyKeyRef.current = null;
        setAmount("");
        setDescription("");
        setCategoryId("");
        setTransactionDate(today());
      }
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "Gagal memperbarui transaksi."
            : "Gagal menyimpan transaksi.",
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
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="transaction-form-header">
        <div>
          <h3>{isEditing ? "Edit transaction" : "New transaction"}</h3>
          <p>
            {isEditing
              ? "Perbarui informasi transaksimu."
              : "Catat uang masuk atau keluar dari wallet-mu."}
          </p>
        </div>
      </div>

      <div className="transaction-form-grid">
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
            value={selectedWalletId}
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
            value={selectedCategoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={!categoriesLoaded}
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
      </div>

      <div className="transaction-form-actions">
        {isEditing && onCancel && (
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}

        <button className="submit-button" type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : isEditing
              ? "Update transaction"
              : "Save transaction"}
        </button>
      </div>
    </form>
  );
}
