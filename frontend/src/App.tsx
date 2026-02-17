import { useEffect } from "react";
import { SocketManager } from "./api/socketManager";
import { useSimulationStore } from "./store/useSimulationStore";
import { useSimulationTime } from "./hooks/useSimulationTime";
import MapView from "./components/MapView";
import InspectorPanel from "./components/InspectorPanel";
import TasksView from "./components/TasksView";
import EventModal from "./components/EventModal";
import ChatView from "./components/ChatView";

export default function App() {
  // Запускаем время
  useSimulationTime();

  // === НОВЫЙ БЛОК: Подключение к WebSocket при старте ===
  useEffect(() => {
    // Стучимся к бэкендерам по дефолтному порту 8000
    const socket = SocketManager.connect("ws://localhost:8000/ws");

    // Корректно закрываем соединение, если компонент размонтируется
    return () => {
      socket.close();
    };
  }, []);
  // =======================================================

  const {
    activeTab,
    setActiveTab,
    isInspectorOpen,
    toggleInspector,
    simMinutes,
  } = useSimulationStore();

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#0b1120] text-slate-300 h-screen w-screen overflow-hidden flex font-sans selection:bg-brand-500 selection:text-white">
      {/* ЛЕВАЯ НАВИГАЦИЯ */}
      <nav className="w-16 flex-shrink-0 h-full border-r border-slate-700/50 bg-slate-900 z-50 flex flex-col items-center py-6 gap-6 shadow-[5px_0_15px_rgba(0,0,0,0.3)]">
        <div className="w-10 h-10 rounded bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold font-mono">
          IT
        </div>

        <button
          onClick={() => setActiveTab("chat")}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${activeTab === "chat" ? "bg-slate-800 text-brand-400 border border-slate-700/50" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}
        >
          💬
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${activeTab === "tasks" ? "bg-slate-800 text-brand-400 border border-slate-700/50" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}
        >
          📋
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${activeTab === "map" ? "bg-slate-800 text-brand-400 border border-slate-700/50" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}
        >
          🗺️
        </button>

        <div className="h-px w-8 bg-slate-700/50 my-2"></div>

        <button
          onClick={toggleInspector}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isInspectorOpen ? "bg-slate-800 text-brand-400" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}
        >
          👁️
        </button>
      </nav>

      {/* ИНСПЕКТОР */}
      <InspectorPanel />
      <EventModal />
      {/* ГЛАВНЫЙ ЭКРАН */}
      <main className="flex-1 flex flex-col relative z-10 bg-[#0f172a]">
        <header className="h-16 flex-shrink-0 border-b border-slate-700/50 bg-slate-900/80 flex items-center justify-between px-6 z-20">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-3">
            Лаборатория симуляции{" "}
            <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">
              Live
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono">
            Day 1 | Time:{" "}
            <span className="text-brand-400 font-bold text-sm ml-1">
              {formatTime(simMinutes)}
            </span>
          </p>
        </header>

        {/* Роутинг */}
        {activeTab === "chat" && <ChatView />}
        {activeTab === "tasks" && <TasksView />}
        {activeTab === "map" && <MapView />}
      </main>
    </div>
  );
}
