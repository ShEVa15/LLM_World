import { useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import { persistenceApi } from "../api/persistence";

export const useAutoSave = () => {
  useEffect(() => {
    // ФУНКЦИЯ ЗАГРУЗКИ
    const loadGame = async () => {
      console.log("🔄 Loading world state...");
      const savedState = await persistenceApi.load();

      if (savedState) {
        useSimulationStore.setState(savedState);
        console.log("✅ World loaded from DB!");
      } else {
        console.log("🆕 No save found, starting new game.");
      }
    };

    // ФУНКЦИЯ СОХРАНЕНИЯ
    const saveGame = () => {
      const currentStore = useSimulationStore.getState();

      const snapshot = {
        agents: currentStore.agents,
        tasks: currentStore.tasks,
        simMinutes: currentStore.simMinutes,
        activeIncidents: currentStore.activeIncidents,
      };

      persistenceApi.save(snapshot);
    };

    loadGame();

    const intervalId = setInterval(saveGame, 10000);

    return () => clearInterval(intervalId);
  }, []);
};
