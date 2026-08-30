import { useState } from "react";
import type { Candidate, Production, ProductionStatus, TeamMember } from "../lib/types";
import type { NewProductionInput } from "../lib/api";
import {
  colorFor,
  formatDateTime,
  initialsOf,
  isOverdue,
  productionStatusLabels,
  productionStatuses,
  roleLabels,
  toDateTimeInput,
} from "../lib/format";
import { Field, Modal, SelectField, TextAreaField, ViewHeader, useSaveHandler } from "./ui";

/**
 * Sugestões do campo de formato. O campo segue livre para digitar, então esta
 * lista é atalho, não restrição — nada quebra se a peça usar outro formato.
 */
const formatSuggestions = [
  "Reel",
  "Stories",
  "Post feed",
  "Carrossel",
  "Vídeo YouTube",
  "Vídeo",
  "Material",
  "Card",
  "Banner",
];

export function ProductionForm({
  candidates,
  teamMembers,
  editing,
  onClose,
  onSave,
}: {
  candidates: Candidate[];
  teamMembers: TeamMember[];
  editing: Production | null;
  onClose: () => void;
  onSave: (input: NewProductionInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    candidate_id: String(editing?.candidate_id ?? candidates[0]?.id ?? ""),
    title: editing?.title ?? "",
    format: editing?.format ?? "Reel",
    status: (editing?.status ?? "briefing") as ProductionStatus,
    due_at: toDateTimeInput(editing?.due_at ?? null),
    drive_file_url: editing?.drive_file_url ?? "",
    notes: editing?.notes ?? "",
    assignee_id: editing && editing.assignee_id !== null ? String(editing.assignee_id) : "",
  });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.candidate_id) return "Selecione um candidato.";
      if (!form.title.trim()) return "Informe o título da peça.";
      if (!form.format.trim()) return "Informe o formato da peça.";
      return null;
    },
    () =>
      onSave({
        candidate_id: Number(form.candidate_id),
        title: form.title.trim(),
        format: form.format.trim(),
        status: form.status,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        drive_file_url: form.drive_file_url.trim() || null,
        notes: form.notes.trim() || null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      }),
  );

  return (
    <Modal
      eyebrow={editing ? "EDIÇÃO" : "NOVA PEÇA"}
      title={editing ? "Editar peça" : "Nova peça de produção"}
      subtitle="Defina o responsável, o prazo e onde o arquivo fica no Drive."
      error={error}
      saving={saving}
      saveLabel={editing ? "Salvar alterações" : "Criar peça"}
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
      <SelectField label="Etapa" value={form.status} onChange={(v) => change("status", v)}>
        {productionStatuses.map((status) => (
          <option key={status} value={status}>
            {productionStatusLabels[status]}
          </option>
        ))}
      </SelectField>
      <Field
        label="Título da peça"
        name="title"
        value={form.title}
        onChange={change}
        placeholder="Ex.: Reel — Saúde na prática"
      />
      <label className="field">
        <span>Formato</span>
        <input
          list="production-formats"
          value={form.format}
          onChange={(e) => change("format", e.target.value)}
          placeholder="Reel, Carrossel, Post..."
        />
        <datalist id="production-formats">
          {formatSuggestions.map((format) => (
            <option key={format} value={format} />
          ))}
        </datalist>
      </label>
      <SelectField
        label="Responsável (quem executa)"
        value={form.assignee_id}
        onChange={(v) => change("assignee_id", v)}
      >
        <option value="">Sem responsável</option>
        {teamMembers
          .filter((m) => m.active || String(m.id) === form.assignee_id)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {roleLabels[m.role] ?? m.role}
            </option>
          ))}
      </SelectField>
      <Field label="Prazo" name="due_at" type="datetime-local" value={form.due_at} onChange={change} />
      <Field
        label="Link do arquivo no Drive"
        name="drive_file_url"
        value={form.drive_file_url}
        onChange={change}
        placeholder="https://drive.google.com/..."
        full
      />
      <TextAreaField
        label="Observações"
        value={form.notes}
        onChange={(v) => change("notes", v)}
        placeholder="Briefing, referências, pedidos de ajuste..."
      />
    </Modal>
  );
}

