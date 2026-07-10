# RackerTracker

A multi-tenant web app for tracking maintenance on server/rack hardware in data centers. Admins organize computers into racks ("modules"), technicians update per-machine status (good / needs maintenance / emergency), and every change is logged for audit purposes.

## Why this exists

Most IT asset management tools are built for enterprise scale and either overkill or expensive for smaller ops teams. RackerTracker focuses on one thing: give an admin a spatial, at-a-glance view of hardware health across racks, and give technicians a fast way to log status from the floor.

## Architecture

```
rackertracker/
├── client/     React + TypeScript frontend (Vite)
├── server/     Node + Express + TypeScript API
└── docker-compose.yml   Local Postgres for development
```

**Stack decisions:**
- **Postgres**, not Mongo — the data is inherently relational (org → plan → modules → computers → status logs), and plan-limit enforcement relies on constraints/counts that are painful in a document store.
- **Server-side plan-limit enforcement** — rack/computer caps are checked in the API layer, not just hidden in the UI, since client-side limits are trivially bypassed.
- **Status changes are append-only logged** (`status_logs` table) rather than just overwriting a `status` column, so there's a full audit trail of who changed what and when.
- **Org-scoped multi-tenancy from day one** — every query is scoped by `organization_id`. Retrofitting multi-tenancy later is much more painful than building it in from the start.

## Roles

- **Admin** — creates modules/racks, adds computers, invites technicians, sees full org visibility.
- **Technician** — updates status on computers, scoped to their organization.

## Status of this project

Early-stage portfolio project. Core scaffold + schema in place; CRUD endpoints, auth, and the visualization layer are in progress. See `server/src/db/schema.sql` for the current data model.

## Local development

### Prerequisites
- Node.js 20+
- Docker (for local Postgres) or a Postgres instance of your own

### Setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Set up the server
cd server
cp .env.example .env   # fill in DATABASE_URL, etc.
npm install
npm run dev

# 3. Set up the client (separate terminal)
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`, API on `http://localhost:3001`.
