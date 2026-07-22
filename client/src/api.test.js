import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('request helper', () => {
    it('includes Authorization header when token exists', async () => {
      localStorage.setItem('token', 'test-token');
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await api.getMe();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      }));
    });

    it('throws error on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'something went wrong' }),
      });

      await expect(api.getMe()).rejects.toThrow('something went wrong');
    });

    it('throws generic error when no error in response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      await expect(api.getMe()).rejects.toThrow('request failed');
    });

    it('does not include auth header when no token', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ token: 't', user: {} }),
      });

      await api.login('user', 'pass');

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
    });
  });

  describe('auth endpoints', () => {
    it('register sends correct request', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ token: 't', user: { id: '1', username: 'u', color: '#fff' } }),
      });

      await api.register('testuser', 'password123');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      }));
    });

    it('login sends correct request', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ token: 't', user: { id: '1', username: 'u', color: '#fff' } }),
      });

      await api.login('testuser', 'mypass');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'mypass' }),
      }));
    });
  });

  describe('project endpoints', () => {
    it('getProjects calls correct URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ projects: [] }),
      });

      await api.getProjects();
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', expect.any(Object));
    });

    it('createProject sends name', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ project: {} }),
      });

      await api.createProject('My Project');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'My Project' }),
      }));
    });

    it('deleteProject calls correct URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.deleteProject('proj-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('inviteMember sends username', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ member: {} }),
      });

      await api.inviteMember('proj-1', 'newuser');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1/members', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'newuser' }),
      }));
    });
  });

  describe('task endpoints', () => {
    it('getTasks calls correct URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      await api.getTasks('proj-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1/tasks', expect.any(Object));
    });

    it('createTask sends task data', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ task: {} }),
      });

      const task = { name: 'Task 1', start: '2026-07-22', end: '2026-07-25', progress: 50 };
      await api.createTask('proj-1', task);

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/proj-1/tasks', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(task),
      }));
    });

    it('updateTask sends partial updates', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ task: {} }),
      });

      await api.updateTask('task-1', { name: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      }));
    });

    it('deleteTask calls correct URL', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.deleteTask('task-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
});
