import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "◧" },
  { to: "/employees", label: "Employees", icon: "◔" },
  { to: "/seats", label: "Floor Map", icon: "▦" },
  { to: "/assistant", label: "Assistant", icon: "✦" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-surface h-screen sticky top-0 flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <div className="font-display font-semibold text-lg leading-tight text-ink">Ethara</div>
        <div className="text-xs text-muted tracking-wide uppercase mt-0.5">Seat Allocation</div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                ? "bg-brand-light text-brand"
                : "text-muted hover:bg-canvas hover:text-ink"
              }`
            }
          >
            <span className="text-base leading-none w-4 text-center">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-line">
        {user && (
          <div className="mb-3">
            <div className="text-sm font-medium text-ink">{user.username}</div>
            <div className="text-xs text-muted uppercase tracking-wide">{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-xs px-2.5 py-1.5 rounded-md border border-line text-muted hover:bg-canvas w-full text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}