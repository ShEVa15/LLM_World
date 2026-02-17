import type { Agent, Task } from "../types";

export const SIMULATION_START_TIME = 9 * 60; // 09:00
export const SIMULATION_END_TIME = 18 * 60; // 18:00

export const INITIAL_AGENTS: Record<string, Agent> = {
  max: {
    id: "LBM-01",
    name: "Макс",
    role: "Backend Architect",
    avatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Max",
    color: "#0ea5e9",
    status: "IDLE",
    stress: 30,
    traits: ["Архитектор", "Сфокусирован"],
    position: { x: 540, y: 530 }, // <-- Точные пиксели рабочего стола
    basePosition: { x: 540, y: 530 },
    currentTaskId: null,
    busyUntil: 0,
  },
  rin: {
    id: "LBM-02",
    name: "Рин",
    role: "UI/UX & React Dev",
    avatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Rin",
    color: "#f43f5e",
    status: "IDLE",
    stress: 78,
    traits: ["Перфекционист", "Риск выгорания"],
    position: { x: 310, y: 530 }, // <-- Точные пиксели рабочего стола
    basePosition: { x: 310, y: 530 },
    currentTaskId: null,
    busyUntil: 0,
  },
};

export const INITIAL_TASKS: Record<string, Task> = {
  "task-1": {
    id: "task-1",
    title: "Проектирование API для Gzhelka",
    difficulty: "HARD",
    description: "Реализация надежного REST API на Express, обработка CORS.",
    tags: ["Node.js", "FastAPI"],
    durationMins: 240, // 4 часа
    stressPenalty: 25,
    status: "TODO",
    assignedAgentId: null,
    progressMins: 0,
  },
  "task-2": {
    id: "task-2",
    title: "Верстка интерфейса и логика DOM",
    difficulty: "MEDIUM",
    description: "Подготовка структуры HTML/Tailwind, анимации через DOM JS.",
    tags: ["DOM JS", "Tailwind"],
    durationMins: 360, // 6 часов
    stressPenalty: 35,
    status: "TODO",
    assignedAgentId: null,
    progressMins: 0,
  },
  "task-3": {
    id: "task-3",
    title: "Сборка React-компонентов",
    difficulty: "EASY",
    description: "Декомпозиция верстки на компоненты с типизацией TypeScript.",
    tags: ["React", "TS"],
    durationMins: 120, // 2 часа
    stressPenalty: 15,
    status: "TODO",
    assignedAgentId: null,
    progressMins: 0,
  },
};
