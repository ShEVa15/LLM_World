import { create } from "zustand";
import type { Agent, Task, GameEvent, Message } from "../types";
import {
  INITIAL_AGENTS,
  INITIAL_TASKS,
  SIMULATION_START_TIME,
  SIMULATION_END_TIME,
} from "../constants/initialData";

const RANDOM_EVENTS: GameEvent[] = [
  {
    id: "prod_down",
    icon: "🔥",
    title: "Упал ПРОД!",
    desc: "Ошибка в конфигурации CORS положила сервер. Макс должен срочно все бросить и поднять базу.",
    glowColor: "bg-rose-500",
    titleColor: "text-rose-400",
    effectText:
      '🔴 Макс: Бросает текущую работу. Статус "Чинит Прод". Стресс +40%. Занят на 1 час.',
    targetAgent: "max",
    durationMins: 60,
    stressPenalty: 40,
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
  {
    id: "merge_conflict",
    icon: "⚔️",
    title: "Merge Конфликт",
    desc: "Рин случайно затерла чужие стили в Tailwind. Придется потратить время на ручной резолв конфликтов в Git.",
    glowColor: "bg-yellow-500",
    titleColor: "text-yellow-400",
    effectText:
      '🟡 Рин: Бросает работу. Статус "Резолвит Git". Стресс +15%. Занята на 30 мин.',
    targetAgent: "rin",
    durationMins: 30,
    stressPenalty: 15,
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
  addMessage: (text: string, senderId: string) => void;
  updateAgentState: (agentKey: string, updates: Partial<Agent>) => void;
  updateTaskState: (taskId: string, updates: Partial<Task>) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
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
  simMinutes: SIMULATION_START_TIME,
  isPaused: false,
  agents: INITIAL_AGENTS,
  tasks: INITIAL_TASKS,
  messages: [
    {
      id: "sys-start",
      text: "Система инициализирована. Агенты готовы к работе.",
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
            agent.position = agent.basePosition;
          } else if (agent.status === "RESTING") {
            if (agent.currentTaskId && updatedTasks[agent.currentTaskId]) {
              const task = updatedTasks[agent.currentTaskId];
              if (task.status === "PAUSED") {
                agent.status = "WORKING";
                agent.busyUntil =
                  nextMinutes + (task.durationMins - task.progressMins);
                agent.position = agent.basePosition;
                task.status = "IN_PROGRESS";
              }
            } else {
              agent.status = "IDLE";
              agent.busyUntil = 0;
              agent.position = agent.basePosition;
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
          agent.position = agent.basePosition;
        }
      });

      let newActiveEvent = state.activeEvent;
      let newIsPaused = state.isPaused;
      if (!newIsPaused && !newActiveEvent && Math.random() < 0.02) {
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
            position: agent.basePosition,
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

      if (eventType === "coffee") {
        updates.status = "RESTING";
        updates.stress = Math.max(0, agent.stress - 15);
        updates.busyUntil = state.simMinutes + 15;
        updates.position = { x: 65, y: 325 };
      } else if (eventType === "lounge") {
        updates.status = "RESTING";
        updates.stress = Math.max(0, agent.stress - 40);
        updates.busyUntil = state.simMinutes + 60;
        updates.position = { x: 380, y: 40 };
      } else if (eventType === "work") {
        updates.status = "IDLE";
        updates.busyUntil = 0;
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
        Object.keys(updatedAgents).forEach((key) => {
          updatedAgents[key].stress = Math.max(
            0,
            updatedAgents[key].stress - 20,
          );
        });
        updatedTasks[incidentId] = {
          id: incidentId,
          title: ev.title,
          difficulty: "EASY",
          description: ev.desc,
          tags: ["Бафф"],
          durationMins: 0,
          stressPenalty: 0,
          status: "DONE",
          assignedAgentId: null,
          progressMins: 0,
          isIncident: true,
          icon: ev.icon,
        };
      } else {
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
        agent.position = agent.basePosition;
      }

      return {
        agents: updatedAgents,
        tasks: updatedTasks,
        activeEvent: null,
        isPaused: false,
      };
    }),
}));
