import { v4 as uuid } from 'uuid';
import { getDb } from './db.js';

export async function projectRoutes(app) {
  app.get('/', { onRequest: [app.authenticate] }, async (req) => {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC, p.name DESC
    `).all(req.user.id);

    for (const p of projects) {
      const members = db.prepare(`
        SELECT u.id, u.username, u.color FROM users u
        JOIN project_members pm ON pm.user_id = u.id
        WHERE pm.project_id = ?
      `).all(p.id);
      p.members = members;
    }

    return { projects };
  });

  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { name } = req.body || {};
    if (!name) {
      return reply.status(400).send({ error: 'name is required' });
    }

    const db = getDb();
    const id = uuid();

    db.prepare('INSERT INTO projects (id, name, owner_id) VALUES (?, ?, ?)').run(id, name, req.user.id);
    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(id, req.user.id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    project.members = [{ id: req.user.id, username: req.user.username, color: req.user.color }];

    return { project };
  });

  app.get('/:id', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return reply.status(404).send({ error: 'project not found' });
    }

    const members = db.prepare(`
      SELECT u.id, u.username, u.color FROM users u
      JOIN project_members pm ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(project.id);
    project.members = members;

    return { project };
  });

  app.put('/:id', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const { name } = req.body || {};
    if (!name) {
      return reply.status(400).send({ error: 'name is required' });
    }

    const db = getDb();
    const result = db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, req.params.id);
    if (result.changes === 0) {
      return reply.status(404).send({ error: 'project not found' });
    }

    return { success: true };
  });

  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
    if (!project) {
      return reply.status(404).send({ error: 'project not found or not authorized' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    return { success: true };
  });

  app.post('/:id/members', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const { username } = req.body || {};
    if (!username) {
      return reply.status(400).send({ error: 'username is required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, username, color FROM users WHERE username = ?').get(username);
    if (!user) {
      return reply.status(404).send({ error: 'user not found' });
    }

    const existing = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, user.id);
    if (existing) {
      return reply.status(409).send({ error: 'user is already a member' });
    }

    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(req.params.id, user.id);

    return { member: user };
  });
}
