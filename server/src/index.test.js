import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import ws from '@fastify/websocket';
import { getDb, closeDb } from './db.js';
import { authRoutes } from './auth.js';
import { projectRoutes } from './projects.js';
import { taskRoutes } from './tasks.js';
import { setupWebSocket } from './ws.js';

const JWT_SECRET = 'test-secret';

async function buildApp() {
  const app = Fastify();

  await app.register(cors, { origin: true });
  await app.register(fjwt, { secret: JWT_SECRET });
  await app.register(ws);

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'unauthorized' });
    }
  });

  getDb();

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(taskRoutes, { prefix: '/api' });

  await app.register(setupWebSocket);

  return app;
}

describe('API', () => {
  let app;
  let token1, userId1;
  let token2, userId2;
  let projectId;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    app = await buildApp();
    await app.ready();

    // Register user1 (used as primary user throughout tests)
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'user1', password: 'pass1' },
    });
    const body1 = JSON.parse(res1.payload);
    token1 = body1.token;
    userId1 = body1.user.id;

    // Register user2 (used for member / non-owner tests)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'user2', password: 'pass2' },
    });
    const body2 = JSON.parse(res2.payload);
    token2 = body2.token;
    userId2 = body2.user.id;

    // Create a project owned by user1 (used by most project tests)
    const res3 = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: `Bearer ${token1}` },
      payload: { name: 'Test Project' },
    });
    const body3 = JSON.parse(res3.payload);
    projectId = body3.project.id;
  });

  afterAll(async () => {
    await app.close();
    closeDb();
  });

  // ==================== Auth Tests ====================

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { username: 'newuser', password: 'pass1234' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.token).toBeTruthy();
      expect(body.user.username).toBe('newuser');
      expect(body.user.color).toBeTruthy();
      expect(body.user.id).toBeTruthy();
    });

    it('rejects missing username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { password: 'pass1234' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeTruthy();
    });

    it('rejects missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { username: 'someone' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBeTruthy();
    });

    it('rejects short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { username: 'user3', password: '12' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects duplicate username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { username: 'user1', password: 'pass1234' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'user1', password: 'pass1' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.token).toBeTruthy();
      expect(body.user.username).toBe('user1');
      expect(body.user.color).toBeTruthy();
    });

    it('rejects missing username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { password: 'pass1' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'user1', password: 'wrongpass' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'nobody', password: 'pass1234' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user with valid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user.username).toBe('user1');
      expect(body.user.id).toBe(userId1);
      expect(body.user.color).toBeTruthy();
    });

    it('rejects without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== Project Tests ====================

  describe('POST /api/projects', () => {
    it('creates a new project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'New Project' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.project.name).toBe('New Project');
      expect(body.project.owner_id).toBe(userId1);
      expect(body.project.id).toBeTruthy();
      expect(body.project.members).toHaveLength(1);
      expect(body.project.members[0].username).toBe('user1');
    });

    it('rejects creation without name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token1}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('lists projects for the current user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.projects)).toBe(true);
      expect(body.projects.length).toBeGreaterThanOrEqual(2);
      // Each project should include members
      for (const p of body.projects) {
        expect(Array.isArray(p.members)).toBe(true);
      }
    });

    it('only returns projects the user is a member of', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // user2 hasn't been invited to any projects yet
      expect(body.projects.length).toBe(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('gets a single project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.project.name).toBe('Test Project');
      expect(body.project.id).toBe(projectId);
      expect(Array.isArray(body.project.members)).toBe(true);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects/nonexistent-id',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('updates project name', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Updated Project' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);

      // Verify the update
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(JSON.parse(getRes.payload).project.name).toBe('Updated Project');
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/projects/nonexistent-id',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Test' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when name is missing', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${token1}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('invites a member by username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/members`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { username: 'user2' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.member.username).toBe('user2');
      expect(body.member.id).toBe(userId2);
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/members`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { username: 'nobody' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 for duplicate invite', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/members`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { username: 'user2' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('rejects invite without username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/members`,
        headers: { authorization: `Bearer ${token1}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let deleteProjectId;

    beforeAll(async () => {
      // Create a project specifically for delete testing
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Project To Delete' },
      });
      deleteProjectId = JSON.parse(res.payload).project.id;

      // Add user2 as a member (not owner)
      await app.inject({
        method: 'POST',
        url: `/api/projects/${deleteProjectId}/members`,
        headers: { authorization: `Bearer ${token1}` },
        payload: { username: 'user2' },
      });
    });

    it('prevents non-owner from deleting', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${deleteProjectId}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('allows owner to delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${deleteProjectId}`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);

      // Verify the project is gone
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${deleteProjectId}`,
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(getRes.statusCode).toBe(404);
    });
  });

  // ==================== Task Tests ====================

  describe('Tasks', () => {
    let taskProjectId;
    let taskId;

    beforeAll(async () => {
      // Create a separate project for task tests
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${token1}` },
        payload: { name: 'Task Project' },
      });
      taskProjectId = JSON.parse(res.payload).project.id;
    });

    describe('POST /api/projects/:projectId/tasks', () => {
      it('creates a task', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { name: 'Task 1', progress: 50 },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.task.name).toBe('Task 1');
        expect(body.task.progress).toBe(50);
        expect(body.task.project_id).toBe(taskProjectId);
        expect(body.task.id).toBeTruthy();
        expect(body.task.start).toBeTruthy();
        expect(body.task.end).toBeTruthy();
        taskId = body.task.id;
      });

      it('creates a task with default values when optional fields are omitted', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { name: 'Minimal Task' },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.task.name).toBe('Minimal Task');
        expect(body.task.progress).toBe(0);
        expect(Array.isArray(body.task.dependencies)).toBe(true);
        expect(body.task.dependencies).toEqual([]);
      });

      it('rejects creation without name', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { progress: 50 },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /api/projects/:projectId/tasks', () => {
      it('lists tasks for the project', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(Array.isArray(body.tasks)).toBe(true);
        expect(body.tasks.length).toBeGreaterThanOrEqual(2);
        // Dependencies should be parsed as arrays
        for (const t of body.tasks) {
          expect(Array.isArray(t.dependencies)).toBe(true);
        }
      });
    });

    describe('PUT /api/tasks/:id', () => {
      it('updates task fields', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { name: 'Updated Task', progress: 75 },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.task.name).toBe('Updated Task');
        expect(body.task.progress).toBe(75);
      });

      it('updates only progress without changing other fields', async () => {
        // First create a task to update
        const createRes = await app.inject({
          method: 'POST',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { name: 'Progress Test', start: '2026-01-01', end: '2026-01-10', progress: 30 },
        });
        const created = JSON.parse(createRes.payload).task;
        expect(created.progress).toBe(30);

        // Update only progress
        const updateRes = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${created.id}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { progress: 85 },
        });
        expect(updateRes.statusCode).toBe(200);
        const updated = JSON.parse(updateRes.payload);
        expect(updated.task.progress).toBe(85);
        // Verify other fields are unchanged
        expect(updated.task.name).toBe('Progress Test');
        expect(updated.task.start).toBe('2026-01-01');
        expect(updated.task.end).toBe('2026-01-10');

        // Clean up
        await app.inject({
          method: 'DELETE',
          url: `/api/tasks/${created.id}`,
          headers: { authorization: `Bearer ${token1}` },
        });
      });

      it('updates progress to 0 (boundary)', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { progress: 0 },
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).task.progress).toBe(0);
      });

      it('updates progress to 100 (completed)', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { progress: 100 },
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).task.progress).toBe(100);
      });

      it('updates task dependencies', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: { dependencies: ['task-1', 'task-2'] },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.task.dependencies).toEqual(['task-1', 'task-2']);
      });

      it('updates multiple fields at once', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
          payload: {
            name: 'Multi Update',
            progress: 100,
            start: '2025-01-01',
            end: '2025-01-10',
            sort_order: 5,
          },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.task.name).toBe('Multi Update');
        expect(body.task.progress).toBe(100);
        expect(body.task.start).toBe('2025-01-01');
        expect(body.task.end).toBe('2025-01-10');
        expect(body.task.sort_order).toBe(5);
      });

      it('returns 404 for non-existent task', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: '/api/tasks/nonexistent-task-id',
          headers: { authorization: `Bearer ${token1}` },
          payload: { name: 'Test' },
        });
        expect(res.statusCode).toBe(404);
      });
    });

    describe('DELETE /api/tasks/:id', () => {
      it('deletes a task', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/api/tasks/${taskId}`,
          headers: { authorization: `Bearer ${token1}` },
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).success).toBe(true);

        // Verify it is gone from the list
        const listRes = await app.inject({
          method: 'GET',
          url: `/api/projects/${taskProjectId}/tasks`,
          headers: { authorization: `Bearer ${token1}` },
        });
        const ids = JSON.parse(listRes.payload).tasks.map((t) => t.id);
        expect(ids).not.toContain(taskId);
      });

      it('returns 404 for non-existent task', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/tasks/nonexistent-task-id',
          headers: { authorization: `Bearer ${token1}` },
        });
        expect(res.statusCode).toBe(404);
      });
    });
  });

  // ==================== Unauthenticated Access Tests ====================
  // These tests verify that all protected endpoints return 401 when no
  // valid token is provided.

  describe('Unauthenticated access', () => {
    it('returns 401 for GET /api/projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for POST /api/projects', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: { name: 'Test' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for GET /api/projects/:id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for PUT /api/projects/:id', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/projects/${projectId}`,
        payload: { name: 'Test' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for DELETE /api/projects/:id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${projectId}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for POST /api/projects/:id/members', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/members`,
        payload: { username: 'user2' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for GET /api/projects/:projectId/tasks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/tasks`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for POST /api/projects/:projectId/tasks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/tasks`,
        payload: { name: 'Task' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for PUT /api/tasks/:id', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/tasks/some-task-id',
        payload: { name: 'Test' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for DELETE /api/tasks/:id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/tasks/some-task-id',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for GET /api/ws/init/:projectId', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/ws/init/${projectId}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
