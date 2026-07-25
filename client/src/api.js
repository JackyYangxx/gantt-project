const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  // Only set Content-Type for requests with a body (POST/PUT), not for GET/DELETE
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
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

  getUsers: () => request('/a7x9k2m/users'),
  getAllProjects: () => request('/a7x9k2m/projects'),
  createUser: (username, password, projectIds) =>
    request('/a7x9k2m/users', { method: 'POST', body: JSON.stringify({ username, password, project_ids: projectIds }) }),
  updateUserPassword: (id, password) =>
    request(`/a7x9k2m/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  updateUserRole: (id, role) =>
    request(`/a7x9k2m/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
};
