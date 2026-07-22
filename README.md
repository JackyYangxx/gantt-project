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
