# Gantt Collaborative Project Management Platform - Design Spec

**Date:** 2026-07-22
**Status:** Draft

## Overview

A web-based Gantt project management platform with real-time collaborative editing, designed for small teams (2-10 people) on a local network. One person starts the server, and others access it via browser using the host's IP address.

## Tech Stack

- **Frontend:** React SPA (Vite)
- **Backend:** Node.js + Fastify
- **Database:** SQLite (better-sqlite3)
- **Gantt Library:** Frappe Gantt (MIT license, https://github.com/frappe/gantt)
- **Real-time Collaboration:** Yjs + y-websocket (CRDT-based sync)
- **Real-time Transport:** WebSocket

## Architecture

Dual-channel communication:
- **REST API (Fastify):** User auth, project CRUD, task CRUD
- **WebSocket (y-websocket):** Real-time collaborative editing, awareness (who's editing what)

Data flow: Frontend Yjs doc ↔ WebSocket ↔ Server Yjs doc → debounced persist to SQLite

Yjs handles all conflict resolution via CRDT (last-write-wins for same field, independent writes are conflict-free).

## Data Model

### User
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| username | string | unique |
| password_hash | string | bcrypt |
| color | string | hex color for Gantt identification |
| created_at | timestamp | |

### Project
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| name | string | |
| owner_id | string | FK → User |
| created_at | timestamp | |
| members | User[] | many-to-many via project_members |

### Task (aligned with Frappe Gantt task structure)
| Field | Type | Notes |
|-------|------|-------|
| id | string | PK |
| project_id | string | FK → Project |
| name | string | Frappe Gantt native |
| start | date | Frappe Gantt native |
| end | date | Frappe Gantt native |
| progress | number (0-100) | Frappe Gantt native |
| dependencies | string[] | task ids, Frappe Gantt native |
| parent_id | string | null for root tasks, task hierarchy |
| sort_order | number | sibling ordering |
| color | string | custom task color |
| assigned_to | string | FK → User |
| created_by | string | FK → User |
| created_at | timestamp | |
| updated_at | timestamp | |

### Yjs Document Structure (per project)
```
Y.Doc (project-{id})
  ├─ Y.Map "tasks"       // { [taskId]: Task }
  ├─ Y.Map "awareness"   // { [userId]: { editing: taskId, color, username } }
  └─ Y.Array "order"     // [taskId, ...] task display order
```

## Frontend Components

```
App
├─ LoginPage                       // Register + Login
├─ ProjectListPage                 // Project list with cards
│   ├─ ProjectCard[]
│   └─ CreateProjectDialog
└─ ProjectPage                     // Main workspace
    ├─ TopBar                      // Project name, view toggle, export, online users
    ├─ SidePanel (collapsible)
    │   ├─ TaskTree                // Tree list with expand/collapse, drag sort
    │   │   └─ TaskRow[]           // Name, progress, assignee color dot
    │   └─ AddTaskButton
    ├─ GanttChart                  // Frappe Gantt wrapper
    │   ├─ TimelineHeader          // Day/Week/Month toggle
    │   └─ TaskBar[]               // Draggable, resizable task bars
    └─ TaskDrawer (slide panel)    // Task detail editor
        ├─ TaskForm                // Name, dates, progress, deps, assignee, color
        └─ DeleteTaskButton
```

### Collaboration Awareness
- TopBar shows online users with color indicators
- Task bar shows colored border while another user is dragging it
- Task row shows lock icon while another user is editing it in TaskDrawer

## REST API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login, returns JWT token (stored in localStorage) |
| POST | /api/auth/logout | Logout |
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project detail + members |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete (owner only) |
| POST | /api/projects/:id/members | Invite member by username |
| GET | /api/projects/:id/tasks | Get all tasks |
| POST | /api/projects/:id/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

## Real-time Sync Flow

1. User drags task bar → local Gantt updates start/end → writes to Yjs Y.Map
2. y-websocket syncs Y.Doc delta to server → server broadcasts to room peers
3. Other clients' Y.Map updates → React re-renders Gantt (no page refresh)
4. Server debounces Y.Doc changes (500ms) → persists to SQLite
5. When first user opens a project, server loads tasks from SQLite → hydrates Y.Doc. Subsequent users joining the same project get state from the existing Y.Doc.

## Server Startup

Single command starts both the API server and WebSocket server on the same port:
- API: http://0.0.0.0:3001
- WebSocket: ws://0.0.0.0:3001/ws
- SQLite file created automatically at `./data/gantt.db` on first run
- Host machine opens browser automatically to `http://localhost:3001`
- Other users access via `http://<host-ip>:3001`

## Phase 1 MVP Features

- User registration and login (username + password)
- Project CRUD (create, list, update, delete)
- Multi-member project (invite by username)
- Task CRUD with hierarchical parent/child structure
- Gantt chart rendering (Frappe Gantt)
- Drag to change task start/end dates
- Drag to create task dependencies
- Task progress editing (0-100%)
- Real-time collaborative sync (Yjs CRDT)
- Online user awareness (who is editing what)
- Day/Week/Month view toggle
- Export Gantt as image or PDF (html2canvas for PNG, optionally print to PDF)
- Local network access via IP:port
