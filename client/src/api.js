const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'request failed');
  }

  return data;
}

export const api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  getProjects: () => request('/projects'),
  createProject: (name) =>
    request('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  updateProject: (id, name) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteProject: (id) =>
    request(`/projects/${id}`, { method: 'DELETE' }),
  inviteMember: (projectId, username) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ username }) }),

  getTasks: (projectId) => request(`/projects/${projectId}/tasks`),
  createTask: (projectId, task) =>
    request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, updates) =>
    request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteTask: (id) =>
    request(`/tasks/${id}`, { method: 'DELETE' }),

  initWS: (projectId) => request(`/ws/init/${projectId}`),
};
