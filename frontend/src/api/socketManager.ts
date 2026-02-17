import { useSimulationStore } from "../store/useSimulationStore";
import type { Agent, Task } from "../types";

// 1. Описываем строгие интерфейсы для каждого типа события
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

// 2. Создаем объединение типов (Discriminated Union).
// Теперь TS будет точно знать, какой payload соответствует какому type.
type SocketEvent =
  | { type: "CHAT_MESSAGE"; payload: ChatMessagePayload }
  | { type: "AGENT_UPDATE"; payload: AgentUpdatePayload }
  | { type: "TASK_UPDATE"; payload: TaskUpdatePayload };

export const SocketManager = {
  /**
   * Принимает типизированное событие и распределяет его по функциям хранилища.
   */
  dispatch: (event: SocketEvent) => {
    const store = useSimulationStore.getState();

    switch (event.type) {
      case "CHAT_MESSAGE":
        // TS теперь знает, что тут payload имеет text и senderId
        store.addMessage(event.payload.text, event.payload.senderId);
        break;

      case "AGENT_UPDATE":
        // TS понимает, что тут есть agentKey и Partial<Agent>
        store.updateAgentState(event.payload.agentKey, event.payload.updates);
        break;

      case "TASK_UPDATE":
        // TS понимает, что тут есть taskId и Partial<Task>
        store.updateTaskState(event.payload.taskId, event.payload.updates);
        break;

      default:
        // Техническая проверка для исключения пропущенных типов
        console.warn(`[Socket] Получен неизвестный тип события`);
    }
  },

  /**
   * Инициализация соединения
   */
  connect: (url: string) => {
    console.log(`[Socket] Connecting to ${url}...`);
    const ws = new WebSocket(url);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SocketEvent;
        SocketManager.dispatch(data);
      } catch (err) {
        console.error("[Socket] Ошибка парсинга входящего сообщения", err);
      }
    };

    return ws;
  },
};
