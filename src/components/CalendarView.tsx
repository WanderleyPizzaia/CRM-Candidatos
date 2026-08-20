import { useMemo, useState } from "react";
import type { CalendarItem, Candidate, Production, TeamMember } from "../lib/types";
import { calendarKindLabels, productionStatusLabels, roleLabels } from "../lib/format";
import { ViewHeader } from "./ui";

const weekDays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type DayEntry = {
  key: string;
  title: string;
  kind: string;
  time: string | null;
  candidateName: string;
  assigneeLabel: string | null;
  completed: boolean;
  source: "agenda" | "producao";
};

function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function CalendarView({
  calendarItems,
  productions,
  candidates,
  teamMembers,
  onCreate,
}: {
  calendarItems: CalendarItem[];
  productions: Production[];
  candidates: Candidate[];
  teamMembers: TeamMember[];
  onCreate: () => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showProductions, setShowProductions] = useState(true);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    const nameOf = (id: number) => candidates.find((c) => c.id === id)?.name ?? "—";
    const assigneeOf = (id: number | null) => {
      const member = teamMembers.find((m) => m.id === id);
      return member ? `${member.name} · ${roleLabels[member.role] ?? member.role}` : null;
    };
    const push = (date: Date, entry: DayEntry) => {
      const key = dayKey(date);
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    };

    for (const item of calendarItems) {
      const date = new Date(item.starts_at);
      push(date, {
        key: `c${item.id}`,
        title: item.title,
        kind: calendarKindLabels[item.kind],
        time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        candidateName: nameOf(item.candidate_id),
        assigneeLabel: assigneeOf(item.assignee_id),
        completed: item.completed,
        source: "agenda",
      });
    }

    if (showProductions) {
      for (const production of productions) {
        if (!production.due_at) continue;
        const date = new Date(production.due_at);
        push(date, {
          key: `p${production.id}`,
          title: production.title,
          kind: `Entrega · ${productionStatusLabels[production.status]}`,
          time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          candidateName: nameOf(production.candidate_id),
          assigneeLabel: assigneeOf(production.assignee_id),
          completed: production.status === "published" || production.status === "approved",
          source: "producao",
        });
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }
    return map;
  }, [calendarItems, productions, candidates, teamMembers, showProductions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="content">
      <ViewHeader title="Calendário" actionLabel="＋ Novo evento" onAction={onCreate}>
        <label className="toggle-filter">
          <input
            type="checkbox"
            checked={showProductions}
            onChange={(e) => setShowProductions(e.target.checked)}
          />
          Mostrar entregas de produção
        </label>
      </ViewHeader>

      <section className="panel calendar-panel">
        <header className="calendar-nav">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button>
          <b>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</b>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button>
          <button
            className="today-btn"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Hoje
          </button>
        </header>

        <div className="calendar-grid">
          {weekDays.map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}
          {cells.map((day, index) => {
            if (day === null) return <div className="calendar-cell empty-cell" key={`empty-${index}`} />;
            const key = dayKey(new Date(year, month, day));
            const entries = entriesByDay.get(key) ?? [];
            return (
              <div className={`calendar-cell${key === todayKey ? " today" : ""}`} key={key}>
                <span className="calendar-day">{day}</span>
                {entries.map((entry) => (
                  <div
                    className={`calendar-entry ${entry.source}${entry.completed ? " done" : ""}`}
                    key={entry.key}
                    title={`${entry.title} — ${entry.kind} · ${entry.candidateName}${
                      entry.assigneeLabel ? ` · ${entry.assigneeLabel}` : ""
                    }`}
                  >
                    <b>
                      {entry.time} {entry.title}
                    </b>
                    <span>
                      {entry.candidateName}
                      {entry.assigneeLabel ? ` · ${entry.assigneeLabel}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
