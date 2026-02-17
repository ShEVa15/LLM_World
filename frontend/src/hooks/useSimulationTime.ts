import { useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export const useSimulationTime = () => {
  const tick = useSimulationStore((state) => state.tick);
  const isPaused = useSimulationStore((state) => state.isPaused);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      tick();
    }, 1000); // 1 реальная секунда = 1 игровая минута

    return () => clearInterval(interval);
  }, [isPaused, tick]);
};
