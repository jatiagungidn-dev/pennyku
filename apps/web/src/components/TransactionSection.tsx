import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createTransaction,
  getCategories,
  getTransactions,
  type Category,
  type Transaction,
  type TransactionType,
} from "../lib/transactions";
import { getWallets, type Wallet } from "../lib/wallets";

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(value);

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function TransactionSection() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<TransactionType>("expense");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [walletData, categoryData, transactionData] = await Promise.all([
          getWallets(),
          getCategories(),
          getTransactions(),
        ]);

        setWallets(walletData);
        setCategories(categoryData);
        setTransactions(transactionData);
        setWalletId((current) => current || walletData[0]?.id || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data transaksi.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId("");
    }
  }, [filteredCategories, categoryId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Nominal harus lebih besar dari nol.");
      return;
    }

    if (!walletId) {
      setError("Buat wallet terlebih dahulu sebelum mencatat transaksi.");
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

      setTransactions((current) => [
        {
          ...created,
          wallet_name: created.wallet_name ?? wallet?.name,
          category_name: created.category_name ?? category?.name ?? null,
        },
        ...current,
      ]);

      setAmount("");
      setDescription("");
      setCategoryId("");
      setTransactionDate(today());
      setSuccess("Transaksi berhasil disimpan!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p role="status">Memuat data transaksi...</p>;
  }

  return (
    <section className="transaction-section">
      <div className="section-heading">
        <div>
          <h2>Transactions</h2>
          <p>Catat uang masuk dan keluar dari wallet-mu.</p>
        </div>
      </div>

      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-message success" role="status">
          {success}
        </p>
      )}

      {wallets.length === 0 ? (
        <div className="empty-state">
          <h3>Belum ada wallet</h3>
          <p>Buat wallet terlebih dahulu sebelum mencatat transaksi.</p>
        </div>
      ) : (
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
      )}

      <div className="transaction-history">
        <h3>Recent transactions</h3>

        {transactions.length === 0 ? (
          <p>Belum ada transaksi. Yuk, catat transaksi pertamamu!</p>
        ) : (
          <div className="wallet-list">
            {transactions.map((transaction) => (
              <article className="wallet-item" key={transaction.id}>
                <div className="wallet-item-icon">
                  {transaction.type === "income" ? "↙" : "↗"}
                </div>
                <div className="wallet-item-details">
                  <strong>
                    {transaction.description ||
                      transaction.category_name ||
                      (transaction.type === "income" ? "Income" : "Expense")}
                  </strong>
                  <span>
                    {transaction.wallet_name ?? "Wallet"} ·{" "}
                    {transaction.category_name ?? "Uncategorized"} ·{" "}
                    {transaction.transaction_date}
                  </span>
                </div>
                <strong className="wallet-item-balance">
                  {transaction.type === "income" ? "+" : "-"}
                  {formatIDR(Number(transaction.amount))}
                </strong>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
