-- RackerTracker schema
-- Multi-tenant: every table below organizations is scoped by organization_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE plan_tier AS ENUM ('startup', 'small_cap', 'mid_cap', 'large_cap');
CREATE TYPE user_role AS ENUM ('admin', 'technician');
CREATE TYPE machine_status AS ENUM ('good', 'needs_maintenance', 'emergency');

-- Organizations and plans

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  plan_tier     plan_tier NOT NULL DEFAULT 'startup',
  max_modules   INTEGER NOT NULL DEFAULT 3,
  max_computers INTEGER NOT NULL DEFAULT 50,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (admins and technicians), scoped to one organization

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'technician',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_org ON users(organization_id);

-- Modules / racks

CREATE TABLE modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position_x      INTEGER NOT NULL DEFAULT 0,
  position_y      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modules_org ON modules(organization_id);

-- Computers within a module/rack

CREATE TABLE computers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  identifier      TEXT NOT NULL,        -- admin-assigned name/label, e.g. "PC-04" or a serial tag
  rack_position   INTEGER NOT NULL DEFAULT 0,  -- ordering within the module's 2D grid
  status          machine_status NOT NULL DEFAULT 'good',
  last_updated_by UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, identifier)
);

CREATE INDEX idx_computers_org ON computers(organization_id);
CREATE INDEX idx_computers_module ON computers(module_id);

-- Append-only audit trail of every status change

CREATE TABLE status_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  computer_id     UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  old_status      machine_status,
  new_status      machine_status NOT NULL,
  changed_by      UUID REFERENCES users(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_logs_computer ON status_logs(computer_id);
CREATE INDEX idx_status_logs_org ON status_logs(organization_id);

-- Keep computers.updated_at in sync automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_computers_updated_at
BEFORE UPDATE ON computers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
