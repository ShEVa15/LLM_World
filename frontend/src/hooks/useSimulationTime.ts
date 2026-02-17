import { useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export const useSimulationTime = () => {
  const { fetchState, tick } = useSimulationStore();

  useEffect(() => {
    // 1. Часики на фронте (тикают каждую секунду виртуального времени)
    const timeInterval = setInterval(() => {
      tick();
    }, 1000); // 1 секунда реального времени = 1 минута симуляции

    // 2. Синхронизация с бэкендом (каждые 2 секунды)
    const syncInterval = setInterval(() => {
      fetchState();
    }, 2000);

    // Первичная загрузка
    fetchState();

    return () => {
      clearInterval(timeInterval);
      clearInterval(syncInterval);
    };
  }, [fetchState, tick]);
};