import { useMemo, useRef } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import ForceGraph2D from "react-force-graph-2d";

// Обновленные интерфейсы с фиксированными координатами
interface GraphNode {
  id: string;
  name: string;
  color: string;
  val: number;
  group: "agent" | "task"; // Чтобы различать стили
  fx?: number; // Фиксированная позиция X
  fy?: number; // Фиксированная позиция Y
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
}

export default function InspectorPanel() {
  const { isInspectorOpen, selectedAgentId, agents, tasks } =
    useSimulationStore();

  // ИСПРАВЛЕНИЕ 1: Инициализация null и подавление any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const agent = selectedAgentId
    ? Object.values(agents).find((a) => a.id === selectedAgentId) || null
    : null;

  // --- ЛОГИКА СТРЕССА ---
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

  // --- ЛОГИКА ПРОЦЕССА ---
  let currentProcess = "Свободен_";
  if (agent) {
    if (agent.status === "WORKING") {
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

  // --- НОВАЯ СТАТИЧНАЯ ЛОГИКА ГРАФА ---
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    const agentIds = Object.keys(agents);
    const agentCount = agentIds.length;

    const INNER_RADIUS = 25; // Агенты
    const OUTER_RADIUS = 55; // Задачи

    // 1. Расставляем АГЕНТОВ (Внутренний круг)
    agentIds.forEach((agentId, i) => {
      const a = agents[agentId];
      const angle = (i / agentCount) * 2 * Math.PI;

      nodes.push({
        id: a.id,
        name: a.name,
        color: a.color,
        val: 15,
        group: "agent",
        fx: Math.cos(angle) * INNER_RADIUS,
        fy: Math.sin(angle) * INNER_RADIUS,
      });
    });

    // 2. Расставляем ЗАДАЧИ (Внешний круг)
    const activeTasks = Object.values(tasks).filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "PAUSED",
    );

    agentIds.forEach((agentId, i) => {
      const agentTasks = activeTasks.filter(
        (t) => t.assignedAgentId === agentId,
      );
      const agentAngle = (i / agentCount) * 2 * Math.PI;

      agentTasks.forEach((t, j) => {
        const offset = (j - (agentTasks.length - 1) / 2) * 0.3;
        const taskAngle = agentAngle + offset;

        nodes.push({
          id: t.id,
          name: t.title.slice(0, 8) + "..",
          color: t.isIncident ? "#f43f5e" : "#64748b",
          val: 8,
          group: "task",
          fx: Math.cos(taskAngle) * OUTER_RADIUS,
          fy: Math.sin(taskAngle) * OUTER_RADIUS,
        });

        links.push({
          source: agentId,
          target: t.id,
          color: agents[agentId].color,
        });
      });
    });

    const unassigned = activeTasks.filter((t) => !t.assignedAgentId);
    unassigned.forEach((t, i) => {
      nodes.push({
        id: t.id,
        name: "Wait...",
        color: "#64748b",
        val: 5,
        group: "task",
        fx: (i - unassigned.length / 2) * 10,
        fy: OUTER_RADIUS + 10,
      });
    });

    for (let i = 0; i < agentCount; i++) {
      links.push({
        source: agentIds[i],
        target: agentIds[(i + 1) % agentCount],
        color: "rgba(255, 255, 255, 0.1)",
      });
    }

    return { nodes, links };
  }, [agents, tasks]);

  return (
    <aside
      className={`fixed top-0 left-16 h-full w-[360px] glass-panel z-40 transform transition-transform duration-300 flex flex-col border-r border-slate-700/50 shadow-[20px_0_40px_rgba(0,0,0,0.4)] ${
        isInspectorOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* === БЛОК ГРАФА === */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-900/40">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 font-mono">
          Topology Radar (Live)
        </h2>
        <div className="h-36 rounded-xl bg-[#0f172a] border border-slate-700 overflow-hidden flex items-center justify-center relative cursor-crosshair">
          <ForceGraph2D
            ref={fgRef}
            width={310}
            height={144}
            graphData={graphData}
            cooldownTicks={0}
            backgroundColor="#0f172a"
            // ИСПРАВЛЕНИЕ 2: Подавление any для линков
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            linkColor={(link: any) => link.color}
            linkWidth={1.5}
            // ИСПРАВЛЕНИЕ 3: Подавление any для узлов и кастомная отрисовка
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const group = node.group;
              const fontSize = (group === "agent" ? 10 : 8) / globalScale;

              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val / 3, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();

              if (group === "agent") {
                ctx.lineWidth = 1.5 / globalScale;
                ctx.strokeStyle = "#fff";
                ctx.stroke();
              }

              ctx.font = `${fontSize}px monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle =
                group === "agent"
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.5)";
              ctx.fillText(label, node.x, node.y + node.val / 3 + 2);
            }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
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
          className={`flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col ${!agent ? "justify-center items-center text-center" : ""}`}
        >
          {!agent ? (
            <span className="text-slate-500 text-sm">
              Выберите агента на карте для загрузки данных.
            </span>
          ) : (
            <div className="w-full text-left space-y-5 fade-in pb-8">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl border-2 p-1 bg-slate-800 shadow-lg relative flex-shrink-0"
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

              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 space-y-4">
                <h3 className="text-[10px] uppercase text-slate-500 font-bold tracking-wider border-b border-slate-700/50 pb-2">
                  Секретное Досье
                </h3>

                <div>
                  <p className="text-[9px] text-slate-500 font-mono uppercase">
                    Специализация
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {agent.specialization}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-slate-500 font-mono uppercase">
                    Характер
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {agent.temperament}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-slate-500 font-mono uppercase">
                    Коронная фраза
                  </p>
                  <p
                    className="text-xs font-mono mt-1"
                    style={{ color: agent.color }}
                  >
                    "{agent.catchphrase}"
                  </p>
                </div>

                <div className="bg-rose-950/30 p-2 rounded-lg border border-rose-900/30">
                  <p className="text-[9px] text-rose-500/70 font-mono uppercase flex items-center gap-1">
                    <span>⚠️</span> Критический триггер
                  </p>
                  <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                    {agent.trigger}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
