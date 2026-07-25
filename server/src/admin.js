import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, randomColor } from './db.js';

export async function adminRoutes(app) {
  app.decorate('isAdmin', async (req, reply) => {
    if (req.user.role !== 'admin') {
      return reply.status(403).send({ error: 'forbidden' });
    }
  });

  app.get('/users', { onRequest: [app.authenticate, app.isAdmin] }, async () => {
    const db = getDb();
    const users = db.prepare('SELECT id, username, role, color, created_at FROM users ORDER BY created_at ASC').all();
    return { users };
  });

  app.post('/users', { onRequest: [app.authenticate, app.isAdmin] }, async (req, reply) => {
    const { username, password, project_ids } = req.body || {};
    if (!username || !password) {
      return reply.status(400).send({ error: 'username and password are required' });
    }
    if (password.length < 4) {
      return reply.status(400).send({ error: 'password must be at least 4 characters' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return reply.status(409).send({ error: 'username already exists' });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    const color = randomColor();

    const insertUser = db.transaction(() => {
      db.prepare('INSERT INTO users (id, username, password_hash, color, role) VALUES (?, ?, ?, ?, ?)').run(id, username, passwordHash, color, 'user');

      // Auto-add user to selected projects
      if (project_ids && project_ids.length > 0) {
        const insertMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)');
        for (const pid of project_ids) {
          insertMember.run(pid, id);
        }
      }
    });

    insertUser();

    const user = db.prepare('SELECT id, username, role, color, created_at FROM users WHERE id = ?').get(id);
    return { user };
  });

  app.put('/users/:id/password', { onRequest: [app.authenticate, app.isAdmin] }, async (req, reply) => {
    const { password } = req.body || {};
    if (!password || password.length < 4) {
      return reply.status(400).send({ error: 'password must be at least 4 characters' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return reply.status(404).send({ error: 'user not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.params.id);

    return { success: true };
  });

  app.put('/users/:id/role', { onRequest: [app.authenticate, app.isAdmin] }, async (req, reply) => {
    const { role } = req.body || {};
    if (!role || !['admin', 'user'].includes(role)) {
      return reply.status(400).send({ error: 'role must be admin or user' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return reply.status(404).send({ error: 'user not found' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

    return { success: true };
  });

  app.get('/projects', { onRequest: [app.authenticate, app.isAdmin] }, async () => {
    const db = getDb();
    const projects = db.prepare('SELECT id, name, created_at FROM projects ORDER BY created_at DESC').all();
    return { projects };
  });
}
