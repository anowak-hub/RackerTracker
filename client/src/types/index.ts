export type MachineStatus = "good" | "needs_maintenance" | "emergency";

export interface Module {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
}

export interface Computer {
  id: string;
  module_id: string;
  identifier: string;
  rack_position: number;
  status: MachineStatus;
}
