const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  applications: (q = '', status = '', extra = {}) => {
    const params = new URLSearchParams({ q, status });
    if (extra.analysis) params.set('analysis', extra.analysis);
    if (extra.platform) params.set('platform', extra.platform);
    if (extra.company) params.set('company', extra.company);
    if (extra.from) params.set('from', extra.from);
    if (extra.to) params.set('to', extra.to);
    return request(`/applications?${params}`);
  },
  filterOptions: () => request('/applications/filter-options'),
  analysisOverview: () => request('/applications/analysis-overview'),
  analytics: (range = '30d') => request(`/analytics/overview?range=${encodeURIComponent(range)}`),
  get: (id) => request(`/applications/${id}`),
  update: (id, data) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  retry: (id) => request(`/applications/${id}/retry`, { method: 'POST' }),
  cancelAnalysis: (id) => request(`/applications/${id}/cancel`, { method: 'POST' }),
  remove: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
  downloadUrl: (id) => `${BASE}/applications/${id}/download`
};
