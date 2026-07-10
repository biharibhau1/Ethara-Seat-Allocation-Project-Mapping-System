import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEMO_LOGINS = [
    { role: "Admin", username: "admin", password: "admin123" },
    { role: "HR", username: "hr", password: "hr123" },
    { role: "Manager", username: "manager", password: "manager123" },
    { role: "Employee", username: "employee", password: "employee123" },
];

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (u, p) => {
        setUsername(u);
        setPassword(p);
    };

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <div className="font-display font-semibold text-xl text-ink">Ethara</div>
                    <div className="text-xs text-muted uppercase tracking-wide mt-0.5">Seat Allocation</div>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6">
                    <h1 className="font-display font-semibold text-lg mb-4">Sign in</h1>

                    {error && (
                        <div className="mb-4 text-sm px-3 py-2 rounded-md bg-maintenance-bg text-maintenance">
                            {error}
                        </div>
                    )}

                    <label className="text-xs text-muted uppercase tracking-wide">Username</label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 mb-3 w-full border border-line rounded-md px-3 py-2 text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        autoFocus
                    />

                    <label className="text-xs text-muted uppercase tracking-wide">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 mb-5 w-full border border-line rounded-md px-3 py-2 text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <div className="mt-4 bg-surface border border-line rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-muted mb-2">Demo logins</div>
                    <div className="grid grid-cols-2 gap-2">
                        {DEMO_LOGINS.map((d) => (
                            <button
                                key={d.username}
                                onClick={() => fillDemo(d.username, d.password)}
                                className="text-left text-xs px-2.5 py-1.5 rounded-md border border-line hover:bg-canvas"
                            >
                                <div className="font-medium">{d.role}</div>
                                <div className="text-muted font-mono">{d.username}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}