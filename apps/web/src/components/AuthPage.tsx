import { useState, type FormEvent } from "react";
import { authClient } from "../lib/auth-client";
import Brand from "./Brand";

type AuthMode = "login" | "signup";

export default function AuthPage() {
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

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
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
              onClick={() => switchMode("signup")}
            >
              Daftar
            </button>

            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
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
              onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
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
