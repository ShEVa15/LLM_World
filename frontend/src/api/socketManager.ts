import { useSimulationStore } from "../store/useSimulationStore";
import type { Agent, Task } from "../types";

interface ChatMessagePayload {
  text: string;
  senderId: string;
}
interface AgentUpdatePayload {
  agentKey: string;
  updates: Partial<Agent>;
}
interface TaskUpdatePayload {
  taskId: string;
  updates: Partial<Task>;
}

type SocketEvent =
  | { type: "CHAT_MESSAGE"; payload: ChatMessagePayload }
  | { type: "AGENT_UPDATE"; payload: AgentUpdatePayload }
  | { type: "TASK_UPDATE"; payload: TaskUpdatePayload };

// Сохраняем активное подключение, чтобы писать в него из React
let activeSocket: WebSocket | null = null;

export const SocketManager = {
  dispatch: (event: SocketEvent) => {
    const store = useSimulationStore.getState();
    switch (event.type) {
      case "CHAT_MESSAGE":
        store.addMessage(event.payload.text, event.payload.senderId);
        break;
      case "AGENT_UPDATE":
        store.updateAgentState(event.payload.agentKey, event.payload.updates);
        break;
      case "TASK_UPDATE":
        store.updateTaskState(event.payload.taskId, event.payload.updates);
        break;
    }
  },

  // НОВЫЙ МЕТОД: Отправка готового промпта на бэкенд
  sendLlmRequest: (agentId: string, prompt: string) => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(
        JSON.stringify({
          type: "ASK_LLM",
          payload: { agentId, promptText: prompt },
        }),
      );
    } else {
      console.warn("[Socket] Нет подключения к бэкенду. Промпт не отправлен.");
    }
  },

  connect: (url: string) => {
    console.log(`[Socket] Connecting to ${url}...`);
    activeSocket = new WebSocket(url);

    activeSocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SocketEvent;
        SocketManager.dispatch(data);
      } catch (err) {
        console.error("[Socket] Ошибка парсинга входящего сообщения", err);
      }
    };
    return activeSocket;
  },
};
