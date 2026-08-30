import { useState } from "react";
import type {
  Candidate,
  ChecklistCategory,
  ChecklistItem,
  ChecklistPriority,
  VoteProjection,
} from "../lib/types";
import type { NewChecklistItemInput, VoteProjectionInput } from "../lib/api";
import {
  checklistCategories,
  checklistCategoryLabels,
  checklistPriorities,
  checklistPriorityLabels,
  colorFor,
  formatDate,
  formatVotes,
  initialsOf,
  priorityRank,
  strategyTracks,
  trackIcons,
} from "../lib/format";
import { Field, Modal, SelectField, ViewHeader, useSaveHandler } from "./ui";
import { VotePieChart } from "./VotePieChart";

/* ------------------------------------------------------------- formulários */

export function ChecklistItemForm({
  candidates,
  defaultCandidateId,
  defaultCategory,
  onClose,
  onSave,
}: {
  candidates: Candidate[];
  defaultCandidateId: number | null;
  defaultCategory: ChecklistCategory;
  onClose: () => void;
  onSave: (input: NewChecklistItemInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    candidate_id: String(defaultCandidateId ?? candidates[0]?.id ?? ""),
    category: defaultCategory,
    priority: "media" as ChecklistPriority,
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
        priority: form.priority,
      }),
  );

  return (
    <Modal
      eyebrow="NOVO ITEM"
      title="Adicionar ao checklist"
      subtitle="Escolha a frente, a prioridade e o prazo."
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
      <SelectField label="Frente" value={form.category} onChange={(v) => change("category", v)}>
        {checklistCategories.map((category) => (
          <option key={category} value={category}>
            {checklistCategoryLabels[category]}
          </option>
        ))}
      </SelectField>
      <SelectField label="Prioridade" value={form.priority} onChange={(v) => change("priority", v)}>
        {checklistPriorities.map((priority) => (
          <option key={priority} value={priority}>
            {checklistPriorityLabels[priority]}
          </option>
        ))}
      </SelectField>
      <Field
        label="Prazo (opcional)"
        name="due_date"
        type="date"
        value={form.due_date}
        onChange={change}
      />
      <Field
        label="O que precisa ser feito"
        name="title"
        value={form.title}
        onChange={change}
        placeholder="Ex.: Mapear lideranças da Zona Sul"
        full
      />
    </Modal>
  );
}

export function VoteProjectionForm({
  candidate,
  onClose,
  onSave,
}: {
  candidate: Candidate;
  onClose: () => void;
  onSave: (input: VoteProjectionInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({ region: "", projected_votes: "" });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.region.trim()) return "Informe a região.";
      const votes = Number(form.projected_votes.replace(/\D/g, ""));
      if (!Number.isFinite(votes) || votes <= 0) return "Informe quantos votos são esperados.";
      return null;
    },
    () =>
      onSave({
        candidate_id: candidate.id,
        region: form.region.trim(),
        projected_votes: Number(form.projected_votes.replace(/\D/g, "")),
      }),
  );

  return (
    <Modal
      eyebrow="PROJEÇÃO"
      title="Votos por região"
      subtitle={`Quantos votos ${candidate.name} espera nesta região do estado.`}
      error={error}
      saving={saving}
      saveLabel="Salvar projeção"
      onSave={submit}
      onClose={onClose}
    >
      <Field
        label="Região"
        name="region"
        value={form.region}
        onChange={change}
        placeholder="Ex.: Zona Sul, Baixada Santista..."
      />
      <Field
        label="Votos projetados"
        name="projected_votes"
        value={form.projected_votes}
        onChange={change}
        placeholder="Ex.: 12000"
      />
    </Modal>
  );
}

/* --------------------------------------------------- seleção de candidato */

