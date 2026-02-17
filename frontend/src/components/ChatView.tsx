import { useSimulationStore } from "../store/useSimulationStore";

export default function ChatView() {
  const { chats } = useSimulationStore();

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] fade-in">
      <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-4">
        Корпоративный Slack (Архив)
      </h2>
      
      <div className="space-y-4 max-w-3xl">
        {chats.length === 0 ? (
          <div className="text-slate-500 text-center py-10">Сообщений пока нет...</div>
        ) : (
          chats.map((msg, idx) => (
            <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-lg">
                💬
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-brand-400 text-sm">
                    {msg.agents.join(" & ")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {msg.time}
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}