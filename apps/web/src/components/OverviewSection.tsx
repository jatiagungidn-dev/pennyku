import { formatIDR } from "../lib/format";
import type { Transaction } from "../services/transaction.service";
import type { Wallet } from "../services/wallet.service";

type OverviewSectionProps = {
  wallets: Wallet[];
  transactions: Transaction[];
  loading: boolean;
};

export default function OverviewSection({
  wallets,
  transactions,
  loading,
}: OverviewSectionProps) {
  const totalBalance = wallets.reduce(
    (total, wallet) => total + Number(wallet.current_balance),
    0,
  );

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  return (
    <>
      <section className="welcome-banner">
        <div>
          <span className="banner-eyebrow">A FRESH START</span>
          <h2>Keuangan yang lebih teratur dimulai di sini.</h2>
          <p>Buat wallet untuk mulai mencatat uang yang kamu miliki.</p>
        </div>

        <div className="banner-art" aria-hidden="true">
          <div className="art-circle">₨</div>
          <div className="art-spark">✳</div>
        </div>
      </section>

      <section className="summary-grid" aria-label="Financial summary">
        <article className="summary-card balance-card">
          <div className="summary-top">
            <span>Total balance</span>
            <span className="summary-icon">◈</span>
          </div>

          <strong>{loading ? "Memuat..." : formatIDR(totalBalance)}</strong>
          <p>
            Income {loading ? "Memuat..." : formatIDR(totalIncome)}
            {" · "}
            Expense {loading ? "Memuat..." : formatIDR(totalExpense)}
          </p>
        </article>

        <article className="summary-card">
          <div className="summary-top">
            <span>Total wallets</span>
            <span className="summary-icon income-icon">▣</span>
          </div>

          <strong>{loading ? "..." : transactions.length}</strong>
          <p>Wallet yang sudah kamu buat.</p>
        </article>

        <article className="summary-card">
          <div className="summary-top">
            <span>Transactions</span>
            <span className="summary-icon expense-icon">⇄</span>
          </div>

          <strong>{transactions.length}</strong>
          <p>Semua transaksi yang sudah kamu catat.</p>
        </article>
      </section>
    </>
  );
}
