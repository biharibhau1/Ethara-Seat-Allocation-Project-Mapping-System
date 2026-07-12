import { useEffect, useState } from "react";
import { api } from "../api";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setProfile)
      .catch((e) => setLoadError(e.message));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPwSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPwError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="font-display font-semibold text-2xl text-ink">Settings</h1>
        <p className="text-muted text-sm mt-1">Your account and profile.</p>
      </header>

      {loadError && <div className="text-sm text-maintenance mb-6">{loadError}</div>}

      <section className="mb-8">
        <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted mb-3">
          Profile
        </h2>
        <div className="bg-surface border border-line rounded-lg p-5">
          {!profile ? (
            <div className="text-sm text-muted">Loading…</div>
          ) : (
            <dl className="text-sm grid grid-cols-[120px_1fr] gap-y-3">
              <dt className="text-muted">Username</dt>
              <dd className="font-medium">{profile.username}</dd>

              <dt className="text-muted">Role</dt>
              <dd>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-light text-brand uppercase tracking-wide">
                  {profile.role}
                </span>
              </dd>

              {profile.employee ? (
                <>
                  <dt className="text-muted">Linked employee</dt>
                  <dd className="font-medium">{profile.employee.name}</dd>

                  <dt className="text-muted">Email</dt>
                  <dd>{profile.employee.email}</dd>

                  <dt className="text-muted">Department</dt>
                  <dd>{profile.employee.department || "—"}</dd>

                  <dt className="text-muted">Job role</dt>
                  <dd>{profile.employee.role || "—"}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">Linked employee</dt>
                  <dd className="text-muted italic">
                    None — this login isn't tied to an employee record.
                  </dd>
                </>
              )}
            </dl>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted mb-3">
          Change password
        </h2>
        <form onSubmit={handleChangePassword} className="bg-surface border border-line rounded-lg p-5">
          {pwError && (
            <div className="mb-4 text-sm px-3 py-2 rounded-md bg-maintenance-bg text-maintenance">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 text-sm px-3 py-2 rounded-md bg-available-bg text-available">
              {pwSuccess}
            </div>
          )}

          <label className="text-xs text-muted uppercase tracking-wide">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 mb-3 w-full border border-line rounded-md px-3 py-2 text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            required
          />

          <label className="text-xs text-muted uppercase tracking-wide">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 mb-3 w-full border border-line rounded-md px-3 py-2 text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            required
          />

          <label className="text-xs text-muted uppercase tracking-wide">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 mb-5 w-full border border-line rounded-md px-3 py-2 text-sm bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            required
          />

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}