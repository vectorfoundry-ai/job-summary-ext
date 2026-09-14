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
  applications: (q = '', status = '') =>
    request(`/applications?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`),
  analytics: (range = '30d') => request(`/analytics/overview?range=${encodeURIComponent(range)}`),
  get: (id) => request(`/applications/${id}`),
  update: (id, data) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/applications/${id}`, { method: 'DELETE' }),
  downloadUrl: (id) => `${BASE}/applications/${id}/download`
};
