export function StatCard({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="muted">{label}</div>
      <div className="statValue">{value}</div>
      {sub ? <div className="muted small">{sub}</div> : null}
    </div>
  );
}