function CandidatePicker({
  candidates,
  checklistItems,
  onPick,
}: {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  onPick: (candidate: Candidate) => void;
}) {
  return (
    <div className="content">
      <ViewHeader title="Estratégia" />
      <p className="board-hint">Escolha o candidato para abrir a estratégia dele.</p>
      {candidates.length ? (
        <div className="card-grid">
          {candidates.map((candidate, index) => {
            const items = checklistItems.filter((i) => i.candidate_id === candidate.id);
            const open = items.filter((i) => !i.completed).length;
            const high = items.filter((i) => !i.completed && i.priority === "alta").length;
            return (
              <button className="panel picker-card" key={candidate.id} onClick={() => onPick(candidate)}>
                <div className={`candidate-avatar ${colorFor(index)}`}>{initialsOf(candidate.name)}</div>
                <div className="picker-info">
                  <b>{candidate.name}</b>
                  <span>
                    {candidate.office} · {candidate.city ?? "—"}
                  </span>
                </div>
                <div className="picker-counts">
                  <strong>{open}</strong>
                  <span>em aberto</span>
                  {high > 0 && <em className="picker-high">{high} alta</em>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <section className="panel list-panel">
          <p className="empty">Cadastre um candidato para montar a estratégia.</p>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------- coluna de uma frente */

function TrackColumn({
  track,
  items,
  onToggle,
  onDelete,
  onChangePriority,
  onAdd,
}: {
  track: ChecklistCategory;
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  onChangePriority: (item: ChecklistItem, priority: ChecklistPriority) => void;
  onAdd: (track: ChecklistCategory) => void;
}) {
  const ordered = [...items].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
  });
  const open = ordered.filter((i) => !i.completed).length;

  return (
    <section className={`panel track-column track-${track}`}>
      <header className="track-head">
        <div>
          <span>
            {trackIcons[track]} {checklistCategoryLabels[track].toUpperCase()}
          </span>
          <h3>
            {open} {open === 1 ? "tarefa em aberto" : "tarefas em aberto"}
          </h3>
        </div>
        <button className="secondary small" onClick={() => onAdd(track)}>
          ＋ Item
        </button>
      </header>

      {ordered.length ? (
        ordered.map((item, index) => {
          const startsGroup = index === 0 || ordered[index - 1].priority !== item.priority;
          const overdue = !item.completed && item.due_date !== null && new Date(item.due_date) < new Date();
          return (
            <div key={item.id}>
              {startsGroup && (
                <h4 className={`priority-heading prio-${item.priority}`}>
                  {checklistPriorityLabels[item.priority]} prioridade
                </h4>
              )}
              <div className="list-row">
                <button
                  className={`check ${item.completed ? "checked" : ""}`}
                  onClick={() => onToggle(item)}
                  title={item.completed ? "Marcar como pendente" : "Marcar como concluído"}
                >
                  {item.completed ? "✓" : ""}
                </button>
                <div className="grow">
                  <b className={item.completed ? "done" : ""}>{item.title}</b>
                  <span>{item.due_date ? `prazo ${formatDate(item.due_date)}` : "sem prazo"}</span>
                </div>
                {overdue && <em>ATRASADO</em>}
                <select
                  className={`priority-select prio-${item.priority}`}
                  value={item.priority}
                  onChange={(e) => onChangePriority(item, e.target.value as ChecklistPriority)}
                  title="Mudar prioridade"
                >
                  {checklistPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {checklistPriorityLabels[priority]}
                    </option>
                  ))}
                </select>
                <button className="row-delete" onClick={() => onDelete(item)} title="Excluir item">
                  ×
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <p className="empty">Nenhum item nesta frente ainda.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- tela toda */

export function StrategyView({
  candidates,
  items,
  voteProjections,
  selected,
  onSelect,
  onToggle,
  onDelete,
  onChangePriority,
  onChangeCategory,
  onCreateItem,
  onAddProjection,
  onDeleteProjection,
}: {
  candidates: Candidate[];
  items: ChecklistItem[];
  voteProjections: VoteProjection[];
  selected: Candidate | null;
  onSelect: (candidate: Candidate | null) => void;
  onToggle: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  onChangePriority: (item: ChecklistItem, priority: ChecklistPriority) => void;
  onChangeCategory: (item: ChecklistItem, category: ChecklistCategory) => void;
  onCreateItem: (track: ChecklistCategory) => void;
  onAddProjection: () => void;
  onDeleteProjection: (projection: VoteProjection) => void;
}) {
  if (!selected) {
    return (
      <CandidatePicker candidates={candidates} checklistItems={items} onPick={(c) => onSelect(c)} />
    );
  }

  const mine = items.filter((i) => i.candidate_id === selected.id);
  const projections = voteProjections.filter((p) => p.candidate_id === selected.id);
  const totalVotes = projections.reduce((sum, p) => sum + p.projected_votes, 0);
  const others = mine.filter((i) => !strategyTracks.includes(i.category));
  const done = mine.filter((i) => i.completed).length;
  const percent = mine.length ? Math.round((done / mine.length) * 100) : 0;

  return (
    <div className="content">
      <button className="back" onClick={() => onSelect(null)}>
        ← Trocar de candidato
      </button>

      <ViewHeader title={`Estratégia · ${selected.name}`} />

      <div className="strategy-top">
        <section className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span>PROJEÇÃO NO ESTADO</span>
              <h3>Votos por região</h3>
            </div>
            <button className="secondary small" onClick={onAddProjection}>
              ＋ Região
            </button>
          </div>
          <VotePieChart projections={projections} />
          {projections.length > 0 && (
            <ul className="projection-admin">
              {projections.map((p) => (
                <li key={p.id}>
                  <span>{p.region}</span>
                  <b>{formatVotes(p.projected_votes)}</b>
                  <button className="row-delete" onClick={() => onDeleteProjection(p)} title="Remover região">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel progress-panel strategy-progress">
          <div>
            <span>PROGRESSO GERAL</span>
            <strong>
              {done} de {mine.length} concluídos
            </strong>
          </div>
          <div className="bar">
            <i style={{ width: `${percent}%` }} />
          </div>
          <b>{percent}%</b>
        </section>
      </div>

      <div className="track-grid">
        {strategyTracks.map((track) => (
          <TrackColumn
            key={track}
            track={track}
            items={mine.filter((i) => i.category === track)}
            onToggle={onToggle}
            onDelete={onDelete}
            onChangePriority={onChangePriority}
            onAdd={onCreateItem}
          />
        ))}
      </div>

      {others.length > 0 && (
        <section className="panel list-panel others-panel">
          <div className="panel-title">
            <div>
              <span>OUTROS ITENS</span>
              <h3>Documentos, exigências e itens gerais</h3>
              <p className="panel-hint">
                Use o seletor de frente para mover um item para Chão ou Internet.
              </p>
            </div>
          </div>
          {others.map((item) => (
            <div className="list-row" key={item.id}>
              <button
                className={`check ${item.completed ? "checked" : ""}`}
                onClick={() => onToggle(item)}
              >
                {item.completed ? "✓" : ""}
              </button>
              <div className="grow">
                <b className={item.completed ? "done" : ""}>{item.title}</b>
                <span>{item.due_date ? `prazo ${formatDate(item.due_date)}` : "sem prazo"}</span>
              </div>
              <select
                className="filter-select"
                value={item.category}
                onChange={(e) => onChangeCategory(item, e.target.value as ChecklistCategory)}
                title="Mover para outra frente"
              >
                {[...checklistCategories, "strategy" as ChecklistCategory].map((category) => (
                  <option key={category} value={category}>
                    {checklistCategoryLabels[category]}
                  </option>
                ))}
              </select>
              <select
                className={`priority-select prio-${item.priority}`}
                value={item.priority}
                onChange={(e) => onChangePriority(item, e.target.value as ChecklistPriority)}
              >
                {checklistPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {checklistPriorityLabels[priority]}
                  </option>
                ))}
              </select>
              <button className="row-delete" onClick={() => onDelete(item)} title="Excluir item">
                ×
              </button>
            </div>
          ))}
        </section>
      )}

      {totalVotes > 0 && (
        <p className="board-hint">
          Projeção total no estado: <b>{formatVotes(totalVotes)}</b> votos em {projections.length}{" "}
          {projections.length === 1 ? "região" : "regiões"}.
        </p>
      )}
    </div>
  );
}
