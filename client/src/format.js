export const STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'intro', label: 'Intro' },
  { value: 'tech', label: 'Tech' },
  { value: 'offer', label: 'Offer' },
  { value: 'started', label: 'Started' }
];

export function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label || value;
}

export const ANALYSIS_FILTERS = [
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Analyzing' },
  { value: 'ready', label: 'Ready' },
  { value: 'error', label: 'Failed' },
  { value: 'stopped', label: 'Stopped' }
];

export function analysisLabel(value) {
  return ANALYSIS_FILTERS.find((item) => item.value === value)?.label || 'Ready';
}

export function isSummaryReady(row) {
  return !row?.analysisStatus || row.analysisStatus === 'ready';
}

export function formatAppliedDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || '—';
  }
}

export function listOrNotSpecified(values) {
  if (typeof values === 'string') return values.trim() || 'Not specified';
  if (!Array.isArray(values) || !values.length) return 'Not specified';
  return values.filter(Boolean).join('; ') || 'Not specified';
}

export function renderSummaryText(row) {
  return [
    `Job Title: ${row.jobTitle || 'Not specified'}`,
    '',
    `Company: ${row.company || 'Not specified'}`,
    '',
    `Salary / Compensation: ${row.compensation || 'Not specified'}`,
    '',
    `Location: ${row.location || 'Not specified'}`,
    '',
    `Job Type: ${row.jobType || 'Not specified'}`,
    '',
    `Technical Skills: ${listOrNotSpecified(row.requiredSkills)}`,
    '',
    `Soft Skills: ${listOrNotSpecified(row.softSkills)}`,
    '',
    `Preferred Skills: ${listOrNotSpecified(row.preferredSkills)}`,
    '',
    `Company Founded: ${row.companyFounded || 'Not specified'}`,
    '',
    `Approximate Employee Count: ${row.approximateEmployeeCount || 'Not specified'}`,
    '',
    'What do you know about our company?',
    '',
    row.companySummary || 'Not specified'
  ].join('\n');
}

export function chartTick(ymd) {
  const date = new Date(`${ymd}T12:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
