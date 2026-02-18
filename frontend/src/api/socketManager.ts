import { useSimulationStore } from "../store/useSimulationStore";
import type { Agent, Task } from "../types";

// ... твои интерфейсы (оставь как есть) ...
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

let activeSocket: WebSocket | null = null;

export const SocketManager = {
  // Обработка входящих сообщений (оставь как было)
  dispatch: (event: SocketEvent) => {
    const store = useSimulationStore.getState();
    switch (event.type) {
      case "CHAT_MESSAGE":
        store.addMessage(event.payload.text, event.payload.senderId);
        break;
      case "AGENT_UPDATE":
        if (store.updateAgentState) {
          store.updateAgentState(event.payload.agentKey, event.payload.updates);
        }
        break;
      case "TASK_UPDATE":
        if (store.updateTaskState) {
          store.updateTaskState(event.payload.taskId, event.payload.updates);
        }
        break;
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (data: any) => {
    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify(data));
    } else {
      console.warn("[Socket] Не могу отправить: нет соединения");
    }
  },

  // Твой старый метод (можно оставить для совместимости, но send() его заменяет)
  sendLlmRequest: (agentId: string, prompt: string) => {
    SocketManager.send({
      type: "ASK_LLM",
      payload: { agentId, promptText: prompt },
    });
  },

  connect: (url: string) => {
    console.log(`[Socket] Connecting to ${url}...`);
    // Закрываем старый сокет, если был (чтобы не дублировать)
    if (activeSocket) {
      activeSocket.close();
    }

    activeSocket = new WebSocket(url);

    activeSocket.onopen = () => console.log("✅ WebSocket Connected");

    activeSocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SocketEvent;
        SocketManager.dispatch(data);
      } catch (err) {
        console.error("[Socket] Parse error", err);
      }
    };
    return activeSocket;
  },
};
