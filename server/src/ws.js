import { createRequire } from 'module';

// Use createRequire so we load the exact same CJS yjs instance that
// y-websocket/bin/utils.cjs uses internally. This avoids the "Yjs was
// already imported" warning and ensures constructor checks work.
const require = createRequire(import.meta.url);
const Y = require('yjs');
const { setupWSConnection, docs, getYDoc } = require('y-websocket/bin/utils');

import { getDb } from './db.js';

const persistTimers = new Map();

function debouncedPersist(docName) {
  if (persistTimers.has(docName)) {
    clearTimeout(persistTimers.get(docName));
  }

  persistTimers.set(docName, setTimeout(() => {
    const doc = docs.get(docName);
    if (!doc) return;

    const tasksMap = doc.getMap('tasks');
    const db = getDb();

    const upsertTask = db.prepare(`
      INSERT INTO tasks (id, project_id, name, start, end, progress, dependencies, parent_id, sort_order, color, assigned_to, created_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, start = excluded.start, end = excluded.end,
        progress = excluded.progress, dependencies = excluded.dependencies,
        parent_id = excluded.parent_id, sort_order = excluded.sort_order,
        color = excluded.color, assigned_to = excluded.assigned_to,
        updated_at = datetime('now')
    `);

    const deleteTask = db.prepare('DELETE FROM tasks WHERE id = ?');

    const projectId = docName.replace('project-', '');

    const transaction = db.transaction(() => {
      const existingIds = db.prepare('SELECT id FROM tasks WHERE project_id = ?')
        .all(projectId)
        .map(r => r.id);
      const currentIds = Array.from(tasksMap.keys());

      // Delete tasks removed from Yjs
      for (const id of existingIds) {
        if (!currentIds.includes(id)) {
          deleteTask.run(id);
        }
      }

      tasksMap.forEach((task, taskId) => {
        const t = task.toJSON ? task.toJSON() : task;
        upsertTask.run(
          taskId, projectId, t.name, t.start, t.end,
          t.progress != null ? t.progress : 0,
          JSON.stringify(t.dependencies || []),
          t.parent_id || null, t.sort_order || 0,
          t.color || null, t.assigned_to || null, t.created_by || null
        );
      });
    });

    transaction();
    persistTimers.delete(docName);
  }, 500));
}

export async function setupWebSocket(app) {
  app.get('/ws/*', { websocket: true }, (socket, req) => {
    // y-websocket v2 appends the room name as a path segment: /ws/project-xxx
    // Extract it from the URL path
    const rawUrl = req.raw ? req.raw.url : (req.url || '/');
    const url = new URL(rawUrl, 'http://localhost');
    const path = url.pathname; // e.g. /ws/project-xxx
    const docName = path.replace(/^\/ws\//, '') || 'default';

    // setupWSConnection expects a raw ws WebSocket and an IncomingMessage-like object.
    // @fastify/websocket provides a ws WebSocket as the `socket` parameter, so we
    // pass it directly. We pass docName explicitly in opts to avoid relying on
    // req.url extraction inside setupWSConnection.
    setupWSConnection(socket, req.raw || req, { docName });

    // Attach the debounced persistence handler to the doc's update event
    const doc = docs.get(docName);
    if (doc) {
      doc.on('update', () => {
        debouncedPersist(docName);
      });
    }
  });

  app.get('/api/ws/init/:projectId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const docName = `project-${req.params.projectId}`;

    // getYDoc creates a proper WSSharedDoc (with conns and awareness) if one
    // doesn't exist, or returns the existing one. This ensures compatibility
    // with setupWSConnection which expects WSSharedDoc properties.
    const doc = getYDoc(docName);

    // Check if this doc was just created (no tasks loaded yet) by seeing if the
    // tasks map is empty on a freshly initialized doc.
    const tasksMap = doc.getMap('tasks');
    if (tasksMap.size === 0) {
      const db = getDb();
      const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.projectId);

      for (const t of tasks) {
        const taskData = {
          id: t.id,
          project_id: t.project_id,
          name: t.name,
          start: t.start,
          end: t.end,
          progress: t.progress,
          dependencies: JSON.parse(t.dependencies || '[]'),
          parent_id: t.parent_id,
          sort_order: t.sort_order,
          color: t.color,
          assigned_to: t.assigned_to,
          created_by: t.created_by,
        };
        const yTask = new Y.Map();
        for (const [k, v] of Object.entries(taskData)) {
          if (Array.isArray(v)) {
            const arr = new Y.Array();
            arr.push(v);
            yTask.set(k, arr);
          } else {
            yTask.set(k, v);
          }
        }
        tasksMap.set(t.id, yTask);
      }

      doc.on('update', () => {
        debouncedPersist(docName);
      });
    }

    return { ready: true, docName };
  });
}
