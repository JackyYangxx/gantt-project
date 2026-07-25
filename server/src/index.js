import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import ws from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';
import { authRoutes } from './auth.js';
import { adminRoutes } from './admin.js';
import { projectRoutes } from './projects.js';
import { taskRoutes } from './tasks.js';
import { setupWebSocket } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const JWT_SECRET = process.env.JWT_SECRET || 'gantt-dev-secret-change-in-production';

export async function start(options = {}) {
  const app = Fastify({ logger: options.log !== false });

  await app.register(cors, { origin: true });
  await app.register(fjwt, { secret: options.jwtSecret || JWT_SECRET });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'unauthorized' });
    }
  });

  app.decorate('requireMember', async (req, reply) => {
    const db = getDb();
    let projectId = req.params.projectId;

    if (!projectId) {
      // If :id is a task ID, resolve project_id from tasks table
      const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(req.params.id);
      if (task) {
        projectId = task.project_id;
      } else {
        projectId = req.params.id;
      }
    }

    if (!projectId) {
      return reply.status(400).send({ error: 'project id required' });
    }

    const member = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);
    if (!member) {
      return reply.status(403).send({ error: 'forbidden' });
    }
  });

  await app.register(ws);

  getDb();

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(adminRoutes, { prefix: '/api/a7x9k2m' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(taskRoutes, { prefix: '/api' });

  await app.register(setupWebSocket);

  // Serve static files in production mode
  const staticDir = options.staticDir || process.env.STATIC_DIR;
  if (staticDir) {
    await app.register(fastifyStatic, {
      root: staticDir,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API non-WS routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
        return reply.code(404).send({ error: 'not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  const port = options.port || parseInt(process.env.PORT || '3001');
  const host = options.host || '0.0.0.0';
  await app.listen({ port, host });
  return { app, port: app.server.address().port, host };
}

// Auto-start when run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
