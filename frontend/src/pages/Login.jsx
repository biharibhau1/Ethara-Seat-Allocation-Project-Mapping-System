import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./login.css";

const FEATURES = [
    { title: "Role-based access", desc: "Admins & HR allocate seats, everyone else gets read-only search." },
    { title: "Live floor map", desc: "See every seat by floor and zone, color-coded by status." },
    { title: "AI assistant", desc: "Ask where someone sits or which seats are free, in plain English." },
];

const DEMO_LOGINS = [
    { role: "Admin", username: "admin", password: "admin123" },
    { role: "HR", username: "hr", password: "hr123" },
    { role: "Manager", username: "manager", password: "manager123" },
    { role: "Employee", username: "employee", password: "employee123" },
];

const ArrowRight = () => (
    <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="auth-btn-arrow"
    >
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

const AlertIcon = () => (
    <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
    >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
    </svg>
);

const CheckIcon = () => (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

const LockIcon = () => (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="11" width="18" height="11" rx="1" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (u, p) => {
        setUsername(u);
        setPassword(p);
    };

    return (
        <div className="auth-page">
            {/* ── Left panel ─────────────────────────────────── */}
            <div className="auth-left">
                <div className="auth-watermark">ES</div>
                <div className="auth-shape auth-shape1" />
                <div className="auth-shape auth-shape2" />
                <div className="auth-shape auth-shape3" />

                <div className="auth-left-logo">
                    <div className="auth-brand-mark">
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0F151C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </div>
                    <div>
                        <div className="auth-brand-name">Ethara</div>
                        <div className="auth-brand-sub">SeatSync Console</div>
                    </div>
                </div>

                <div className="auth-left-body">
                    <h1 className="auth-headline">
                        See every seat.
                        <br />
                        Place every <em>team.</em>
                    </h1>
                    <p className="auth-sub">
                        One workspace for seating, projects, and floor utilization across
                        the whole company — with an assistant that answers in plain English.
                    </p>

                    <div className="auth-feature-list">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="auth-feature-item">
                                <div className="auth-feature-icon">
                                    <CheckIcon />
                                </div>
                                <div className="auth-feature-text">
                                    <h4>{f.title}</h4>
                                    <p>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="auth-left-divider" />

                    <div className="auth-stat-row">
                        {[
                            ["5,000", "Employees"],
                            ["5,500", "Seats"],
                            ["5", "Floors"],
                        ].map(([v, l]) => (
                            <div key={l}>
                                <div className="auth-stat-val">{v}</div>
                                <div className="auth-stat-label">{l}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="auth-left-foot">
                    <div className="auth-foot-credit">© 2026 Ethara · FastAPI · React</div>
                </div>
            </div>

            {/* ── Right panel ────────────────────────────────── */}
            <div className="auth-right">
                <div className="auth-form-wrap">
                    <div style={{ marginBottom: 28 }}>
                        <div className="auth-form-title">
                            <span>Welcome</span> back.
                        </div>
                        <p className="auth-form-desc">Sign in to access the seat allocation console.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="auth-error-box">
                                <AlertIcon />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="auth-field-wrap">
                            <div className="auth-field-label">
                                <span>
                                    <span className="auth-field-num">01</span>Username
                                </span>
                            </div>
                            <input
                                className="auth-field-input"
                                type="text"
                                placeholder="e.g. admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="auth-field-wrap">
                            <div className="auth-field-label">
                                <span>
                                    <span className="auth-field-num">02</span>Password
                                </span>
                            </div>
                            <input
                                className="auth-field-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="auth-spinner" />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-demo-row">
                        <div className="auth-demo-label">Demo logins</div>
                        <div className="auth-demo-grid">
                            {DEMO_LOGINS.map((d) => (
                                <button key={d.username} type="button" className="auth-demo-btn" onClick={() => fillDemo(d.username, d.password)}>
                                    <strong>{d.role}</strong>
                                    <span>{d.username}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="auth-trust-row">
                        <div className="auth-trust-dot" />
                        <LockIcon />
                        <span className="auth-trust-text">JWT secured · role-based access · demo data only</span>
                    </div>
                </div>
            </div>
        </div>
    );
}