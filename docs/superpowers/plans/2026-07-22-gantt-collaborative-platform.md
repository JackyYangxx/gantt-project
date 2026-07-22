# Gantt Collaborative Platform - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based Gantt project management platform with real-time collaborative editing for small teams over local network.

**Architecture:** React SPA frontend communicating with a Node.js/Fastify backend via REST API and WebSocket. Yjs CRDT handles real-time sync of task data; SQLite provides persistent storage. Frappe Gantt serves as the Gantt chart rendering engine.

**Tech Stack:** React 18 + Vite, Fastify, better-sqlite3, Frappe Gantt, Yjs + y-websocket, JWT auth

---

## File Structure

```
gantt-project/
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Entry: Fastify + WS server
│   │   ├── db.js             # SQLite init, schema, helpers
│   │   ├── auth.js           # Auth routes + JWT middleware
│   │   ├── projects.js       # Project CRUD routes
│   │   ├── tasks.js          # Task CRUD routes
│   │   ├── ws.js             # Yjs WebSocket server + persistence
│   │   └── seed.js           # Seed demo data (optional)
│   └── data/                 # SQLite db file location (gitignored)
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── api.js            # REST client wrapper
│   │   ├── AuthContext.jsx   # Auth state provider
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ProjectListPage.jsx
│   │   │   └── ProjectPage.jsx
│   │   ├── components/
│   │   │   ├── TopBar.jsx
│   │   │   ├── SidePanel.jsx
│   │   │   ├── TaskTree.jsx
│   │   │   ├── TaskRow.jsx
│   │   │   ├── GanttChart.jsx
│   │   │   ├── TaskDrawer.jsx
│   │   │   └── TaskForm.jsx
│   │   └── hooks/
│   │       ├── useYjs.js
│   │       └── useAwareness.js
│   └── public/
└── package.json              # Root: scripts to run both server + client
```

---

### Task 1: Scaffold project monorepo

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create root package.json with workspace scripts**

```json
{
  "name": "gantt-project",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "install:all": "cd server && npm install && cd ../client && npm install",
    "setup": "npm install && npm run install:all"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Install root dependencies and commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
npm install
git add package.json package-lock.json
git commit -m "feat: scaffold project monorepo"
```

---

### Task 2: Backend server setup with SQLite

**Files:**
- Create: `server/package.json`
- Create: `server/src/index.js`
- Create: `server/src/db.js`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "gantt-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/websocket": "^10.0.1",
    "better-sqlite3": "^11.1.2",
    "bcryptjs": "^2.4.3",
    "uuid": "^10.0.0",
    "yjs": "^13.6.18",
    "y-websocket": "^2.0.4",
    "lib0": "^0.2.94"
  }
}
```

- [ ] **Step 2: Install server dependencies**

```bash
cd /Users/fxy/Documents/projects/gantt-project/server && npm install
```

- [ ] **Step 3: Create db.js with SQLite schema**

```js
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'gantt.db');

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      progress REAL DEFAULT 0,
      dependencies TEXT DEFAULT '[]',
      parent_id TEXT,
      sort_order REAL DEFAULT 0,
      color TEXT,
      assigned_to TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);
}

const COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#1D4ED8'];

export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default { getDb, randomColor };
```

- [ ] **Step 4: Create index.js server entry**

```js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import ws from '@fastify/websocket';
import { getDb } from './db.js';
import { authRoutes } from './auth.js';
import { projectRoutes } from './projects.js';
import { taskRoutes } from './tasks.js';
import { setupWebSocket } from './ws.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gantt-dev-secret-change-in-production';

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(fjwt, { secret: JWT_SECRET });
  await app.register(ws);

  getDb();

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(taskRoutes, { prefix: '/api' });

  await app.register(setupWebSocket);

  const port = process.env.PORT || 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server running at http://0.0.0.0:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Test server starts successfully**

```bash
cd /Users/fxy/Documents/projects/gantt-project/server && node src/index.js &
sleep 2
curl http://localhost:3001/api/health
kill %1
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add server/package.json server/package-lock.json server/src/
git commit -m "feat: backend server setup with SQLite schema"
```

---

### Task 3: Auth routes (register, login, JWT middleware)

**Files:**
- Create: `server/src/auth.js`

