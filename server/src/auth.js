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
