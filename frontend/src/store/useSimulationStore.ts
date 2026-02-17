import { create } from "zustand";
import type { Agent, ChatEntry } from "../types";

// Хардкод ассетов (цвета, аватарки), так как бэкенд их не хранит
const AGENT_ASSETS: Record<string, { color: string; avatar: string }> = {
  "Max": { color: "#3b82f6", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max" },
  "Rin": { color: "#f43f5e", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rin" },
  "Kira": { color: "#10b981", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kira" },
  "Alex": { color: "#a855f7", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
  "default": { color: "#64748b", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bot" }
};

interface SimulationStore {
  // Данные с бэкенда
  agents: Agent[];
  chats: ChatEntry[];
  
  // Состояние интерфейса (которое я случайно удалил)
  activeTab: "map" | "chat" | "tasks";
  simMinutes: number;
  isPaused: boolean;
  selectedAgentId: number | null;
  isInspectorOpen: boolean;

  // Actions
  fetchState: () => Promise<void>;
  setActiveTab: (tab: "map" | "chat" | "tasks") => void;
  setSelectedAgent: (id: number | null) => void;
  toggleInspector: () => void;
  tick: () => void; // Нужно для часов
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  // Начальные значения
  agents: [],
  chats: [],
  activeTab: "map",      // <--- Вернули вкладку по умолчанию!
  simMinutes: 540,       // 9:00 утра (540 минут)
  isPaused: false,
  selectedAgentId: null,
  isInspectorOpen: false,

  // Запрос к серверу
  fetchState: async () => {
    try {
      const agentsRes = await fetch("http://127.0.0.1:8000/agents/");
      if (!agentsRes.ok) throw new Error("Backend offline");
      const agentsData = await agentsRes.json();

      // Добавляем цвета и аватарки к "сухим" данным с сервера
      const enrichedAgents = agentsData.map((a: any) => ({
        ...a,
        avatar: AGENT_ASSETS[a.name]?.avatar || AGENT_ASSETS["default"].avatar,
        color: AGENT_ASSETS[a.name]?.color || AGENT_ASSETS["default"].color,
      }));

      const chatsRes = await fetch("http://127.0.0.1:8000/chats/");
      const chatsData = await chatsRes.json();

      set({ agents: enrichedAgents, chats: chatsData });
    } catch (e) {
      console.error("Ошибка связи с бэкендом (он запущен?):", e);
    }
  },

  // Простая логика часов (время идет, пока работает фронт)
  tick: () => set((state) => ({ simMinutes: state.simMinutes + 1 })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
}));