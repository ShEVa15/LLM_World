import { useSimulationStore } from "../store/useSimulationStore";

export default function EventModal() {
  const { activeEvent, resolveEvent } = useSimulationStore();

  if (!activeEvent) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1120]/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-center relative overflow-hidden transform transition-all scale-100">
        <div
          className={`absolute inset-0 opacity-10 pointer-events-none ${activeEvent.glowColor}`}
        ></div>

        <div className="text-6xl mb-2 animate-bounce">{activeEvent.icon}</div>
        <h2
          className={`text-2xl font-bold uppercase tracking-widest ${activeEvent.titleColor}`}
        >
          {activeEvent.title}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mt-2">
          {activeEvent.desc}
        </p>

        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mt-4">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest block mb-2">
            Последствия:
          </span>
          <div className="text-xs font-mono font-bold text-slate-300">
            {activeEvent.effectText}
          </div>
        </div>

        <button
          onClick={resolveEvent}
          className="mt-2 bg-slate-200 hover:bg-white text-slate-900 px-6 py-3 rounded-xl font-bold transition-colors w-full border border-slate-400 shadow-lg"
        >
          Принять меры
        </button>
      </div>
    </div>
  );
}
