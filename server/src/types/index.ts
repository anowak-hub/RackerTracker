export type PlanTier = "startup" | "small_cap" | "mid_cap" | "large_cap";
export type UserRole = "admin" | "technician";
export type MachineStatus = "good" | "needs_maintenance" | "emergency";

export interface Organization {
  id: string;
  name: string;
  plan_tier: PlanTier;
  max_modules: number;
  max_computers: number;
  created_at: string;
}

export interface AuthUser {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
}

export interface Module {
  id: string;
  organization_id: string;
  name: string;
  position_x: number;
  position_y: number;
  created_by: string | null;
  created_at: string;
}

export interface Computer {
  id: string;
  organization_id: string;
  module_id: string;
  identifier: string;
  rack_position: number;
  status: MachineStatus;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Augment Express's Request type once real auth middleware is wired in.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
