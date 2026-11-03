import { useEffect, useState } from "react";
import { authClient } from "./lib/auth-client";
import {
  getTransactions,
  type Transaction,
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
        getTransactions(),
      ]);

      setWallets(walletData);
      setTransactions(transactionData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data dashboard.",
      );
    } finally {
      setIsDashboardDataLoading(false);
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
            onTransactionSaved={async (saved) => {
              setTransactions((current) => {
                const exists = current.some(
                  (transaction) => transaction.id === saved.id,
                );

                if (exists) {
                  return current.map((transaction) =>
                    transaction.id === saved.id ? saved : transaction,
                  );
                }

                return [saved, ...current];
              });

              await loadDashboardData();
            }}
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
