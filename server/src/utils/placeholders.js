export function placeholderTitle(pageTitle, url) {
  const title = String(pageTitle || '').replace(/\s+/g, ' ').trim();
  if (title) return title.slice(0, 180);
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Queued job';
  } catch {
    return 'Queued job';
  }
}

export function placeholderCompany(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Analyzing…';
  } catch {
    return 'Analyzing…';
  }
}
