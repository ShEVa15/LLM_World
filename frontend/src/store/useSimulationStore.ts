import { create } from "zustand";
import type { Agent, Task, GameEvent, Message } from "../types";
import {
  INITIAL_AGENTS,
  INITIAL_TASKS,
  SIMULATION_START_TIME,
  SIMULATION_END_TIME,
} from "../constants/initialData";
import { buildAgentPrompt } from "../api/promptBuilder";
import { SocketManager } from "../api/socketManager";
// === КООРДИНАТЫ ЗОН ===
const ZONES = {
  COFFEE: { x: 100, y: 250 },
  PIZZA: { x: 250, y: 150 }, // Район между овальным столом и левым верхним углом
};

// Смещение для рассадки ТРЕУГОЛЬНИКОМ во время пиццы
const PIZZA_OFFSETS: Record<string, { x: number; y: number }> = {
  ockham: { x: 0, y: -25 }, // Вершина треугольника (сверху)
  christina: { x: -25, y: 20 }, // Левый нижний угол
  darius: { x: 25, y: 20 }, // Правый нижний угол
};

const RANDOM_EVENTS: GameEvent[] = [
  {
    id: "prod_down",
    icon: "🔥",
    title: "Упал ПРОД!",
    desc: "Сработал OOM Killer, база данных легла. Оккам должен срочно восстановить репликацию.",
    glowColor: "bg-rose-500",
    titleColor: "text-rose-400",
    effectText: "🔴 Оккам: Бежит в серверную. Стресс +40%. Занят на 1 час.",
    targetAgent: "ockham",
    durationMins: 60,
    stressPenalty: 40,
  },
  {
    id: "ui_broken",
    icon: "💥",
    title: "Сломалась верстка",
    desc: "Заказчик открыл сайт в старом Safari. Все флексбоксы поехали. Кристина в ярости.",
    glowColor: "bg-yellow-500",
    titleColor: "text-yellow-400",
    effectText:
      "🟡 Кристина: Разбирается с багом. Стресс +35%. Занята на 45 мин.",
    targetAgent: "christina",
    durationMins: 45,
    stressPenalty: 35,
  },
  {
    id: "pipeline_failed",
    icon: "⛔",
    title: "Пайплайн покраснел",
    desc: "Кто-то случайно запушил секретные ключи. Дариус пошел отзывать доступы.",
    glowColor: "bg-rose-500",
    titleColor: "text-rose-400",
    effectText: "🔴 Дариус: Блокирует доступы. Стресс +35%. Занят на 50 мин.",
    targetAgent: "darius",
    durationMins: 50,
    stressPenalty: 35,
  },
  {
    id: "pizza_time",
    icon: "🍕",
    title: "Пицца в офисе",
    desc: "HR-отдел заказал пиццу в зону отдыха. Отличный повод перевести дух.",
    glowColor: "bg-emerald-500",
    titleColor: "text-emerald-400",
    effectText: "🟢 Все агенты: Уровень стресса снижен на 20%.",
    targetAgent: null,
    durationMins: 0,
    stressPenalty: 0,
  },
];

interface SimulationState {
  simMinutes: number;
  isPaused: boolean;
  agents: Record<string, Agent>;
  tasks: Record<string, Task>;
  messages: Message[];
  activeTab: "chat" | "tasks" | "map";
  isInspectorOpen: boolean;
  selectedAgentId: string | null;
  activeEvent: GameEvent | null;
  activeIncidents: string[];
  tick: () => void;
  setActiveTab: (tab: "chat" | "tasks" | "map") => void;
  toggleInspector: () => void;
  setSelectedAgent: (id: string | null) => void;
  assignTask: (taskId: string, agentKey: string) => void;
  applyGlobalEvent: (
    eventType: "coffee" | "lounge" | "work",
    agentKey: string,
  ) => void;
  resolveEvent: () => void;

  // Функции для API Бэкенда
  addMessage: (text: string, senderId: string) => void;
  updateAgentState: (agentKey: string, updates: Partial<Agent>) => void;
  updateTaskState: (taskId: string, updates: Partial<Task>) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  simMinutes: SIMULATION_START_TIME,
  isPaused: false,
  agents: INITIAL_AGENTS,
  tasks: INITIAL_TASKS,
  activeIncidents: [],
  messages: [
    {
      id: "sys-start",
      text: "Система инициализирована. Агенты на позициях.",
      senderId: "system",
      timestamp: SIMULATION_START_TIME,
    },
  ],
  activeTab: "map",
  isInspectorOpen: false,
  selectedAgentId: null,
  activeEvent: null,

