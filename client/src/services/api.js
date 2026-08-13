const BASE = '/api/v1';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function apiGet(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ).toString();
  return apiRequest(`${path}${query ? `?${query}` : ''}`);
}

async function apiPost(path, body) {
  return apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchSearch(params) {
  return apiGet('/search', params);
}
export function fetchAutocomplete(q, limit = 8) {
  return apiGet('/autocomplete', { q, limit });
}
export function fetchMetrics() {
  return apiGet('/metrics');
}
export function fetchAnalytics() {
  return apiGet('/analytics');
}
export function fetchHealth() {
  return apiGet('/health');
}
export function login(credentials) {
  return apiPost('/auth/login', credentials);
}
