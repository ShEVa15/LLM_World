import { useSimulationStore } from "../store/useSimulationStore";

export default function InspectorPanel() {
  const { isInspectorOpen, selectedAgentId, agents, tasks } =
    useSimulationStore();

  const agent = selectedAgentId
    ? Object.values(agents).find((a) => a.id === selectedAgentId) || null
    : null;

  const getStressState = (stress: number) => {
    if (stress < 50)
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500",
        isCritical: false,
      };
    if (stress < 85)
      return {
        text: "text-yellow-400",
        bg: "bg-yellow-500",
        isCritical: false,
      };
    return { text: "text-rose-500", bg: "bg-rose-500", isCritical: true };
  };

  const stressState = agent ? getStressState(agent.stress) : null;

  // === ЖЕЛЕЗОБЕТОННЫЙ ПАРСИНГ СТАТУСА ===
  let currentProcess = "Свободен_";
  if (agent) {
    if (agent.status === "WORKING") {
      // Ищем задачу. Если находим — берем title, если нет — безопасная заглушка
      const activeTask = agent.currentTaskId
        ? tasks[agent.currentTaskId]
        : null;
      currentProcess = activeTask
        ? `[Task] ${activeTask.title}_`
        : `[Task] В процессе..._`;
    } else if (agent.status === "RESTING") {
      currentProcess = "Отдыхает / Пьет кофе_";
    } else if (agent.status === "ERROR") {
      currentProcess = "ВЫГОРАНИЕ (Блокировка)_";
    }
  }

  return (
    <aside
      className={`fixed top-0 left-16 h-full w-[360px] glass-panel z-40 transform transition-transform duration-300 flex flex-col border-r border-slate-700/50 shadow-[20px_0_40px_rgba(0,0,0,0.4)] ${
        isInspectorOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-6 border-b border-slate-700/50 bg-slate-900/40">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 font-mono">
          Сетевой граф
        </h2>
        <div className="h-32 rounded-xl bg-slate-800/50 border border-slate-700 border-dashed flex items-center justify-center relative overflow-hidden group">
          <div className="text-center group-hover:scale-105 transition-transform">
            <p className="text-xs text-brand-400/80 font-mono">
              [ D3.js Network ]
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700/50 flex justify-between items-center">
          <span className="text-xs uppercase font-bold text-slate-300">
            Профиль Агента
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded border font-bold transition-colors"
            style={{
              backgroundColor: agent ? `${agent.color}20` : "#0f172a",
              borderColor: agent ? agent.color : "#334155",
              color: agent ? agent.color : "#64748b",
            }}
          >
            {agent ? `TARGET: ${agent.id}` : "NO_TARGET"}
          </span>
        </div>

        <div
          className={`flex-1 p-6 overflow-y-auto flex flex-col ${!agent ? "justify-center items-center text-center" : ""}`}
        >
          {!agent ? (
            <span className="text-slate-500 text-sm">
              Выберите агента для загрузки данных.
            </span>
          ) : (
            <div className="w-full text-left space-y-6 fade-in">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl border-2 p-1 bg-slate-800 shadow-lg relative"
                  style={{ borderColor: agent.color }}
                >
                  <img
                    src={agent.avatar}
                    className="w-full h-full rounded-xl bg-slate-700"
                    alt="Avatar"
                  />
                  {stressState?.isCritical && (
                    <div className="absolute -top-3 -right-3 text-xl animate-bounce drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                      🔥
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white leading-tight">
                    {agent.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {agent.role}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                    Уровень выгорания
                  </p>
                  <span
                    className={`text-sm font-mono font-bold ${stressState?.text}`}
                  >
                    {agent.stress}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                  <div
                    className={`h-full ${stressState?.bg} transition-all duration-700 ease-out`}
                    style={{ width: `${agent.stress}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">
                  Текущий процесс
                </p>
                <p
                  className="text-sm font-mono flex items-center gap-2"
                  style={{ color: agent.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: agent.color }}
                  ></span>
                  &gt; {currentProcess}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
