const WINDOWS_RESERVED = /[<>:"/\\|?*\x00-\x1F]/g;

export function sanitizeFilenamePart(value) {
  const cleaned = String(value ?? '')
    .replace(WINDOWS_RESERVED, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/[. ]+$/g, '');

  return cleaned || 'Not specified';
}

export function buildSummaryFilename(company, jobTitle) {
  return `${sanitizeFilenamePart(company)}-${sanitizeFilenamePart(jobTitle)}.txt`;
}
