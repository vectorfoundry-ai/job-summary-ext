const TRACKING = /^(utm_|fbclid|gclid|mc_eid|igshid|_hs)/i;

export function normalizeJobUrl(url) {
  try {
    const parsed = new URL(String(url).trim());
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING.test(key)) parsed.searchParams.delete(key);
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}
