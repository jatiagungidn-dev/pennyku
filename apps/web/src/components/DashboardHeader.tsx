type DashboardHeaderProps = {
  activeNav: string;
  userName?: string;
  theme: "light" | "dark";
  onThemeToggle: () => void;
};

export default function DashboardHeader({
  activeNav,
  userName,
  theme,
  onThemeToggle,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div>
        <span className="auth-kicker">YOUR FINANCIAL SPACE</span>
        <h1>{activeNav}</h1>
        <p>Hai, {userName || "teman"}! Yuk, rapikan keuanganmu.</p>
      </div>

      <div className="header-actions">
        <button
          className="theme-toggle"
          type="button"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          aria-pressed={theme === "dark"}
        >
          <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>

        <div className="header-avatar">
          {(userName || "P").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
