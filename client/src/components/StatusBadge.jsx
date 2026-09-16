import { analysisLabel, statusLabel } from '../format.js';

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>;
}

export function AnalysisBadge({ status, error }) {
  const value = status || 'ready';
  return (
    <span className={`badge badge-analysis-${value}`} title={error || undefined}>
      {analysisLabel(value)}
    </span>
  );
}
