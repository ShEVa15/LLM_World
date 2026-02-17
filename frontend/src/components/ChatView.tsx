import { useState, useRef, useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export default function ChatView() {
  const { messages, addMessage, agents } = useSimulationStore();
  const [inputText, setInputText] = useState("");

  // Реф для автоскролла вниз
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Скроллим вниз при каждом новом сообщении
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Отправляем сообщение от имени 'user'
    addMessage(inputText.trim(), "user");
    setInputText("");

    // ТУТ БУДЕТ ВЫЗОВ API К БЭКЕНДУ В БУДУЩЕМ
    // Например: sendToLLM(inputText.trim());
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full fade-in relative bg-[#0b1120]">
      {/* Шапка чата */}
      <div className="h-14 border-b border-slate-700/50 flex items-center px-6 bg-slate-900/50 flex-shrink-0 z-10">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          Global Agent Terminal
        </h2>
      </div>

      {/* Окно сообщений */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
        {messages.map((msg) => {
          const isUser = msg.senderId === "user";
          const isSystem = msg.senderId === "system";
          const agent = agents[msg.senderId]; // Если это агент, найдем его в сторе

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center fade-in">
                <span className="bg-slate-800/50 border border-slate-700 text-slate-400 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-mono">
                  [{formatTime(msg.timestamp)}] {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex w-full fade-in ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Аватар (для юзера - иконка, для агента - его аватар) */}
                <div className="flex-shrink-0 mt-1">
                  {isUser ? (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs">
                      👤
                    </div>
                  ) : agent ? (
                    <div
                      className="w-8 h-8 rounded-full border bg-slate-800 flex items-center justify-center overflow-hidden"
                      style={{ borderColor: agent.color }}
                    >
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-rose-500 flex items-center justify-center text-xs">
                      ?
                    </div>
                  )}
                </div>

                {/* Баббл сообщения */}
                <div
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isUser ? "Вы (Лид)" : agent ? agent.name : "Unknown"}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-brand-600 text-white rounded-tr-sm border border-brand-500/50"
                        : "bg-slate-800/80 text-slate-300 rounded-tl-sm border border-slate-700"
                    }`}
                    style={
                      agent && !isUser
                        ? {
                            borderLeftColor: agent.color,
                            borderLeftWidth: "2px",
                          }
                        : {}
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {/* Пустой div для якоря автоскролла */}
        <div ref={messagesEndRef} />
      </div>

      {/* Инпут для ввода */}
      <div className="p-4 bg-slate-900 border-t border-slate-700/50 flex-shrink-0 z-10">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center max-w-5xl mx-auto w-full"
        >
          <span className="absolute left-4 text-slate-500 font-mono text-sm">
            &gt;
          </span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите команду агентам (например: @Max оцени время на базу данных)..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-8 pr-16 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
