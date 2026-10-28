import { useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
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

  const navItems = [
    { label: "Overview", icon: "◫" },
    { label: "Wallets", icon: "▣" },
    { label: "Transactions", icon: "⇄" },
  ];

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Brand />

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
              {item.label === "Wallets" && <span className="nav-arrow">↗</span>}
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
            <h1>{activeNav === "Overview" ? "Overview" : activeNav}</h1>
            <p>Hai, {user.name || "teman"}! Yuk, rapikan keuanganmu.</p>
          </div>
          <div className="header-avatar">
            {(user.name || user.email || "P").charAt(0).toUpperCase()}
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-eyebrow">A FRESH START</span>
            <h2>Keuangan yang lebih teratur dimulai di sini.</h2>
            <p>
              Buat wallet pertamamu untuk mulai mencatat uang yang kamu miliki.
            </p>
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
            <strong>Belum tersedia</strong>
            <p>Buat wallet untuk mulai melacak saldo.</p>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Total income</span>
              <span className="summary-icon income-icon">↗</span>
            </div>
            <strong>Belum tersedia</strong>
            <p>Catatan pemasukan akan tampil di sini.</p>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Total expenses</span>
              <span className="summary-icon expense-icon">↘</span>
            </div>
            <strong>Belum tersedia</strong>
            <p>Catatan pengeluaran akan tampil di sini.</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="content-card wallet-section">
            <div className="section-heading">
              <div>
                <h2>My wallets</h2>
                <p>Semua tempat penyimpanan uangmu.</p>
              </div>
              <button
                className="text-button"
                onClick={() => setActiveNav("Wallets")}
              >
                View wallets ↗
              </button>
            </div>

            <div className="empty-state">
              <div className="empty-icon">▣</div>
              <h3>Wallet pertamamu dimulai di sini</h3>
              <p>
                Tambahkan Cash, Bank, atau E-Wallet untuk mulai mengatur saldo.
              </p>
              <button
                className="primary-button"
                onClick={() => setActiveNav("Wallets")}
              >
                Explore wallets <span>↗</span>
              </button>
              <span className="empty-hint">
                Wallet creation akan kita hubungkan ke API berikutnya.
              </span>
            </div>
          </article>

          <article className="content-card activity-section">
            <div className="section-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Aktivitas keuangan terbarumu.</p>
              </div>
            </div>

            <div className="activity-empty">
              <div className="activity-line">
                <span>↗</span>
              </div>
              <p>Belum ada aktivitas.</p>
              <span>Transaksi kamu akan muncul di sini.</span>
            </div>
          </article>
        </section>

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
