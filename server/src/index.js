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
