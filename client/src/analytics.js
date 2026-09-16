export const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' }
];

export const COLORS = {
  applied: '#3b82f6',
  intro: '#f59e0b',
  tech: '#a78bfa',
  offer: '#22c55e',
  started: '#22d3ee'
};

export const PASS_LINES = [
  { key: 'appliedToIntro', label: 'Applied → Intro', color: COLORS.intro },
  { key: 'introToTech', label: 'Intro → Tech', color: COLORS.tech },
  { key: 'techToOffer', label: 'Tech → Offer', color: COLORS.offer },
  { key: 'offerToStarted', label: 'Offer → Started', color: COLORS.started }
];

export function pct(part, total) {
  if (!total) return '0%';
  return `${Number(((part / total) * 100).toFixed(1))}%`;
}

export function formatDelta(delta) {
  if (delta == null) return '—';
  return `${delta > 0 ? '+' : ''}${delta} pp`;
}

export function deltaClass(delta) {
  if (delta == null || delta === 0) return 'delta flat';
  return delta > 0 ? 'delta up' : 'delta down';
}

export function rangeLabel(range) {
  return RANGES.find((item) => item.value === range)?.label?.toLowerCase() || 'selected range';
}
