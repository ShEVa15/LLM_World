import { useSimulationStore } from "../store/useSimulationStore";

export default function MapView() {
  const { agents, setSelectedAgent, toggleInspector, isInspectorOpen } =
    useSimulationStore();

  const handleAgentClick = (agentId: string) => {
    setSelectedAgent(agentId);
    if (!isInspectorOpen) toggleInspector();
  };

  return (
    <div className="flex-1 flex flex-col h-full fade-in relative overflow-hidden">
      {/* Сетка и контейнер со скроллом для маленьких экранов */}
      <div className="flex-1 blueprint-grid relative w-full h-full overflow-auto flex items-center justify-center p-8">
        {/* Оригинальный размер карты, чтобы ничего не съезжало */}
        <div className="relative w-[1000px] h-[650px] bg-slate-900/40 border-4 border-slate-700 shadow-2xl rounded-sm overflow-hidden flex-shrink-0">
          {/* Декоративные полосы */}
          <div className="absolute top-0 right-[25%] w-2 h-[40%] bg-slate-700"></div>
          <div className="absolute bottom-0 right-[25%] w-2 h-[40%] bg-slate-700"></div>

          {/* Coffee Area */}
          <div className="absolute top-[10%] left-0 w-32 h-[60%] border-r-4 border-slate-700 bg-slate-800/30 flex flex-col items-center justify-center">
            <span className="absolute right-1 top-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Coffee Area
            </span>
            <div className="w-16 h-[80%] bg-slate-800 border border-slate-600 rounded-sm flex flex-col items-center justify-around py-4 shadow-lg">
              <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-md flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 rounded-full border-2 border-amber-900 bg-amber-950"></div>
              </div>
            </div>
          </div>

          {/* Lounge */}
          <div className="absolute top-8 left-[20%] w-[45%] h-24 bg-slate-800/20 border border-slate-700 rounded-lg flex items-center justify-center">
            <span className="absolute top-2 left-2 text-[10px] font-mono text-emerald-700 uppercase tracking-widest">
              Lounge
            </span>
            <div className="w-[60%] h-16 bg-emerald-900/20 border border-emerald-700/50 rounded-xl shadow-lg"></div>
          </div>

          {/* Dev Workspace */}
          <div className="absolute bottom-8 left-[25%] w-[40%] h-32 bg-slate-800/20 border border-slate-700 rounded-lg flex items-center justify-around px-4">
            <span className="absolute bottom-2 left-2 text-[10px] font-mono text-brand-700 uppercase tracking-widest">
              Dev Workspace
            </span>
            <div className="w-24 h-16 bg-slate-800 border border-slate-600 rounded-sm shadow-lg flex justify-center items-start pt-1">
              <div className="w-8 h-2 bg-brand-500/50 border border-brand-500 rounded-sm shadow-[0_0_5px_rgba(14,165,233,0.5)]"></div>
            </div>
            <div className="w-24 h-16 bg-slate-800 border border-slate-600 rounded-sm shadow-lg flex justify-center items-start pt-1">
              <div className="w-10 h-2 bg-emerald-500/50 border border-emerald-500 rounded-sm shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>

          {/* Центральный узел */}
          <div className="absolute top-[40%] left-[30%] w-[30%] h-24 bg-slate-800 border border-slate-600 rounded-full shadow-2xl flex items-center justify-center">
            <div className="w-[90%] h-[80%] rounded-full border border-slate-500/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 animate-pulse"></div>
            </div>
          </div>

          {/* Hardware Lab */}
          <div className="absolute top-[15%] right-8 w-[15%] h-[70%] bg-slate-800/20 border border-slate-700 rounded-lg flex flex-col items-center justify-center gap-8">
            <span className="absolute top-2 right-2 text-[10px] font-mono text-rose-700 uppercase tracking-widest text-right">
              Hardware
              <br />
              Lab
            </span>
            <div className="w-20 h-32 bg-slate-800 border border-slate-600 rounded-sm shadow-lg flex items-center justify-center">
              <div className="w-12 h-8 bg-slate-900 border border-slate-500 rounded-sm flex items-center justify-center">
                <span className="text-[8px] text-rose-500 font-mono">
                  DANGER
                </span>
              </div>
            </div>
            <div className="w-20 h-16 bg-[#060b14] border border-slate-700 rounded-sm flex flex-col justify-evenly px-2 shadow-inner">
              <div className="w-full h-1 bg-brand-500/80 shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>
              <div className="w-full h-1 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"></div>
            </div>
          </div>

          {/* --- ДИНАМИЧЕСКИЕ АГЕНТЫ --- */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {Object.values(agents).map((agent) => (
              <div
                key={agent.id}
                onClick={() => handleAgentClick(agent.id)}
                className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 bg-slate-800 flex items-center justify-center pointer-events-auto cursor-pointer group transition-all duration-700 hover:scale-110"
                style={{
                  left: `${agent.position.x}px`,
                  top: `${agent.position.y}px`,
                  borderColor: agent.color,
                  boxShadow: `0 0 15px ${agent.color}80`,
                }}
              >
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-full h-full rounded-full bg-slate-700"
                />

                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded font-mono border border-slate-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {agent.name}: {agent.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
