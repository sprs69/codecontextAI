const defaultBase =
  typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'http://localhost:8000';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultBase;

async function request(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      throw new Error(
        `Unable to connect to CodeContext AI backend at ${API_BASE}. Please verify the server is running on port 8000.`
      );
    }
    throw err;
  }
}

// ─── Repository ───────────────────────────────────────────────────────────
export const repositoryApi = {
  list: () => request('/api/repository/list'),
  get: (id) => request(`/api/repository/${id}`),
  loadDemo: () => request('/api/repository/demo', { method: 'POST' }),
  analyze: (path) =>
    request('/api/repository/analyze', {
      method: 'POST',
      body: JSON.stringify({ path, use_demo: false }),
    }),
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/repository/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  delete: (id) => request(`/api/repository/${id}`, { method: 'DELETE' }),
};

// ─── Architecture ─────────────────────────────────────────────────────────
export const architectureApi = {
  getComponents: (repoId) => request(`/api/architecture/${repoId}/components`),
  getRules: (repoId) => request(`/api/architecture/${repoId}/rules`),
  createRule: (repoId, data) =>
    request(`/api/architecture/${repoId}/rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Guardrails ───────────────────────────────────────────────────────────
export const guardrailsApi = {
  getViolations: (repoId, severity, status) => {
    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request(`/api/guardrails/${repoId}/violations${qs ? `?${qs}` : ''}`);
  },
  getSummary: (repoId) => request(`/api/guardrails/${repoId}/summary`),
  updateStatus: (repoId, violationId, status) =>
    request(`/api/guardrails/${repoId}/violations/${violationId}/status?status=${status}`, {
      method: 'PATCH',
    }),
};

// ─── PR Intelligence ──────────────────────────────────────────────────────
export const prApi = {
  analyze: (data) =>
    request('/api/pr/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDemo: () => request('/api/pr/demo'),
  getHistory: (repoId) => request(`/api/pr/history/${repoId}`),
};

// ─── Decisions ────────────────────────────────────────────────────────────
export const decisionsApi = {
  list: (repoId) => request(`/api/decisions/${repoId}`),
  create: (repoId, data) =>
    request(`/api/decisions/${repoId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  extract: (repoId, text) =>
    request(`/api/decisions/${repoId}/extract`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// ─── Onboarding ───────────────────────────────────────────────────────────
export const onboardingApi = {
  generate: (data) =>
    request('/api/onboarding/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHistory: (repoId) => request(`/api/onboarding/history/${repoId}`),
};

// ─── Health ───────────────────────────────────────────────────────────────
export const healthApi = {
  get: (repoId) => request(`/api/health/${repoId}`),
};
