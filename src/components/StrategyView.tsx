import { useState } from "react";
import type { Candidate, ChecklistCategory, ChecklistItem } from "../lib/types";
import type { NewChecklistItemInput } from "../lib/api";
import {
  checklistCategories,
  checklistCategoryLabels,
  colorFor,
  formatDate,
  initialsOf,
} from "../lib/format";
import { Field, Modal, SelectField, ViewHeader, useSaveHandler } from "./ui";

export function ChecklistItemForm({
  candidates,
  defaultCandidateId,
  onClose,
  onSave,
}: {
  candidates: Candidate[];
  defaultCandidateId: number | null;
  onClose: () => void;
  onSave: (input: NewChecklistItemInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    candidate_id: String(defaultCandidateId ?? candidates[0]?.id ?? ""),
    category: "strategy" as ChecklistCategory,
    title: "",
    due_date: "",
  });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.candidate_id) return "Selecione um candidato.";
      if (!form.title.trim()) return "Informe o que precisa ser feito.";
      return null;
    },
    () =>
      onSave({
        candidate_id: Number(form.candidate_id),
        category: form.category,
        title: form.title.trim(),
        label: null,
        due_date: form.due_date || null,
      }),
  );

  return (
    <Modal
      eyebrow="NOVO ITEM"
      title="Adicionar ao checklist"
      subtitle="Documentos, exigências eleitorais e tarefas de estratégia."
      error={error}
      saving={saving}
      saveLabel="Adicionar item"
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
      <SelectField label="Categoria" value={form.category} onChange={(v) => change("category", v)}>
        {checklistCategories.map((category) => (
          <option key={category} value={category}>
            {checklistCategoryLabels[category]}
          </option>
        ))}
      </SelectField>
      <Field
        label="O que precisa ser feito"
        name="title"
        value={form.title}
        onChange={change}
        placeholder="Ex.: Validar público prioritário"
        full
      />
      <Field
        label="Prazo (opcional)"
        name="due_date"
        type="date"
        value={form.due_date}
        onChange={change}
      />
    </Modal>
  );
}

export function StrategyView({
  candidates,
  items,
  onToggle,
  onDelete,
  onCreate,
}: {
  candidates: Candidate[];
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  onCreate: () => void;
}) {
  const [candidateFilter, setCandidateFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const visible = items.filter((item) => {
    if (candidateFilter !== "all" && item.candidate_id !== Number(candidateFilter)) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  const done = visible.filter((item) => item.completed).length;
  const percent = visible.length ? Math.round((done / visible.length) * 100) : 0;

  return (
    <div className="content">
      <ViewHeader title="Estratégia e checklist" actionLabel="＋ Novo item" onAction={onCreate}>
        <select
          className="filter-select"
          value={candidateFilter}
          onChange={(e) => setCandidateFilter(e.target.value)}
        >
          <option value="all">Todos os candidatos</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {checklistCategories.map((category) => (
            <option key={category} value={category}>
              {checklistCategoryLabels[category]}
            </option>
          ))}
        </select>
      </ViewHeader>

      <section className="panel progress-panel">
        <div>
          <span>PROGRESSO</span>
          <strong>
            {done} de {visible.length} concluídos
          </strong>
        </div>
        <div className="bar">
          <i style={{ width: `${percent}%` }} />
        </div>
        <b>{percent}%</b>
      </section>

      <section className="panel list-panel">
        {visible.length ? (
          visible.map((item) => {
            const candidateIndex = candidates.findIndex((c) => c.id === item.candidate_id);
            const candidate = candidates[candidateIndex];
            const overdue = !item.completed && item.due_date !== null && new Date(item.due_date) < new Date();
            return (
              <div className="list-row" key={item.id}>
                <button
                  className={`check ${item.completed ? "checked" : ""}`}
                  onClick={() => onToggle(item)}
                  title={item.completed ? "Marcar como pendente" : "Marcar como concluído"}
                >
                  {item.completed ? "✓" : ""}
                </button>
                {candidate && (
                  <div className={`candidate-avatar small-avatar ${colorFor(candidateIndex)}`}>
                    {initialsOf(candidate.name)}
                  </div>
                )}
                <div className="grow">
                  <b className={item.completed ? "done" : ""}>{item.title}</b>
                  <span>
                    {checklistCategoryLabels[item.category]}
                    {candidate ? ` · ${candidate.name}` : ""}
                    {item.due_date ? ` · prazo ${formatDate(item.due_date)}` : ""}
                  </span>
                </div>
                {overdue && <em>ATRASADO</em>}
                <button className="row-delete" onClick={() => onDelete(item)} title="Excluir item">
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty">Nenhum item para este filtro. Use "＋ Novo item" para começar.</p>
        )}
      </section>
    </div>
  );
}
