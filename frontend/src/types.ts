export type AgentStatus = "IDLE" | "WORKING" | "RESTING" | "ERROR" | "INCIDENT";
export type TaskDifficulty = "EASY" | "MEDIUM" | "HARD";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "PAUSED";

export interface Coordinates {
  x: number;
  y: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  status: AgentStatus;
  stress: number;
  traits: string[];
  position: Coordinates;
  basePosition: Coordinates;
  currentTaskId: string | null;
  busyUntil: number;

  // === НОВЫЕ ПОЛЯ ДЛЯ ЛОРА (Инспектор) ===
  specialization: string;
  temperament: string;
  catchphrase: string;
  trigger: string;
}

export interface Task {
  id: string;
  title: string;
  difficulty: TaskDifficulty;
  description: string;
  tags: string[];
  durationMins: number;
  stressPenalty: number;
  status: TaskStatus;
  assignedAgentId: string | null;
  progressMins: number;
  isIncident?: boolean;
  icon?: string;
}

export interface GameEvent {
  id: string;
  icon: string;
  title: string;
  desc: string;
  glowColor: string;
  titleColor: string;
  effectText: string;
  targetAgent: string | null;
  durationMins: number;
  stressPenalty: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: "user" | "system" | string;
  timestamp: number;
}
