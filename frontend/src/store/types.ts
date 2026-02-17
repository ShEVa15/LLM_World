export type AgentStatus = "IDLE" | "WORKING" | "RESTING" | "ERROR" | "INCIDENT";

export interface Agent {
  id: number;
  name: string;
  role: string;
  
  // Данные с сервера
  status: AgentStatus;
  current_activity: string;
  current_mood_score: number;
  stress: number;           // Теперь берем это с бэкенда!
  coord_x: number;
  coord_y: number;
  
  // Визуальные (генерируем на фронте)
  avatar: string;
  color: string;
}

export interface ChatEntry {
  agents: string[];
  text: string;
  time: string;
}