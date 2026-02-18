import { useCallback } from "react";
import { SocketManager } from "../api/socketManager";

export const useSocket = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const send = useCallback((data: any) => {
    // Вызываем наш новый универсальный метод
    if (SocketManager) {
      SocketManager.send(data);
    }
  }, []);

  return { send };
};
