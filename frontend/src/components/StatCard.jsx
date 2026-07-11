import { Link } from "react-router-dom";

export default function StatCard({ label, value, tone = "default", to }) {
  const toneClasses = {
    default: "text-ink",
    available: "text-available",
    occupied: "text-occupied",
    reserved: "text-reserved",
    maintenance: "text-maintenance",
  };

  // Colored left-edge accent per tone, echoing the accent-green language
  // used on the login page instead of every card looking identical.
  const borderClasses = {
    default: "border-l-line",
    available: "border-l-available",
    occupied: "border-l-occupied",
    reserved: "border-l-reserved",
    maintenance: "border-l-maintenance",
  };

  const content = (
    <>
      <div className="text-xs uppercase tracking-wide text-muted mb-1.5">{label}</div>
      <div className={`font-display font-semibold text-2xl ${toneClasses[tone]}`}>
        {value ?? "—"}
      </div>
    </>
  );

  const borderStyle = `border-l-[3px] ${borderClasses[tone]}`;

  if (to) {
    return (
      <Link
        to={to}
        className={`block bg-surface border border-line ${borderStyle} rounded-lg px-5 py-4 transition-colors hover:border-brand hover:bg-brand-light/40 cursor-pointer`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`bg-surface border border-line ${borderStyle} rounded-lg px-5 py-4`}>{content}</div>;
}