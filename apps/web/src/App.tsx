import { useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import "./App.css";

type AuthMode = "login" | "signup";

export default function App() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (result.error) {
          setMessage(result.error.message ?? "Gagal membuat akun. Coba lagi.");
        } else {
          setMessage("Akun berhasil dibuat. Selamat datang di PennyKu!");
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setMessage(result.error.message ?? "Login gagal. Periksa akunmu.");
        } else {
          setMessage("Login berhasil!");
        }
      }
    } catch {
      setMessage("Terjadi kesalahan. Periksa koneksi dan konfigurasi Auth.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <header className="brand">
          <div className="brand-icon">P</div>
          <span>PennyKu</span>
        </header>

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
            <div className="preview-top">
              <div>
                <span className="preview-label">FINANCIAL OVERVIEW</span>
                <h2>Lebih teratur, lebih tenang.</h2>
              </div>
              <div className="preview-symbol">↗</div>
            </div>

            <div className="preview-divider" />

            <div className="preview-stats">
              <div>
                <span className="preview-label">WALLETS</span>
                <strong>Cash · Bank · E-Wallet</strong>
              </div>
              <div className="preview-badge">Your way</div>
            </div>

            <div className="preview-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <p className="preview-footnote">
              Satu langkah kecil menuju keuangan yang lebih sehat.
            </p>
          </div>
        </div>

        <footer className="showcase-footer">
          <span>Made for your everyday money.</span>
          <span>© 2026 PennyKu</span>
        </footer>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand brand">
          <div className="brand-icon">P</div>
          <span>PennyKu</span>
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
                  type="text"
                  placeholder="Nama kamu"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Alamat email</label>
              <input
                id="email"
                type="email"
                placeholder="kamu@email.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {mode === "signup" && (
                <span className="field-hint">
                  Gunakan password yang kuat dan unik.
                </span>
              )}
            </div>

            {message && (
              <div
                className={`form-message ${
                  message.includes("berhasil") || message.includes("Selamat")
                    ? "success"
                    : "error"
                }`}
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

          <div className="security-note">
            <span aria-hidden="true">◇</span>
            <span>Autentikasi aman melalui Neon Auth</span>
          </div>
        </div>
      </section>
    </main>
  );
}
