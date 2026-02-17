import { useSimulationStore } from "../store/useSimulationStore";

export default function InspectorPanel() {
  const { isInspectorOpen, selectedAgentId, agents } = useSimulationStore();

  const agent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId) || null
    : null;

  // Используем реальный стресс с бэкенда
  const stressLevel = agent ? agent.stress : 0;

  return (
    <aside
      className={`fixed top-0 right-0 h-full w-[360px] glass-panel z-40 transform transition-transform duration-300 flex flex-col border-l border-slate-700/50 shadow-2xl bg-[#0f172a]/95 ${
        isInspectorOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex-1 flex flex-col p-6">
        {!agent ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Выберите агента на карте
          </div>
        ) : (
          <div className="space-y-8">
            {/* Хедер */}
            <div className="flex items-center gap-4">
              <img src={agent.avatar} className="w-20 h-20 rounded-2xl border-2 border-slate-600 shadow-xl" />
              <div>
                <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
                <p className="text-blue-400 font-mono text-sm">{agent.role}</p>
              </div>
            </div>

            {/* Активность */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Что делает прямо сейчас</p>
              <p className="text-lg text-white font-medium italic">
                "{agent.current_activity}"
              </p>
            </div>

            {/* Стресс Бар */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase font-bold">Уровень стресса (Backend)</span>
                <span className={`text-xs font-bold ${stressLevel > 80 ? 'text-red-500 animate-pulse' : stressLevel > 50 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {stressLevel}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-500 ${
                    stressLevel > 80 ? 'bg-red-600' : 
                    stressLevel > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${stressLevel}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                {stressLevel > 80 ? "⚠️ КРИТИЧЕСКИЙ УРОВЕНЬ! Возможен инцидент." : "Состояние в норме."}
              </p>
            </div>

            {/* Инфо */}
            <div className="pt-8 border-t border-slate-800 text-xs text-slate-600 font-mono">
              ID: {agent.id} • Mood: {agent.current_mood_score.toFixed(2)} <br/>
              Status: {agent.status}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}