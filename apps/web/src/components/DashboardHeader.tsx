type DashboardHeaderProps = {
  activeNav: string;
  userName?: string;
};

export default function DashboardHeader({
  activeNav,
  userName,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div>
        <span className="auth-kicker">YOUR FINANCIAL SPACE</span>
        <h1>{activeNav}</h1>
        <p>Hai, {userName || "teman"}! Yuk, rapikan keuanganmu.</p>
      </div>

      <div className="header-avatar">
        {(userName || "P").charAt(0).toUpperCase()}
      </div>
    </header>
  );
}
