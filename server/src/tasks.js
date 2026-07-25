import { v4 as uuid } from 'uuid';
import { getDb } from './db.js';

export async function taskRoutes(app) {
  app.get('/projects/:projectId/tasks', { onRequest: [app.authenticate, app.requireMember] }, async (req) => {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT * FROM tasks WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(req.params.projectId);

    for (const t of tasks) {
      t.dependencies = JSON.parse(t.dependencies || '[]');
    }

    return { tasks };
  });

  app.post('/projects/:projectId/tasks', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const { name, start, end, progress, parent_id, sort_order, color, assigned_to, dependencies, progress_notes } = req.body || {};
    if (!name) {
      return reply.status(400).send({ error: 'name is required' });
    }

    const db = getDb();
    const id = uuid();

    db.prepare(`
      INSERT INTO tasks (id, project_id, name, start, end, progress, parent_id, sort_order, color, assigned_to, dependencies, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.params.projectId, name,
      start || new Date().toISOString().slice(0, 10),
      end || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      progress || 0, parent_id || null, sort_order || 0,
      color || null, assigned_to || null,
      JSON.stringify(dependencies || []),
      req.user.id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    task.dependencies = JSON.parse(task.dependencies || '[]');

    return { task };
  });

  app.put('/tasks/:id', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const fields = ['name', 'start', 'end', 'progress', 'parent_id', 'sort_order', 'color', 'assigned_to', 'dependencies', 'progress_notes'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'dependencies') {
          updates.push(`${f} = ?`);
          values.push(JSON.stringify(req.body[f]));
        } else {
          updates.push(`${f} = ?`);
          values.push(req.body[f]);
        }
      }
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'no fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);

    const db = getDb();
    const result = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    if (result.changes === 0) {
      return reply.status(404).send({ error: 'task not found' });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    task.dependencies = JSON.parse(task.dependencies || '[]');

    return { task };
  });

  app.delete('/tasks/:id', { onRequest: [app.authenticate, app.requireMember] }, async (req, reply) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return reply.status(404).send({ error: 'task not found' });
    }
    return { success: true };
  });
}
