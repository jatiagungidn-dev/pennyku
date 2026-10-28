import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import {
  createWallet,
  getWallets,
  type Wallet,
  type WalletType,
} from "./lib/wallets";
import "./App.css";

type AuthMode = "login" | "signup";

function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">P</div>
      <span>PennyKu</span>
    </div>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        setMessage(result.error.message ?? "Autentikasi gagal.");
      } else {
        setSuccess(true);
        setMessage(
          mode === "signup"
            ? "Akun berhasil dibuat. Memuat dashboard..."
            : "Login berhasil. Memuat dashboard...",
        );
      }
    } catch {
      setMessage("Terjadi kesalahan. Coba periksa koneksi dan Auth URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <Brand />

        <div className="showcase-content">
          <div className="eyebrow">
            <span className="status-dot" />
            YOUR MONEY, IN BETTER SHAPE
          </div>

          <h1>
            Uangmu.
            <br />
            <span>Masa depanmu.</span>
            <br />
            Kendali penuh.
          </h1>

          <p className="showcase-description">
            Kelola wallet, pantau pengeluaran, dan pahami ke mana uangmu pergi.
            Semua dalam satu tempat.
          </p>

          <div className="preview-card">
            <span className="preview-label">A BETTER MONEY HABIT</span>
            <h2>Mulai dari langkah kecil.</h2>
            <div className="preview-bars" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  style={{ height: `${25 + ((index * 29) % 70)}%` }}
                />
              ))}
            </div>
            <p className="preview-footnote">
              Satu tempat untuk mengatur keuanganmu.
            </p>
          </div>
        </div>

        <footer className="showcase-footer">
          <span>Made for your everyday money.</span>
          <span>© 2026 PennyKu</span>
        </footer>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand">
          <Brand />
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-kicker">
              {mode === "signup" ? "GET STARTED" : "WELCOME BACK"}
            </span>
            <h2>
              {mode === "signup"
                ? "Mulai dari sini."
                : "Senang melihatmu lagi."}
            </h2>
            <p>
              {mode === "signup"
                ? "Buat akun dan mulai rapikan keuanganmu."
                : "Masuk untuk melanjutkan perjalanan finansialmu."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Daftar
            </button>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Masuk
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-field">
                <label htmlFor="name">Nama lengkap</label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama kamu"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Alamat email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="kamu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={8}
                required
              />
            </div>

            {message && (
              <div
                className={`form-message ${success ? "success" : "error"}`}
                role="status"
              >
                {message}
              </div>
            )}

            <button className="submit-button" type="submit" disabled={loading}>
              {loading
                ? "Tunggu sebentar..."
                : mode === "signup"
                  ? "Buat akun gratis"
                  : "Masuk ke PennyKu"}
              {!loading && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "signup" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup" ? "Masuk di sini" : "Daftar sekarang"}
            </button>
          </p>

          <div className="security-note">◇ Autentikasi melalui Neon Auth</div>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({
  user,
  onLogout,
}: {
  user: { name?: string; email?: string };
  onLogout: () => void;
}) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("cash");
  const [balance, setBalance] = useState("0");

  async function loadWallets() {
    setLoading(true);
    setError("");

    try {
      const data = await getWallets();
      setWallets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat wallet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWallets();
  }, []);

  async function handleCreateWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const initialBalance = Number(balance);

    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      setError("Saldo awal harus berupa angka nol atau lebih.");
      setSaving(false);
      return;
    }

    try {
      const wallet = await createWallet({
        name: name.trim(),
        type,
        initial_balance: initialBalance,
      });

      setWallets((current) => [wallet, ...current]);
      setName("");
      setType("cash");
      setBalance("0");
      setShowForm(false);
      setSuccess("Wallet berhasil dibuat!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat wallet.");
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = wallets.reduce(
    (total, wallet) => total + Number(wallet.initial_balance),
    0,
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(amount);

  const walletTypeLabel: Record<WalletType, string> = {
    cash: "Cash",
    bank: "Bank",
    "e-wallet": "E-Wallet",
    other: "Other",
  };

  const navItems = [
    { label: "Overview", icon: "◫" },
    { label: "Wallets", icon: "▣" },
    { label: "Transactions", icon: "⇄" },
  ];

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <span>PennyKu</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={
                activeNav === item.label ? "nav-item active" : "nav-item"
              }
              onClick={() => setActiveNav(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">
              {(user.name || user.email || "P").charAt(0).toUpperCase()}
            </div>
            <div className="profile-copy">
              <strong>{user.name || "PennyKu User"}</strong>
              <span>{user.email || "Signed in"}</span>
            </div>
          </div>

          <button className="logout-button" onClick={onLogout}>
            ↪ <span>Log out</span>
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="auth-kicker">YOUR FINANCIAL SPACE</span>
            <h1>{activeNav}</h1>
            <p>Hai, {user.name || "teman"}! Yuk, rapikan keuanganmu.</p>
          </div>
          <div className="header-avatar">
            {(user.name || user.email || "P").charAt(0).toUpperCase()}
          </div>
        </header>

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
                  <span>Total initial balance</span>
                  <span className="summary-icon">◈</span>
                </div>
                <strong>
                  {loading ? "Memuat..." : formatCurrency(totalBalance)}
                </strong>
                <p>Gabungan saldo awal semua wallet.</p>
              </article>

              <article className="summary-card">
                <div className="summary-top">
                  <span>Total wallets</span>
                  <span className="summary-icon income-icon">▣</span>
                </div>
                <strong>{loading ? "..." : wallets.length}</strong>
                <p>Wallet yang sudah kamu buat.</p>
              </article>

              <article className="summary-card">
                <div className="summary-top">
                  <span>Transactions</span>
                  <span className="summary-icon expense-icon">⇄</span>
                </div>
                <strong>0</strong>
                <p>Fitur transaksi belum tersedia.</p>
              </article>
            </section>
          </>
        )}

        {activeNav === "Transactions" && (
          <section className="content-card">
            <h2>Transactions</h2>
            <p>Fitur transaksi akan kita bangun pada milestone berikutnya.</p>
          </section>
        )}

        {(activeNav === "Wallets" || activeNav === "Overview") && (
          <section className="content-card wallet-section">
            <div className="section-heading">
              <div>
                <h2>My wallets</h2>
                <p>Semua tempat penyimpanan uangmu.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setShowForm((current) => !current);
                  setError("");
                  setSuccess("");
                }}
              >
                {showForm ? "Cancel" : "+ Add wallet"}
              </button>
            </div>

            {showForm && (
              <form className="wallet-form" onSubmit={handleCreateWallet}>
                <div className="form-field">
                  <label htmlFor="wallet-name">Wallet name</label>
                  <input
                    id="wallet-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Dompet utama"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="wallet-type">Wallet type</label>
                  <select
                    id="wallet-type"
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as WalletType)
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="e-wallet">E-Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="wallet-balance">Initial balance (IDR)</label>
                  <input
                    id="wallet-balance"
                    type="number"
                    min="0"
                    max="99999999999999.99"
                    step="0.01"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                    required
                  />
                </div>

                <button
                  className="submit-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Create wallet"}
                </button>
              </form>
            )}

            {loading ? (
              <p role="status">Memuat wallet...</p>
            ) : wallets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▣</div>
                <h3>Wallet pertamamu dimulai di sini</h3>
                <p>
                  Tambahkan Cash, Bank, atau E-Wallet untuk mulai mengatur
                  saldo.
                </p>
                {!showForm && (
                  <button
                    className="primary-button"
                    onClick={() => setShowForm(true)}
                  >
                    Create your first wallet ↗
                  </button>
                )}
              </div>
            ) : (
              <div className="wallet-list">
                {wallets.map((wallet) => (
                  <article className="wallet-item" key={wallet.id}>
                    <div className="wallet-item-icon">▣</div>
                    <div className="wallet-item-details">
                      <strong>{wallet.name}</strong>
                      <span>{walletTypeLabel[wallet.type]}</span>
                    </div>
                    <strong className="wallet-item-balance">
                      {formatCurrency(Number(wallet.initial_balance))}
                    </strong>
                  </article>
                ))}
              </div>
            )}

            {!loading && error && (
              <button
                className="text-button"
                onClick={() => void loadWallets()}
              >
                Try loading again
              </button>
            )}
          </section>
        )}

        <footer className="dashboard-footer">
          <span>PennyKu · Personal finance, made clearer.</span>
          <span>Take control, one step at a time.</span>
        </footer>
      </section>
    </main>
  );
}

export default function App() {
  const session = authClient.useSession();

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

  return (
    <DashboardPage
      user={{
        name: session.data.user.name,
        email: session.data.user.email,
      }}
      onLogout={() => {
        void authClient.signOut();
      }}
    />
  );
}