- [ ] **Step 1: Create auth.js with register, login, and middleware**

```js
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb, randomColor } from './db.js';

export async function authRoutes(app) {
  app.post('/register', async (req, reply) => {
    const { username, password } = req.body || {};
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

    db.prepare('INSERT INTO users (id, username, password_hash, color) VALUES (?, ?, ?, ?)').run(id, username, passwordHash, color);

    const token = app.jwt.sign({ id, username });

    return { token, user: { id, username, color } };
  });

  app.post('/login', async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return reply.status(400).send({ error: 'username and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return reply.status(401).send({ error: 'invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, username: user.username });

    return { token, user: { id: user.id, username: user.username, color: user.color } };
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    const db = getDb();
    const user = db.prepare('SELECT id, username, color, created_at FROM users WHERE id = ?').get(req.user.id);
    return { user };
  });
}
```

- [ ] **Step 2: Add authenticate decorator in index.js**

Read `server/src/index.js` and add this after the `await app.register(fjwt, ...)` line:

```js
await app.register(fjwt, { secret: JWT_SECRET });

// Add this:
app.decorate('authenticate', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'unauthorized' });
  }
});
```

- [ ] **Step 3: Test register and login**

```bash
cd /Users/fxy/Documents/projects/gantt-project/server && node src/index.js &
sleep 2

# Register
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"1234"}'

# Login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"1234"}'

kill %1
```

Expected: Both return `{"token":"...","user":{"id":"...","username":"test","color":"..."}}`

- [ ] **Step 4: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add server/src/auth.js server/src/index.js
git commit -m "feat: auth routes with JWT register and login"
```

---

### Task 4: Project CRUD routes

**Files:**
- Create: `server/src/projects.js`

- [ ] **Step 1: Create projects.js**

```js
import { v4 as uuid } from 'uuid';
import { getDb } from './db.js';

