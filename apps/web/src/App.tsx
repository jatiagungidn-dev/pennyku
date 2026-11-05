import { useEffect, useState } from "react";
import { authClient } from "./lib/auth-client";
import {
  getTransactions,
  TransactionSummary,
  type Transaction,
  type TransactionPagination,
} from "./services/transaction.service";
import { getWallets, type Wallet } from "./services/wallet.service";
import AuthPage from "./components/AuthPage";
import DashboardSidebar from "./components/DashboardSidebar";
import DashboardHeader from "./components/DashboardHeader";
import OverviewSection from "./components/OverviewSection";
import WalletSection from "./components/WalletSection";
import TransactionSection from "./components/TransactionSection";

export default function App() {
  const session = authClient.useSession();

  const [activeNav, setActiveNav] = useState("Overview");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<TransactionSummary>({
    totalIncome: "0",
    totalExpense: "0",
    totalTransactions: 0,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDashboardDataLoading, setIsDashboardDataLoading] = useState(true);

  const isAuthenticated = Boolean(session.data?.user);

  async function loadDashboardData() {
    setIsDashboardDataLoading(true);
    setError("");

    try {
      const [walletData, transactionData] = await Promise.all([
        getWallets(),
        getTransactions(1, 10),
      ]);

      setWallets(walletData);
      setTransactions(transactionData.data);
      setPagination(transactionData.pagination);
      setSummary(transactionData.summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data dashboard.",
      );
    } finally {
      setIsDashboardDataLoading(false);
    }
  }

  async function handlePageChange(page: number) {
    try {
      const transactionData = await getTransactions(page, pagination.limit);

      setTransactions(transactionData.data);
      setPagination(transactionData.pagination);
      setSummary(transactionData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat transaksi.");
    }
  }

  async function handleTransactionSaved(_saved: Transaction) {
    try {
      const transactionData = await getTransactions(1, pagination.limit);

      setTransactions(transactionData.data);
      setPagination(transactionData.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat ulang transaksi",
      );
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDashboardData();
  }, [isAuthenticated]);

  function handleNavChange(newNav: string) {
    setActiveNav(newNav);
    setError("");
    setSuccess("");
  }

  if (session.isPending) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">P</div>
        <p>Menyiapkan ruang finansialmu...</p>
      </main>
    );
  }

  if (!session.data?.user) {
    return <AuthPage />;
  }

  const user = {
    name: session.data.user.name,
    email: session.data.user.email,
  };

  return (
    <main className="dashboard">
      <DashboardSidebar
        user={user}
        activeNav={activeNav}
        onNavChange={handleNavChange}
        onLogout={() => {
          void authClient.signOut();
        }}
      />

      <section className="dashboard-main">
        <DashboardHeader activeNav={activeNav} userName={user.name} />

        {error && (
          <div className="form-message error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="form-message success" role="status">
            {success}
          </div>
        )}

        {activeNav === "Overview" && (
          <OverviewSection
            wallets={wallets}
            transactions={transactions}
            summary={summary}
            loading={isDashboardDataLoading}
          />
        )}

        {activeNav === "Wallets" && (
          <WalletSection
            wallets={wallets}
            onRefreshWallets={loadDashboardData}
            onWalletsChange={setWallets}
            onError={setError}
            onSuccess={setSuccess}
          />
        )}

        {activeNav === "Transactions" && (
          <TransactionSection
            wallets={wallets}
            transactions={transactions}
            pagination={pagination}
            onPageChange={handlePageChange}
            onTransactionSaved={handleTransactionSaved}
            onError={setError}
            onSuccess={setSuccess}
          />
        )}

        <footer className="dashboard-footer">
          <span>PennyKu · Personal finance, made clearer.</span>
          <span>Take control, one step at a time.</span>
        </footer>
      </section>
    </main>
  );
}
