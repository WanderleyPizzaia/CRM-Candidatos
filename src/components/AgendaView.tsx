import { useState } from "react";
import type { CalendarItem, CalendarKind, Candidate, TeamMember } from "../lib/types";
import type { NewCalendarItemInput } from "../lib/api";
import {
  calendarKindLabels,
  calendarKinds,
  colorFor,
  formatDateTime,
  initialsOf,
  roleLabels,
} from "../lib/format";
import { Field, Modal, SelectField, ViewHeader, useSaveHandler } from "./ui";

export function CalendarItemForm({
  candidates,
  teamMembers,
  onClose,
  onSave,
}: {
  candidates: Candidate[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onSave: (input: NewCalendarItemInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    candidate_id: String(candidates[0]?.id ?? ""),
    title: "",
    kind: "agenda" as CalendarKind,
    starts_at: "",
    due_at: "",
    assignee_id: "",
  });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.candidate_id) return "Selecione um candidato.";
      if (!form.title.trim()) return "Informe um título para o evento.";
      if (!form.starts_at) return "Informe data e hora do evento.";
      return null;
    },
    () =>
      onSave({
        candidate_id: Number(form.candidate_id),
        title: form.title.trim(),
        kind: form.kind,
        starts_at: new Date(form.starts_at).toISOString(),
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      }),
  );

  return (
    <Modal
      eyebrow="NOVO EVENTO"
      title="Adicionar à agenda"
      subtitle="Vincule o evento a um candidato e defina data e responsável."
      error={error}
      saving={saving}
      saveLabel="Adicionar evento"
      onSave={submit}
      onClose={onClose}
    >
      <SelectField label="Candidato" value={form.candidate_id} onChange={(v) => change("candidate_id", v)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Tipo" value={form.kind} onChange={(v) => change("kind", v)}>
        {calendarKinds.map((kind) => (
          <option key={kind} value={kind}>
            {calendarKindLabels[kind]}
          </option>
        ))}
      </SelectField>
      <Field
        label="Título"
        name="title"
        value={form.title}
        onChange={change}
        placeholder="Ex.: Gravação — Saúde"
      />
      <Field
        label="Data e hora"
        name="starts_at"
        type="datetime-local"
        value={form.starts_at}
        onChange={change}
      />
      <Field
        label="Prazo (opcional)"
        name="due_at"
        type="datetime-local"
        value={form.due_at}
        onChange={change}
      />
      <SelectField label="Responsável" value={form.assignee_id} onChange={(v) => change("assignee_id", v)}>
        <option value="">Sem responsável</option>
        {teamMembers
          .filter((m) => m.active)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {roleLabels[m.role] ?? m.role}
            </option>
          ))}
      </SelectField>
    </Modal>
  );
}

export function AgendaView({
  items,
  candidates,
  teamMembers,
  onToggle,
  onDelete,
  onCreate,
}: {
  items: CalendarItem[];
  candidates: Candidate[];
  teamMembers: TeamMember[];
  onToggle: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => void;
  onCreate: () => void;
}) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return (
    <div className="content">
      <ViewHeader title="Agenda da equipe" actionLabel="＋ Novo evento" onAction={onCreate} />
      <section className="panel list-panel">
        {sorted.length ? (
          sorted.map((item) => {
            const start = new Date(item.starts_at);
            const overdue = !item.completed && start < new Date();
            const candidateIndex = candidates.findIndex((c) => c.id === item.candidate_id);
            const candidate = candidates[candidateIndex];
            const assignee = teamMembers.find((m) => m.id === item.assignee_id);
            return (
              <div className="list-row" key={item.id}>
                <button className={`check ${item.completed ? "checked" : ""}`} onClick={() => onToggle(item)}>
                  {item.completed ? "✓" : ""}
                </button>
                <div className="event-date">
                  <strong>{start.getDate()}</strong>
                  <span>{start.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</span>
                </div>
                {candidate && (
                  <div className={`candidate-avatar small-avatar ${colorFor(candidateIndex)}`}>
                    {initialsOf(candidate.name)}
                  </div>
                )}
                <div className="grow">
                  <b className={item.completed ? "done" : ""}>{item.title}</b>
                  <span>
                    {calendarKindLabels[item.kind]} · {candidate?.name ?? "—"} · {formatDateTime(item.starts_at)}
                    {assignee ? ` · ${assignee.name} (${roleLabels[assignee.role] ?? assignee.role})` : ""}
                  </span>
                </div>
                {overdue && <em>ATRASADO</em>}
                <button className="row-delete" onClick={() => onDelete(item)} title="Excluir evento">
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty">Nenhum evento cadastrado ainda.</p>
        )}
      </section>
    </div>
  );
}