export function ProductionBoard({
  productions,
  candidates,
  teamMembers,
  onCreate,
  onEdit,
  onMove,
  onDelete,
  onNotify,
}: {
  productions: Production[];
  candidates: Candidate[];
  teamMembers: TeamMember[];
  onCreate: () => void;
  onEdit: (production: Production) => void;
  onMove: (production: Production, status: ProductionStatus) => void;
  onDelete: (production: Production) => void;
  onNotify: (production: Production) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const visible = productions.filter((p) => {
    if (assigneeFilter === "all") return true;
    if (assigneeFilter === "none") return p.assignee_id === null;
    return p.assignee_id === Number(assigneeFilter);
  });

  const handleDrop = (status: ProductionStatus) => {
    if (dragging === null) return;
    const production = productions.find((p) => p.id === dragging);
    setDragging(null);
    if (production && production.status !== status) onMove(production, status);
  };

  return (
    <div className="content">
      <ViewHeader title="Produção" actionLabel="＋ Nova peça" onAction={onCreate}>
        <select
          className="filter-select"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="all">Toda a equipe</option>
          <option value="none">Sem responsável</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {roleLabels[m.role] ?? m.role}
            </option>
          ))}
        </select>
      </ViewHeader>

      <p className="board-hint">Arraste os cards entre as colunas, ou use o seletor de etapa dentro do card.</p>

      <div className="kanban">
        {productionStatuses.map((status) => {
          const cards = visible.filter((p) => p.status === status);
          return (
            <section
              className="kanban-column"
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
            >
              <header className="kanban-head">
                <b>{productionStatusLabels[status]}</b>
                <span>{cards.length}</span>
              </header>
              <div className="kanban-cards">
                {cards.map((production) => {
                  const candidateIndex = candidates.findIndex((c) => c.id === production.candidate_id);
                  const candidate = candidates[candidateIndex];
                  const assignee = teamMembers.find((m) => m.id === production.assignee_id) ?? null;
                  const late = isOverdue(production.due_at, status === "published" || status === "approved");
                  return (
                    <article
                      className={`kanban-card${dragging === production.id ? " dragging" : ""}`}
                      key={production.id}
                      draggable
                      onDragStart={() => setDragging(production.id)}
                      onDragEnd={() => setDragging(null)}
                    >
                      <div className="kanban-card-head">
                        <b>{production.title}</b>
                        <button className="row-delete" onClick={() => onDelete(production)} title="Excluir peça">
                          ×
                        </button>
                      </div>
                      <span className="kanban-format">{production.format}</span>
                      {candidate && (
                        <div className="kanban-line">
                          <i className={`chip-avatar ${colorFor(candidateIndex)}`}>{initialsOf(candidate.name)}</i>
                          <span>{candidate.name}</span>
                        </div>
                      )}
                      <div className="kanban-line">
                        {assignee ? (
                          <>
                            <i className="chip-avatar assignee">{initialsOf(assignee.name)}</i>
                            <span>
                              {assignee.name} · <b>{roleLabels[assignee.role] ?? assignee.role}</b>
                            </span>
                          </>
                        ) : (
                          <span className="muted">Sem responsável</span>
                        )}
                      </div>
                      {production.due_at && (
                        <span className={`kanban-due${late ? " late" : ""}`}>
                          {late ? "Atrasado · " : "Prazo "}
                          {formatDateTime(production.due_at)}
                        </span>
                      )}
                      {production.notes && <p className="kanban-notes">{production.notes}</p>}
                      <div className="kanban-card-actions">
                        <select
                          value={production.status}
                          onChange={(e) => onMove(production, e.target.value as ProductionStatus)}
                        >
                          {productionStatuses.map((option) => (
                            <option key={option} value={option}>
                              {productionStatusLabels[option]}
                            </option>
                          ))}
                        </select>
                        {production.drive_file_url && (
                          <a href={production.drive_file_url} target="_blank" rel="noreferrer" title="Abrir no Drive">
                            △
                          </a>
                        )}
                        {assignee && (
                          <button onClick={() => onNotify(production)} title={`Avisar ${assignee.name}`}>
                            ✆
                          </button>
                        )}
                        <button onClick={() => onEdit(production)}>Editar</button>
                      </div>
                    </article>
                  );
                })}
                {!cards.length && <p className="kanban-empty">Vazio</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
