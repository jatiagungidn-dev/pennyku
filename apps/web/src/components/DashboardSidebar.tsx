import Brand from "./Brand";

type DashboardSidebarProps = {
  user: {
    name?: string;
    email?: string;
  };
  activeNav: string;
  onNavChange: (label: string) => void;
  onLogout: () => void;
};

const navItems = [
  { label: "Overview", icon: "◫" },
  { label: "Wallets", icon: "▣" },
  { label: "Transactions", icon: "⇄" },
];

export default function DashboardSidebar({
  user,
  activeNav,
  onNavChange,
  onLogout,
}: DashboardSidebarProps) {
  return (
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
            onClick={() => onNavChange(item.label)}
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
  );
}