  addMessage: (text, senderId) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `msg-${Date.now()}-${Math.random()}`,
          text,
          senderId,
          timestamp: state.simMinutes,
        },
      ],
    })),

  updateAgentState: (agentKey, updates) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentKey]: { ...state.agents[agentKey], ...updates },
      },
    })),

  updateTaskState: (taskId, updates) =>
    set((state) => ({
      tasks: {
        ...state.tasks,
        [taskId]: { ...state.tasks[taskId], ...updates },
      },
    })),

  tick: () => {
    const state = get();
    if (state.isPaused || state.simMinutes >= SIMULATION_END_TIME) return;

    set((state) => {
      const nextMinutes = state.simMinutes + 1;
      const updatedAgents = { ...state.agents };
      const updatedTasks = { ...state.tasks };

      Object.keys(updatedAgents).forEach((key) => {
        const agent = updatedAgents[key];

        if (agent.busyUntil > 0 && nextMinutes >= agent.busyUntil) {
          if (agent.status === "WORKING") {
            if (agent.currentTaskId && updatedTasks[agent.currentTaskId]) {
              const task = updatedTasks[agent.currentTaskId];
              task.status = "DONE";
              task.progressMins = task.durationMins;
              agent.stress = Math.min(100, agent.stress + task.stressPenalty);
            }
            agent.status = "IDLE";
            agent.busyUntil = 0;
            agent.currentTaskId = null;
            agent.position = agent.basePosition; // Возврат на рабочее место после задачи
          } else if (agent.status === "RESTING") {
            if (agent.currentTaskId && updatedTasks[agent.currentTaskId]) {
              const task = updatedTasks[agent.currentTaskId];
              if (task.status === "PAUSED") {
                agent.status = "WORKING";
                agent.busyUntil =
                  nextMinutes + (task.durationMins - task.progressMins);
                agent.position = agent.basePosition; // Возврат к столу с перерыва
                task.status = "IN_PROGRESS";
              }
            } else {
              agent.status = "IDLE";
              agent.busyUntil = 0;
              agent.position = agent.basePosition; // Возврат к столу с перерыва
            }
          }
        }

        if (agent.stress >= 100 && agent.status !== "ERROR") {
          agent.status = "ERROR";
          if (agent.currentTaskId && updatedTasks[agent.currentTaskId]) {
            const task = updatedTasks[agent.currentTaskId];
            const timeRemaining = agent.busyUntil - state.simMinutes;
            task.progressMins = Math.max(0, task.durationMins - timeRemaining);
            task.status = "PAUSED";
            task.assignedAgentId = null;
          }
          agent.currentTaskId = null;
          agent.position = agent.basePosition; // При выгорании агент садится за стол и зависает
        }
      });

      let newActiveEvent = state.activeEvent;
      let newIsPaused = state.isPaused;
      if (!newIsPaused && !newActiveEvent && Math.random() < 0.01) {
        newActiveEvent =
          RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        newIsPaused = true;
      }

      return {
        simMinutes: nextMinutes,
        agents: updatedAgents,
        tasks: updatedTasks,
        activeEvent: newActiveEvent,
        isPaused: newIsPaused,
      };
    });
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  toggleInspector: () =>
    set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  assignTask: (taskId, agentKey) =>
    set((state) => {
      const agent = state.agents[agentKey];
      const task = state.tasks[taskId];
      if (agent.stress >= 100 || agent.status !== "IDLE") return state;

      return {
        agents: {
          ...state.agents,
          [agentKey]: {
            ...agent,
            status: "WORKING",
            currentTaskId: taskId,
            busyUntil:
              state.simMinutes + (task.durationMins - task.progressMins),
            position: agent.basePosition, // Работаем за своим столом
          },
        },
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            status: "IN_PROGRESS",
            assignedAgentId: agentKey,
          },
        },
      };
    }),

  applyGlobalEvent: (eventType, agentKey) =>
    set((state) => {
      const agent = state.agents[agentKey];
      if (!agent) return state;

      const updates = { ...agent };
      const taskUpdates = { ...state.tasks };

      if (agent.status === "WORKING" && agent.currentTaskId) {
        const taskId = agent.currentTaskId;
        const task = taskUpdates[taskId];
        taskUpdates[taskId] = {
          ...task,
          status: "PAUSED",
          progressMins: Math.max(
            0,
            task.durationMins - (agent.busyUntil - state.simMinutes),
          ),
        };
      }

      // === ПРАВИЛЬНАЯ ПРИВЯЗКА К КАРТЕ ===
      if (eventType === "coffee") {
        updates.status = "RESTING";
        updates.stress = Math.max(0, agent.stress - 15);
        updates.busyUntil = state.simMinutes + 15;
        // Добавим легкий разброс, чтобы не слипались у кофе-машины
        updates.position = {
          x: ZONES.COFFEE.x,
          y: ZONES.COFFEE.y + Math.random() * 40,
        };
      } else if (eventType === "lounge") {
        updates.status = "RESTING";
        updates.stress = Math.max(0, agent.stress - 40);
        updates.busyUntil = state.simMinutes + 60;

        // Локальные оффсеты для идеального треугольника
        const offsets: Record<string, { x: number; y: number }> = {
          ockham: { x: 0, y: -25 }, // Вершина (сверху)
          christina: { x: -25, y: 20 }, // Левый нижний
          darius: { x: 25, y: 20 }, // Правый нижний
        };
        const offset = offsets[agentKey] || { x: 0, y: 0 };

        // ИСПОЛЬЗУЕМ ZONES.PIZZA вместо ZONES.LOUNGE
        updates.position = {
          x: ZONES.PIZZA.x + offset.x,
          y: ZONES.PIZZA.y + offset.y,
        };
      } else if (eventType === "work") {
        updates.status = "IDLE";
        updates.busyUntil = 0;
        updates.position = agent.basePosition; // ИСПРАВЛЕНИЕ: Возвращаем агента за стол!
      }

      return {
        agents: { ...state.agents, [agentKey]: updates },
        tasks: taskUpdates,
      };
    }),

  resolveEvent: () =>
    set((state) => {
      const ev = state.activeEvent;
      if (!ev) return state;

      const updatedAgents = { ...state.agents };
      const updatedTasks = { ...state.tasks };
      const incidentId = `inc-${Date.now()}`;

      if (!ev.targetAgent) {
        // ГЛОБАЛЬНЫЙ ИВЕНТ (ПИЦЦА) - Рассадка треугольником
        Object.keys(updatedAgents).forEach((key) => {
          if (updatedAgents[key].status !== "ERROR") {
            updatedAgents[key].status = "RESTING";
            updatedAgents[key].stress = Math.max(
              0,
              updatedAgents[key].stress - 20,
            );
            updatedAgents[key].busyUntil = state.simMinutes + 30; // Едят 30 минут

            const offset = PIZZA_OFFSETS[key] || { x: 0, y: 0 };
            updatedAgents[key].position = {
              x: ZONES.PIZZA.x + offset.x,
              y: ZONES.PIZZA.y + offset.y,
            };
          }
        });
      } else {
        // ОДИНОЧНЫЙ ИНЦИДЕНТ (Упал прод, сломалась верстка и т.д.)
        const agent = updatedAgents[ev.targetAgent];

        if (agent.status === "WORKING" && agent.currentTaskId) {
          const task = updatedTasks[agent.currentTaskId];
          updatedTasks[agent.currentTaskId] = {
            ...task,
            status: "PAUSED",
            assignedAgentId: null,
            progressMins: Math.max(
              0,
              task.durationMins - (agent.busyUntil - state.simMinutes),
            ),
          };
        }

        updatedTasks[incidentId] = {
          id: incidentId,
          title: ev.title,
          difficulty: "HARD",
          description: ev.desc,
          tags: ["Инцидент"],
          durationMins: ev.durationMins,
          stressPenalty: 0,
          status: "IN_PROGRESS",
          assignedAgentId: ev.targetAgent,
          progressMins: 0,
          isIncident: true,
          icon: ev.icon,
        };

        agent.stress = Math.min(100, agent.stress + ev.stressPenalty);
        agent.status = "WORKING";
        agent.currentTaskId = incidentId;
        agent.busyUntil = state.simMinutes + ev.durationMins;

        // ИСПРАВЛЕНИЕ: При инциденте агент остается на своем рабочем месте!
        agent.position = agent.basePosition;
        const promptText = buildAgentPrompt(
          agent,
          updatedTasks[incidentId],
          `${ev.title}: ${ev.desc}`,
        );
        SocketManager.sendLlmRequest(agent.id, promptText);
      }

      return {
        agents: updatedAgents,
        tasks: updatedTasks,
        activeEvent: null,
        isPaused: false,
      };
    }),
}));