export async function projectRoutes(app) {
  app.get('/', { onRequest: [app.authenticate] }, async (req) => {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
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

  app.get('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
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

  app.put('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
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

  app.post('/:id/members', { onRequest: [app.authenticate] }, async (req, reply) => {
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
```

- [ ] **Step 2: Test project CRUD**

```bash
cd /Users/fxy/Documents/projects/gantt-project/server && node src/index.js &
sleep 2

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"1234"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create project
curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Project"}'

# List projects
curl -s http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"

kill %1
```

Expected: Create returns project object. List returns array with the created project.

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add server/src/projects.js
git commit -m "feat: project CRUD routes with member management"
```

---

### Task 5: Task CRUD routes

**Files:**
- Create: `server/src/tasks.js`

- [ ] **Step 1: Create tasks.js**

```js
import { v4 as uuid } from 'uuid';
import { getDb } from './db.js';

export async function taskRoutes(app) {
  app.get('/projects/:projectId/tasks', { onRequest: [app.authenticate] }, async (req) => {
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

  app.post('/projects/:projectId/tasks', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { name, start, end, progress, parent_id, sort_order, color, assigned_to, dependencies } = req.body || {};
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

  app.put('/tasks/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const fields = ['name', 'start', 'end', 'progress', 'parent_id', 'sort_order', 'color', 'assigned_to', 'dependencies'];
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

  app.delete('/tasks/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return reply.status(404).send({ error: 'task not found' });
    }
    return { success: true };
  });
}
```

- [ ] **Step 2: Test task CRUD**

```bash
cd /Users/fxy/Documents/projects/gantt-project/server && node src/index.js &
sleep 2

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"1234"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Get project ID
PID=$(curl -s http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create task
curl -s -X POST "http://localhost:3001/api/projects/$PID/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Task 1","start":"2026-07-22","end":"2026-07-25","progress":30}'

# List tasks
curl -s "http://localhost:3001/api/projects/$PID/tasks" \
  -H "Authorization: Bearer $TOKEN"

kill %1
```

Expected: Create returns task object. List returns array with the created task.

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add server/src/tasks.js
git commit -m "feat: task CRUD routes"
```

---

### Task 6: Yjs WebSocket server + SQLite persistence

**Files:**
- Create: `server/src/ws.js`

- [ ] **Step 1: Create ws.js**

```js
import * as Y from 'yjs';
import { setupWSConnection, docs } from 'y-websocket/bin/utils.js';
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

    const projectId = docName.replace('project-', '');

    const transaction = db.transaction(() => {
      tasksMap.forEach((task, taskId) => {
        const t = task.toJSON ? task.toJSON() : task;
        upsertTask.run(
          taskId, projectId, t.name, t.start, t.end,
          t.progress || 0, JSON.stringify(t.dependencies || []),
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
  app.get('/ws', { websocket: true }, (socket, req) => {
    const url = new URL(req.url, 'http://localhost');
    const docName = url.searchParams.get('room') || 'default';

    const conn = setupWSConnection(socket, req, { docName });

    const doc = docs.get(docName);
    if (doc) {
      doc.on('update', () => {
        debouncedPersist(docName);
      });
    }
  });

  app.get('/api/ws/init/:projectId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const docName = `project-${req.params.projectId}`;

    if (!docs.has(docName)) {
      const doc = new Y.Doc();
      docs.set(docName, doc);

      const db = getDb();
      const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.projectId);

      const tasksMap = doc.getMap('tasks');
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add server/src/ws.js server/src/db.js
git commit -m "feat: Yjs WebSocket server with SQLite persistence"
```

---

### Task 7: Frontend scaffold with Vite + React

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/App.css`
- Create: `client/src/api.js`
- Create: `client/src/AuthContext.jsx`

- [ ] **Step 1: Create client package.json**

```json
{
  "name": "gantt-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.25.0",
    "frappe-gantt": "^0.6.1",
    "yjs": "^13.6.18",
    "y-websocket": "^2.0.4",
    "html2canvas": "^1.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gantt Project</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './AuthContext';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
```

- [ ] **Step 5: Create api.js**

```js
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
```

- [ ] **Step 6: Create AuthContext.jsx**

```jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, password) => {
    const data = await api.register(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 7: Create App.jsx**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectPage from './pages/ProjectPage';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 8: Create App.css (base styles)**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #1a1a1a; }
button { cursor: pointer; }
input, select { font-size: 14px; }

.login-page { max-width: 400px; margin: 80px auto; padding: 32px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.login-page h1 { text-align: center; margin-bottom: 24px; font-size: 24px; }
.login-page .form-group { margin-bottom: 16px; }
.login-page label { display: block; margin-bottom: 4px; font-size: 14px; font-weight: 600; }
.login-page input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
.login-page .btn { width: 100%; padding: 10px; background: #4F46E5; color: #fff; border: none; border-radius: 4px; font-size: 16px; margin-top: 8px; }
.login-page .toggle { text-align: center; margin-top: 12px; font-size: 14px; color: #666; }
.login-page .toggle button { background: none; border: none; color: #4F46E5; font-size: 14px; text-decoration: underline; }
.login-page .error { color: #DC2626; font-size: 14px; margin-bottom: 12px; }
```

- [ ] **Step 9: Install client dependencies and test dev server**

```bash
cd /Users/fxy/Documents/projects/gantt-project/client && npm install && npm run dev &
sleep 3
curl http://localhost:5173 | head -20
kill %1
```

Expected: Returns HTML with react app shell.

- [ ] **Step 10: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/package.json client/package-lock.json client/vite.config.js client/index.html client/src/main.jsx client/src/App.jsx client/src/App.css client/src/api.js client/src/AuthContext.jsx
git commit -m "feat: frontend scaffold with Vite, React Router, and auth context"
```

---

### Task 8: LoginPage component

**Files:**
- Create: `client/src/pages/LoginPage.jsx`

- [ ] **Step 1: Create LoginPage.jsx**

```jsx
import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <h1>Gantt Project</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="form-group">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
        </div>
        <button type="submit" className="btn">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <div className="toggle">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? 'Login' : 'Register'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify login page renders**

Start both server and client, verify login page loads at http://localhost:5173 and can register/login.

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/pages/LoginPage.jsx
git commit -m "feat: login and register page"
```

---

### Task 9: ProjectListPage component

**Files:**
- Create: `client/src/pages/ProjectListPage.jsx`

- [ ] **Step 1: Create ProjectListPage.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function ProjectListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(null);
  const [inviteUser, setInviteUser] = useState('');

  const loadProjects = useCallback(async () => {
    const data = await api.getProjects();
    setProjects(data.projects);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.createProject(name);
    setName('');
    setShowCreate(false);
    loadProjects();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await api.deleteProject(id);
    loadProjects();
  };

  const handleInvite = async (projectId) => {
    try {
      await api.inviteMember(projectId, inviteUser);
      setInviteUser('');
      setInviteOpen(null);
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>My Projects</h1>
        <div>
          <span style={{ marginRight: 16, color: '#666' }}>Logged in as <strong>{user.username}</strong></span>
          <button onClick={logout} style={{ padding: '4px 12px' }}>Logout</button>
        </div>
      </div>

      <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '8px 16px', marginBottom: 16, background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>
        + New Project
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, marginRight: 8, width: 300 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4 }}>Create</button>
        </form>
      )}

      {projects.length === 0 && <p style={{ color: '#999' }}>No projects yet. Create one to get started.</p>}

      <div style={{ display: 'grid', gap: 12 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}
            onClick={() => navigate(`/project/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: '#999' }}>
                  {p.members?.length || 0} member(s) · Created {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setInviteOpen(inviteOpen === p.id ? null : p.id)}
                  style={{ padding: '4px 8px', fontSize: 12 }}>+ Invite</button>
                <button onClick={() => handleDelete(p.id)}
                  style={{ padding: '4px 8px', fontSize: 12, color: '#DC2626' }}>Delete</button>
              </div>
            </div>
            {inviteOpen === p.id && (
              <div style={{ marginTop: 8, display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <input value={inviteUser} onChange={(e) => setInviteUser(e.target.value)} placeholder="Username"
                  style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, flex: 1 }} />
                <button onClick={() => handleInvite(p.id)} style={{ padding: '4px 12px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>Invite</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify project list page**

Run server and client together, verify login → see project list → create project → see it appear → click to navigate (will 404 on project page for now).

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/pages/ProjectListPage.jsx
git commit -m "feat: project list page with create, delete, and invite"
```

---

### Task 10: ProjectPage layout with TopBar and SidePanel

**Files:**
- Create: `client/src/pages/ProjectPage.jsx`
- Create: `client/src/components/TopBar.jsx`
- Create: `client/src/components/SidePanel.jsx`

- [ ] **Step 1: Create ProjectPage.jsx (layout shell)**

```jsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api';
import TopBar from '../components/TopBar';
import SidePanel from '../components/SidePanel';
import GanttChart from '../components/GanttChart';
import TaskDrawer from '../components/TaskDrawer';

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  useEffect(() => {
    api.getProjects().then((data) => {
      setProject(data.projects.find((p) => p.id === id));
    });
    api.getTasks(id).then((data) => {
      setTasks(data.tasks);
    });
  }, [id]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setDrawerOpen(true);
  };

  const handleTaskSave = async (taskData) => {
    if (selectedTask) {
      await api.updateTask(selectedTask.id, taskData);
    } else {
      await api.createTask(id, taskData);
    }
    const data = await api.getTasks(id);
    setTasks(data.tasks);
    setDrawerOpen(false);
  };

  const handleTaskDelete = async () => {
    if (!selectedTask || !confirm('Delete this task?')) return;
    await api.deleteTask(selectedTask.id);
    const data = await api.getTasks(id);
    setTasks(data.tasks);
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  if (!project) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        project={project}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidePanelOpen && (
          <SidePanel
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <GanttChart
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDateChange={async (task, start, end) => {
              await api.updateTask(task.id, { start, end });
            }}
          />
        </div>
      </div>
      {drawerOpen && (
        <TaskDrawer
          task={selectedTask}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TopBar.jsx**

```jsx
import { useNavigate } from 'react-router-dom';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5', height: 48
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 16 }}>&larr;</button>
        <button onClick={onToggleSidePanel} style={{ padding: '4px 8px', fontSize: 12 }}>
          {sidePanelOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Online users will go here in Task 13 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SidePanel.jsx**

```jsx
import TaskTree from './TaskTree';

export default function SidePanel({ tasks, onTaskClick, onAddTask }) {
  return (
    <div style={{
      width: 320, background: '#fff', borderRight: '1px solid #e5e5e5',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Tasks</span>
        <button onClick={onAddTask} style={{ padding: '2px 8px', fontSize: 12, background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4 }}>
          + Add
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <TaskTree tasks={tasks} onTaskClick={onTaskClick} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/pages/ProjectPage.jsx client/src/components/TopBar.jsx client/src/components/SidePanel.jsx
git commit -m "feat: project page layout with TopBar and SidePanel"
```

---

### Task 11: TaskTree, TaskRow, GanttChart components

**Files:**
- Create: `client/src/components/TaskTree.jsx`
- Create: `client/src/components/TaskRow.jsx`
- Create: `client/src/components/GanttChart.jsx`

- [ ] **Step 1: Create TaskTree.jsx**

```jsx
import TaskRow from './TaskRow';

export default function TaskTree({ tasks, onTaskClick }) {
  const buildTree = (tasks, parentId = null) => {
    return tasks
      .filter((t) => (t.parent_id || null) === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({
        ...t,
        children: buildTree(tasks, t.id),
      }));
  };

  const tree = buildTree(tasks);

  const renderRows = (nodes, depth = 0) => {
    return nodes.flatMap((node) => [
      <TaskRow key={node.id} task={node} depth={depth} onClick={onTaskClick} />,
      ...renderRows(node.children || [], depth + 1),
    ]);
  };

  return <div>{renderRows(tree)}</div>;
}
```

- [ ] **Step 2: Create TaskRow.jsx**

```jsx
export default function TaskRow({ task, depth, onClick }) {
  const progressColor = task.progress >= 100 ? '#059669' : task.progress > 0 ? '#D97706' : '#999';

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        paddingLeft: 12 + depth * 20, borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer', fontSize: 13,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: progressColor
      }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.name}
      </span>
      <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>
        {task.progress}%
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Create GanttChart.jsx**

```jsx
import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';

export default function GanttChart({ tasks, onTaskClick, onDateChange }) {
  const containerRef = useRef(null);
  const ganttRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    if (ganttRef.current) {
      ganttRef.current.refresh(tasks);
      return;
    }

    const ganttTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      dependencies: t.dependencies?.join(', ') || '',
    }));

    ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
      view_mode: 'Day',
      bar_height: 30,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 18,
      date_format: 'YYYY-MM-DD',
      language: 'en',
      on_click: (task) => {
        onTaskClick(task);
      },
      on_date_change: (task, start, end) => {
        onDateChange(task, start, end);
      },
      custom_popup_html: (task) => {
        return `
          <div style="padding:8px">
            <strong>${task.name}</strong><br/>
            ${task.start} → ${task.end}<br/>
            Progress: ${task.progress}%
          </div>
        `;
      },
    });

    return () => {
      if (ganttRef.current) {
        ganttRef.current = null;
      }
    };
  }, [tasks]);

  return (
    <div style={{ padding: 16, height: '100%' }}>
      <svg ref={containerRef} id="gantt-container" style={{ width: '100%' }} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/components/TaskTree.jsx client/src/components/TaskRow.jsx client/src/components/GanttChart.jsx
git commit -m "feat: TaskTree, TaskRow, and GanttChart components"
```

---

### Task 12: TaskDrawer and TaskForm components

**Files:**
- Create: `client/src/components/TaskDrawer.jsx`
- Create: `client/src/components/TaskForm.jsx`

- [ ] **Step 1: Create TaskDrawer.jsx**

```jsx
import TaskForm from './TaskForm';

export default function TaskDrawer({ task, onSave, onDelete, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
      background: '#fff', boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      zIndex: 100, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #e5e5e5'
      }}>
        <h3 style={{ fontSize: 16 }}>{task ? 'Edit Task' : 'New Task'}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20 }}>&times;</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <TaskForm task={task} onSave={onSave} />
      </div>
      {task && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e5' }}>
          <button onClick={onDelete}
            style={{ width: '100%', padding: '8px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 4 }}>
            Delete Task
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TaskForm.jsx**

```jsx
import { useState } from 'react';

export default function TaskForm({ task, onSave }) {
  const [name, setName] = useState(task?.name || '');
  const [start, setStart] = useState(task?.start || new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(task?.end || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [progress, setProgress] = useState(task?.progress || 0);
  const [deps, setDeps] = useState(task?.dependencies?.join(', ') || '');
  const [color, setColor] = useState(task?.color || '#4F46E5');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name, start, end, progress: Number(progress),
      dependencies: deps ? deps.split(',').map((s) => s.trim()).filter(Boolean) : [],
      color,
    });
  };

  const fieldStyle = { marginBottom: 12 };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 };
  const inputStyle = { width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle}>Start</label>
          <input style={inputStyle} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div style={{ ...fieldStyle, flex: 1 }}>
          <label style={labelStyle}>End</label>
          <input style={inputStyle} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Progress ({progress}%)</label>
        <input style={{ width: '100%' }} type="range" min="0" max="100" value={progress}
          onChange={(e) => setProgress(e.target.value)} />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Dependencies (comma-separated task IDs)</label>
        <input style={inputStyle} value={deps} onChange={(e) => setDeps(e.target.value)}
          placeholder="e.g. task-id-1, task-id-2" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          style={{ width: 40, height: 30, border: 'none', cursor: 'pointer' }} />
      </div>
      <button type="submit"
        style={{ width: '100%', padding: '8px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 4, marginTop: 8 }}>
        {task ? 'Update' : 'Create'} Task
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/components/TaskDrawer.jsx client/src/components/TaskForm.jsx
git commit -m "feat: TaskDrawer and TaskForm for task editing"
```

---

### Task 13: Real-time collaboration with Yjs

**Files:**
- Create: `client/src/hooks/useYjs.js`
- Create: `client/src/hooks/useAwareness.js`
- Modify: `client/src/pages/ProjectPage.jsx`
- Modify: `client/src/components/GanttChart.jsx`
- Modify: `client/src/components/TopBar.jsx`

- [ ] **Step 1: Create useYjs.js**

```jsx
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function useYjs(projectId) {
  const [connected, setConnected] = useState(false);
  const [tasks, setTasks] = useState({});
  const ydocRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsUrl = `ws://${window.location.hostname}:3001/ws`;
    const provider = new WebsocketProvider(wsUrl, `project-${projectId}`, ydoc);
    providerRef.current = provider;

    provider.on('status', (event) => {
      setConnected(event.status === 'connected');
    });

    const tasksMap = ydoc.getMap('tasks');

    const updateHandler = () => {
      const result = {};
      tasksMap.forEach((val, key) => {
        const raw = val.toJSON ? val.toJSON() : val;
        result[key] = {
          ...raw,
          dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
        };
      });
      setTasks(result);
    };

    tasksMap.observe(updateHandler);

    // Initial sync
    if (tasksMap.size > 0) {
      updateHandler();
    }

    // Load from REST if empty (first user in room)
    provider.on('sync', (synced) => {
      if (synced && tasksMap.size === 0) {
        import('../api').then(({ api }) => {
          api.getTasks(projectId).then((data) => {
            ydoc.transact(() => {
              for (const t of data.tasks) {
                const yTask = new Y.Map();
                yTask.set('id', t.id);
                yTask.set('project_id', t.project_id);
                yTask.set('name', t.name);
                yTask.set('start', t.start);
                yTask.set('end', t.end);
                yTask.set('progress', t.progress);
                const deps = new Y.Array();
                (t.dependencies || []).forEach((d) => deps.push([d]));
                yTask.set('dependencies', deps);
                yTask.set('parent_id', t.parent_id);
                yTask.set('sort_order', t.sort_order);
                yTask.set('color', t.color);
                yTask.set('assigned_to', t.assigned_to);
                yTask.set('created_by', t.created_by);
                tasksMap.set(t.id, yTask);
              }
            });
          });
        });
      }
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [projectId]);

  const updateTask = (taskId, updates) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    const yTask = tasksMap.get(taskId);
    if (!yTask) return;

    ydocRef.current.transact(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'dependencies' && Array.isArray(value)) {
          const arr = yTask.get('dependencies') || new Y.Array();
          arr.delete(0, arr.length);
          value.forEach((d) => arr.push([d]));
        } else {
          yTask.set(key, value);
        }
      }
    });
  };

  const addTask = (task) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    ydocRef.current.transact(() => {
      const yTask = new Y.Map();
      for (const [k, v] of Object.entries(task)) {
        if (k === 'dependencies') {
          const arr = new Y.Array();
          (v || []).forEach((d) => arr.push([d]));
          yTask.set(k, arr);
        } else {
          yTask.set(k, v);
        }
      }
      tasksMap.set(task.id, yTask);
    });
  };

  const deleteTask = (taskId) => {
    const tasksMap = ydocRef.current?.getMap('tasks');
    if (!tasksMap) return;
    tasksMap.delete(taskId);
  };

  return { tasks, connected, updateTask, addTask, deleteTask, provider: providerRef };
}
```

- [ ] **Step 2: Create useAwareness.js**

```jsx
import { useState, useEffect } from 'react';

export function useAwareness(providerRef) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    const updateAwareness = () => {
      const states = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) {
          states.push({ clientId, ...state.user });
        }
      });
      setOnlineUsers(states);
    };

    provider.awareness.on('change', updateAwareness);
    return () => provider.awareness.off('change', updateAwareness);
  }, [providerRef]);

  const setLocalState = (state) => {
    const provider = providerRef.current;
    if (provider) {
      provider.awareness.setLocalStateField('user', state);
    }
  };

  return { onlineUsers, setLocalState };
}
```

- [ ] **Step 3: Update ProjectPage.jsx to use Yjs**

Replace the existing data loading and task mutation logic in `client/src/pages/ProjectPage.jsx`:

```jsx
import { useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useYjs } from '../hooks/useYjs';
import { useAwareness } from '../hooks/useAwareness';
import TopBar from '../components/TopBar';
import SidePanel from '../components/SidePanel';
import GanttChart from '../components/GanttChart';
import TaskDrawer from '../components/TaskDrawer';

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  const { tasks: tasksMap, connected, updateTask, addTask, deleteTask, provider } = useYjs(id);
  const { onlineUsers, setLocalState } = useAwareness(provider);

  // Set local awareness state
  useEffect(() => {
    setLocalState({ username: user.username, color: user.color });
  }, [user]);

  useEffect(() => {
    api.getProjects().then((data) => {
      setProject(data.projects.find((p) => p.id === id));
    });
    api.initWS(id);
  }, [id]);

  const tasks = useMemo(() => {
    return Object.values(tasksMap).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [tasksMap]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setDrawerOpen(true);
  };

  const handleTaskSave = (taskData) => {
    if (selectedTask) {
      updateTask(selectedTask.id, taskData);
    } else {
      addTask({
        id: uuid(),
        project_id: id,
        name: taskData.name,
        start: taskData.start,
        end: taskData.end,
        progress: taskData.progress,
        dependencies: taskData.dependencies,
        parent_id: null,
        sort_order: tasks.length,
        color: taskData.color,
        assigned_to: null,
        created_by: user.id,
      });
    }
    setDrawerOpen(false);
  };

  const handleTaskDelete = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id);
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  const handleDateChange = (task, start, end) => {
    updateTask(task.id, { start, end });
  };

  if (!project) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        project={project}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
        onlineUsers={onlineUsers}
        connected={connected}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidePanelOpen && (
          <SidePanel
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <GanttChart
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDateChange={handleDateChange}
          />
        </div>
      </div>
      {drawerOpen && (
        <TaskDrawer
          task={selectedTask}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update TopBar.jsx to show online users**

Replace `TopBar.jsx` to accept `onlineUsers` and `connected` props and display them:

```jsx
import { useNavigate } from 'react-router-dom';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel, onlineUsers = [], connected = false }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5', height: 48
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 16 }}>&larr;</button>
        <button onClick={onToggleSidePanel} style={{ padding: '4px 8px', fontSize: 12 }}>
          {sidePanelOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#059669' : '#DC2626', display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
          {onlineUsers.length} online
        </span>
        {onlineUsers.map((u) => (
          <span key={u.clientId} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, display: 'inline-block' }} />
            {u.username}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update GanttChart.jsx to not re-initialize on every task change**

In `client/src/components/GanttChart.jsx`, add a check so the Gantt instance isn't recreated on every render:

```jsx
import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';

export default function GanttChart({ tasks, onTaskClick, onDateChange }) {
  const containerRef = useRef(null);
  const ganttRef = useRef(null);
  const prevTaskIdsRef = useRef('');

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const currentIds = tasks.map((t) => t.id).sort().join(',');

    if (ganttRef.current) {
      if (currentIds !== prevTaskIdsRef.current) {
        ganttRef.current.refresh(tasks);
        prevTaskIdsRef.current = currentIds;
      }
      return;
    }

    const ganttTasks = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      dependencies: (t.dependencies || []).join(', '),
    }));

    ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
      view_mode: 'Day',
      bar_height: 30,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 18,
      date_format: 'YYYY-MM-DD',
      language: 'en',
      readonly: false,
      on_click: (task) => onTaskClick(task),
      on_date_change: (task, start, end) => onDateChange(task, start, end),
      custom_popup_html: (task) => {
        return `<div style="padding:8px"><strong>${task.name}</strong><br/>${task.start} → ${task.end}<br/>Progress: ${task.progress}%</div>`;
      },
    });

    prevTaskIdsRef.current = currentIds;

    return () => {
      ganttRef.current = null;
    };
  }, [tasks]);

  return (
    <div style={{ padding: 16, height: '100%' }}>
      <svg ref={containerRef} id="gantt-container" style={{ width: '100%' }} />
    </div>
  );
}
```

- [ ] **Step 6: Install uuid in client**

```bash
cd /Users/fxy/Documents/projects/gantt-project/client && npm install uuid
```

- [ ] **Step 7: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/hooks/ client/src/pages/ProjectPage.jsx client/src/components/TopBar.jsx client/src/components/GanttChart.jsx client/package.json client/package-lock.json
git commit -m "feat: real-time collaboration with Yjs and awareness"
```

---

### Task 14: Export Gantt as image

**Files:**
- Modify: `client/src/components/TopBar.jsx` (add export button)

- [ ] **Step 1: Add export button to TopBar.jsx**

Add an export button after the online users section in TopBar.jsx:

```jsx
import { useNavigate } from 'react-router-dom';

export default function TopBar({ project, sidePanelOpen, onToggleSidePanel, onlineUsers = [], connected = false }) {
  const navigate = useNavigate();

  const handleExport = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const el = document.querySelector('#gantt-container');
    if (!el) return;
    const canvas = await html2canvas(el.parentElement, { backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `${project.name}-gantt.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5', height: 48
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: 16 }}>&larr;</button>
        <button onClick={onToggleSidePanel} style={{ padding: '4px 8px', fontSize: 12 }}>
          {sidePanelOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handleExport} style={{ padding: '4px 12px', fontSize: 12, background: '#0891B2', color: '#fff', border: 'none', borderRadius: 4 }}>
          Export PNG
        </button>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#059669' : '#DC2626', display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>
          {onlineUsers.length} online
        </span>
        {onlineUsers.map((u) => (
          <span key={u.clientId} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.color, display: 'inline-block' }} />
            {u.username}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify export works**

Start both server and client, open a project with tasks, click "Export PNG" and verify a PNG file downloads.

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add client/src/components/TopBar.jsx
git commit -m "feat: export Gantt chart as PNG"
```

---

### Task 15: Final integration test and README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```md
# Gantt Project

Collaborative Gantt project management for small teams. Runs locally, accessible over LAN.

## Quick Start

```bash
npm run setup
npm run dev
```

Server runs at http://localhost:3001, client dev server at http://localhost:5173.
Other team members access via `http://<your-ip>:3001`.

## Tech

- React + Vite (frontend)
- Fastify (backend API)
- SQLite + better-sqlite3 (database)
- Frappe Gantt (Gantt chart)
- Yjs + y-websocket (real-time collaboration)

## Features

- User registration and login
- Multi-project management with member invites
- Task CRUD with hierarchical structure
- Interactive Gantt chart (drag, resize, dependencies)
- Real-time collaborative editing (CRDT-based)
- Online user awareness
- Export Gantt as PNG
```
```

- [ ] **Step 2: Full integration test**

```bash
cd /Users/fxy/Documents/projects/gantt-project

# Start both servers
npm run dev &
sleep 5

# Test API health
curl http://localhost:3001/api/health

# Test client serves
curl http://localhost:5173 | head -5

# Kill servers
kill %1
```

Expected: Both servers respond correctly.

- [ ] **Step 3: Commit**

```bash
cd /Users/fxy/Documents/projects/gantt-project
git add README.md
git commit -m "docs: add README with setup instructions"
```
