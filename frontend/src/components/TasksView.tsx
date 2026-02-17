import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import type { Task } from "../types";

export default function TasksView() {
  const { tasks, agents, assignTask, applyGlobalEvent, simMinutes } =
    useSimulationStore();
  const [taskSelections, setTaskSelections] = useState<Record<string, string>>(
    {},
  );
  const [eventSelections, setEventSelections] = useState({
    coffee: "",
    lounge: "",
    work: "",
  });

  const handleAssign = (taskId: string) => {
    const agentKey = taskSelections[taskId];
    if (!agentKey) return alert("Выберите агента!");
    assignTask(taskId, agentKey);
  };

  const handleEvent = (type: "coffee" | "lounge" | "work") => {
    const agentKey = eventSelections[type];
    if (!agentKey) return alert("Выберите агента!");
    applyGlobalEvent(type, agentKey);
    setEventSelections({ ...eventSelections, [type]: "" });
  };

  const getDiffColor = (diff: string) => {
    if (diff === "HARD")
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (diff === "MEDIUM")
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  const getAgentStatusText = (status: string) => {
    if (status === "WORKING") return "В работе";
    if (status === "RESTING") return "Отдыхает";
    if (status === "ERROR") return "Выгорел";
    return "Свободен";
  };

  const getRemainingTime = (task: Task) => {
    if (task.status === "DONE") return 0;
    if (task.status === "TODO") return task.durationMins;
    if (task.status === "PAUSED")
      return Math.max(0, task.durationMins - task.progressMins);

    if (task.status === "IN_PROGRESS" && task.assignedAgentId) {
      const agent = agents[task.assignedAgentId];
      if (agent && agent.busyUntil > 0) {
        return Math.max(0, agent.busyUntil - simMinutes);
      }
    }
    return task.durationMins;
  };

  const calculateProgress = (task: Task) => {
    const remaining = getRemainingTime(task);
    const progress = task.durationMins - remaining;
    return Math.min(100, Math.max(0, (progress / task.durationMins) * 100));
  };

  const formatTime = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
    }
    return `${mins} мин`;
  };

  const activeTasks = Object.values(tasks).filter(
    (t) => !t.isIncident && t.status !== "DONE",
  );
  const activeIncidents = Object.values(tasks).filter(
    (t) => t.isIncident && t.status !== "DONE",
  );
  const archivedTasks = Object.values(tasks)
    .filter((t) => t.status === "DONE")
    .reverse();

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
      {/* === ИНЦИДЕНТЫ === */}
      {activeIncidents.length > 0 && (
        <section className="max-w-7xl mx-auto w-full">
          <h2 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-4 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Активные инциденты
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-rose-900/10 border border-rose-700/30 rounded-xl p-5 flex flex-col gap-4 shadow-[0_0_15px_rgba(244,63,94,0.05)] fade-in"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-white font-bold leading-tight flex items-center gap-2">
                    {inc.icon} {inc.title}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Инцидент
                  </span>
                </div>
                <p className="text-sm text-slate-400 flex-1">
                  {inc.description}
                </p>

                <div className="flex flex-col gap-1 w-full mt-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-rose-400">
                    <span>Прогресс устранения</span>
                    <span>Осталось: {formatTime(getRemainingTime(inc))}</span>
                  </div>
                  <div className="w-full h-1.5 bg-rose-950/50 rounded-full overflow-hidden border border-rose-900/50">
                    <div
                      className="h-full bg-rose-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${calculateProgress(inc)}%` }}
                    ></div>
                  </div>
                </div>

                {/* ИСПРАВЛЕНИЕ: Добавлена логика дропдауна для инцидентов */}
                <div className="mt-2 border-t border-rose-700/30 pt-4 flex gap-2 h-10">
                  {inc.status === "TODO" || inc.status === "PAUSED" ? (
                    <>
                      <select
                        value={taskSelections[inc.id] || ""}
                        onChange={(e) =>
                          setTaskSelections({
                            ...taskSelections,
                            [inc.id]: e.target.value,
                          })
                        }
                        className="flex-1 bg-rose-950/50 border border-rose-800 text-xs text-rose-200 rounded-lg pl-3 pr-8 outline-none cursor-pointer focus:border-rose-500"
                      >
                        <option value="" disabled>
                          Назначить...
                        </option>
                        {Object.entries(agents).map(([key, a]) => (
                          <option
                            key={key}
                            value={key}
                            disabled={a.status !== "IDLE"}
                          >
                            {a.name}{" "}
                            {a.status !== "IDLE"
                              ? `(${getAgentStatusText(a.status)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(inc.id)}
                        className="bg-rose-700 hover:bg-rose-600 text-white px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                      >
                        {inc.status === "PAUSED" ? "Продолжить" : "+"}
                      </button>
                    </>
                  ) : (
                    <button className="w-full bg-rose-600 cursor-wait text-white px-4 py-2 rounded-lg text-xs font-bold animate-pulse">
                      В ПРОЦЕССЕ:{" "}
                      {agents[inc.assignedAgentId!]?.name?.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === ГЛОБАЛЬНЫЕ ИВЕНТЫ === */}
      <section className="max-w-7xl mx-auto w-full">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 font-mono">
          Глобальные ивенты (Контроль стресса)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                ☕ Кофе-брейк
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                Стресс -15%
              </span>
            </div>
            <div className="flex gap-2 mt-auto pt-2 border-t border-slate-700/50">
              <select
                value={eventSelections.coffee}
                onChange={(e) =>
                  setEventSelections({
                    ...eventSelections,
                    coffee: e.target.value,
                  })
                }
                className="flex-1 bg-slate-900/80 border border-slate-700 text-xs text-slate-300 rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer focus:border-brand-500"
              >
                <option value="" disabled>
                  Агент...
                </option>
                {Object.entries(agents).map(([key, a]) => (
                  <option key={key} value={key}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleEvent("coffee")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-medium"
              >
                Go
              </button>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                🛋️ Отправить отдыхать
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                Стресс -40%
              </span>
            </div>
            <div className="flex gap-2 mt-auto pt-2 border-t border-slate-700/50">
              <select
                value={eventSelections.lounge}
                onChange={(e) =>
                  setEventSelections({
                    ...eventSelections,
                    lounge: e.target.value,
                  })
                }
                className="flex-1 bg-slate-900/80 border border-slate-700 text-xs text-slate-300 rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer focus:border-brand-500"
              >
                <option value="" disabled>
                  Агент...
                </option>
                {Object.entries(agents).map(([key, a]) => (
                  <option key={key} value={key}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleEvent("lounge")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-medium"
              >
                Go
              </button>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 border-l-2 border-l-brand-500">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                💻 Вернуть за работу
              </span>
              <span className="text-[10px] bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">
                Возобновить Task
              </span>
            </div>
            <div className="flex gap-2 mt-auto pt-2 border-t border-slate-700/50">
              <select
                value={eventSelections.work}
                onChange={(e) =>
                  setEventSelections({
                    ...eventSelections,
                    work: e.target.value,
                  })
                }
                className="flex-1 bg-slate-900/80 border border-slate-700 text-xs text-slate-300 rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer focus:border-brand-500"
              >
                <option value="" disabled>
                  Агент...
                </option>
                {Object.entries(agents).map(([key, a]) => (
                  <option key={key} value={key}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleEvent("work")}
                className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-xs font-medium"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === БЭКЛОГ ЗАДАЧ === */}
      <section className="max-w-7xl mx-auto w-full">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 font-mono">
          Бэклог задач
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeTasks.map((task) => {
            const progressPercent = Math.round(
              (task.progressMins / task.durationMins) * 100,
            );

            return (
              <div
                key={task.id}
                className={`bg-slate-800/60 border ${task.status === "PAUSED" ? "border-amber-500/50" : "border-slate-700/60"} rounded-xl p-5 flex flex-col gap-4 shadow-sm transition-all duration-300 hover:border-slate-500/50`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-white font-bold leading-tight">
                    {task.title}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${getDiffColor(task.difficulty)}`}
                  >
                    {task.difficulty === "HARD"
                      ? "Сложно"
                      : task.difficulty === "MEDIUM"
                        ? "Средне"
                        : "Легко"}
                  </span>
                </div>

                <p className="text-sm text-slate-400 flex-1">
                  {task.description}
                </p>

                <div className="flex flex-col gap-2 w-full mt-auto">
                  {task.progressMins > 0 && (
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-slate-900 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="ml-auto text-xs font-mono text-slate-500">
                      {task.progressMins > 0
                        ? `Осталось ${Math.round((task.durationMins - task.progressMins) / 60)}h`
                        : `⏱ ${Math.round(task.durationMins / 60)}h`}{" "}
                      (+{task.stressPenalty}%)
                    </span>
                  </div>
                </div>

                <div className="mt-2 border-t border-slate-700/50 pt-4 flex gap-2 h-10">
                  {task.status === "TODO" || task.status === "PAUSED" ? (
                    <>
                      <select
                        value={taskSelections[task.id] || ""}
                        onChange={(e) =>
                          setTaskSelections({
                            ...taskSelections,
                            [task.id]: e.target.value,
                          })
                        }
                        className="flex-1 bg-slate-900/80 border border-slate-700 text-xs text-slate-300 rounded-lg pl-3 pr-8 outline-none cursor-pointer focus:border-brand-500"
                      >
                        <option value="" disabled>
                          Назначить...
                        </option>
                        {Object.entries(agents).map(([key, a]) => (
                          <option
                            key={key}
                            value={key}
                            disabled={a.status !== "IDLE"}
                          >
                            {a.name}{" "}
                            {a.status !== "IDLE"
                              ? `(${getAgentStatusText(a.status)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(task.id)}
                        className={`${task.status === "PAUSED" ? "bg-amber-600 hover:bg-amber-500" : "bg-slate-700 hover:bg-slate-600"} text-white px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap`}
                      >
                        {task.status === "PAUSED" ? "Продолжить" : "+"}
                      </button>
                    </>
                  ) : (
                    <button className="w-full bg-brand-600 cursor-wait text-white px-4 py-2 rounded-lg text-xs font-bold animate-pulse">
                      В РАБОТЕ:{" "}
                      {agents[task.assignedAgentId!]?.name.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* === АРХИВ === */}
      {archivedTasks.length > 0 && (
        <section className="max-w-7xl mx-auto w-full mt-8 border-t border-slate-700/50 pt-8 pb-12">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 font-mono">
            История спринта (Архив)
          </h2>
          <div className="flex flex-col gap-2">
            {archivedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl fade-in hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700 text-sm">
                    {task.isIncident ? task.icon || "⚠️" : "✅"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-300 leading-none">
                      {task.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {task.assignedAgentId
                        ? `Выполнил: ${agents[task.assignedAgentId]?.name}`
                        : "Глобальный эффект"}
                    </span>
                  </div>
                </div>
                <span
                  className={`${task.isIncident ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"} px-2 py-0.5 rounded border text-[10px] font-bold`}
                >
                  {task.isIncident ? "Инцидент закрыт" : "Выполнено"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
