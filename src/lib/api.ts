const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    signup: (data: {
      email: string;
      password: string;
      name: string;
      nis: string;
      class: string;
      commission_id?: string;
    }) => apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

    login: (email: string, password: string) =>
      apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () => apiFetch('/api/auth/me'),
  },

  users: {
    list: () => apiFetch('/api/users'),
    create: (data: any) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
    bulkCreate: (users: any[]) => apiFetch('/api/users/bulk', { method: 'POST', body: JSON.stringify({ users }) }),
  },

  commissions: {
    list: () => apiFetch('/api/commissions'),
  },

  programs: {
    list: () => apiFetch('/api/programs'),
    get: (id: string) => apiFetch(`/api/programs/${id}`),
    create: (data: any) => apiFetch('/api/programs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/programs/${id}`, { method: 'DELETE' }),
  },

  programTypes: {
    list: () => apiFetch('/api/program-types'),
  },

  programCategories: {
    list: () => apiFetch('/api/program-categories'),
  },

  panitiaAssignments: {
    list: (filters?: { program_id?: string; user_id?: string }) => {
      const params = new URLSearchParams();
      if (filters?.program_id) params.set('program_id', filters.program_id);
      if (filters?.user_id) params.set('user_id', filters.user_id);
      return apiFetch(`/api/panitia-assignments?${params}`);
    },
    create: (data: any) => apiFetch('/api/panitia-assignments', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreate: (assignments: any[]) => apiFetch('/api/panitia-assignments/bulk', { method: 'POST', body: JSON.stringify({ assignments }) }),
    delete: (id: string) => apiFetch(`/api/panitia-assignments/${id}`, { method: 'DELETE' }),
  },

  scores: {
    list: (filters?: { program_id?: string; grader_id?: string }) => {
      const params = new URLSearchParams();
      if (filters?.program_id) params.set('program_id', filters.program_id);
      if (filters?.grader_id) params.set('grader_id', filters.grader_id);
      return apiFetch(`/api/scores?${params}`);
    },
    create: (data: any) => apiFetch('/api/scores', { method: 'POST', body: JSON.stringify(data) }),
  },

  scoringRubrics: {
    list: (program_type?: string) => {
      const params = program_type ? `?program_type=${program_type}` : '';
      return apiFetch(`/api/scoring-rubrics${params}`);
    },
  },

  notifications: {
    list: () => apiFetch('/api/notifications'),
  },
};
