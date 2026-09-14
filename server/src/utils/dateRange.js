const RANGES = new Set(['7d', '30d', '90d', '1y', 'all']);

export function toLocalYmd(value) {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseRange(range = '30d') {
  const key = RANGES.has(range) ? range : '30d';
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  if (key === '7d') start.setDate(start.getDate() - 6);
  else if (key === '30d') start.setDate(start.getDate() - 29);
  else if (key === '90d') start.setDate(start.getDate() - 89);
  else if (key === '1y') start.setFullYear(start.getFullYear() - 1);
  else if (key === 'all') return { key, start: null, end };

  return { key, start, end };
}

export function eachLocalDay(start, end) {
  const days = [];
  if (!start || !end) return days;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(toLocalYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatLongDate(ymd) {
  const date = new Date(`${ymd}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function rangeCaption(_key, start, end) {
  if (!start || !end) return 'all time';
  const sameYear = start.getFullYear() === end.getFullYear();
  const opts = { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) };
  const from = start.toLocaleDateString('en-US', opts);
  const to = end.toLocaleDateString('en-US', opts);
  return `${from} to ${to}`;
}
