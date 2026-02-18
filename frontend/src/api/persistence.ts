const API_URL = "http://localhost:8000";

export const persistenceApi = {
  // Сохранить состояние
  save: async (gameState: Record<string, unknown>) => {
    try {
      await fetch(`${API_URL}/save_world`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state_json: JSON.stringify(gameState) }),
      });
      console.log("💾 Game auto-saved");
    } catch (error) {
      console.error("❌ Save failed:", error);
    }
  },

  // Загрузить состояние
  load: async () => {
    try {
      const response = await fetch(`${API_URL}/load_world`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("⚠️ Load failed (starting fresh):", error);
      return null;
    }
  },
};
