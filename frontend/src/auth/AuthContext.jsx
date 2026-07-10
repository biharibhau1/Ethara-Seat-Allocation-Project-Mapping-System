import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { username, role, employee_id }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        api
            .me()
            .then((u) => setUser(u))
            .catch(() => setToken(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const data = await api.login(username, password);
        setToken(data.access_token);
        setUser({ username: data.username, role: data.role, employee_id: data.employee_id });
        return data;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

// Roles allowed to create/update/delete employees, projects, and seats,
// and to allocate/release seats. Everyone else (manager, employee) gets
// read-only access in the UI, matching the backend's RBAC rules.
export const CAN_WRITE_ROLES = ["admin", "hr"];