import type { Candidate, ChecklistItem } from "../lib/types";
import { colorFor, formatCurrency, initialsOf } from "../lib/format";
import { ViewHeader } from "./ui";

export function CandidatesView({
  candidates,
  checklistItems,
  onOpen,
  onEdit,
  onCreate,
}: {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  onOpen: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onCreate: () => void;
}) {
  return (
    <div className="content">
      <ViewHeader title="Candidatos" actionLabel="＋ Novo candidato" onAction={onCreate} />
      {candidates.length ? (
        <div className="card-grid">
          {candidates.map((candidate, index) => {
            const items = checklistItems.filter((item) => item.candidate_id === candidate.id);
            const progress = items.length
              ? Math.round((items.filter((item) => item.completed).length / items.length) * 100)
              : 0;
            return (
              <article className="panel candidate-card" key={candidate.id}>
                <header className="candidate-card-head">
                  <div className={`candidate-avatar ${colorFor(index)}`}>{initialsOf(candidate.name)}</div>
                  <div>
                    <b>{candidate.name}</b>
                    <span>
                      {candidate.office} · {candidate.electoral_number ?? "sem número"}
                    </span>
                  </div>
                </header>
                <dl className="candidate-card-data">
                  <div>
                    <dt>Cidade</dt>
                    <dd>{candidate.city ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Investimento</dt>
                    <dd>{formatCurrency(candidate.investment_amount)}</dd>
                  </div>
                </dl>
                <div className="progress">
                  <i style={{ width: `${progress}%` }} />
                </div>
                <small className="progress-label">{progress}% do checklist concluído</small>
                <div className="candidate-card-actions">
                  {candidate.drive_folder_url ? (
                    <a
                      className="drive-btn"
                      href={candidate.drive_folder_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      △ Abrir pasta no Drive
                    </a>
                  ) : (
                    <button className="drive-btn empty-drive" onClick={() => onEdit(candidate)}>
                      △ Vincular pasta do Drive
                    </button>
                  )}
                  <button className="secondary small" onClick={() => onEdit(candidate)}>
                    Editar
                  </button>
                  <button className="secondary small" onClick={() => onOpen(candidate)}>
                    Abrir ficha
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel list-panel">
          <p className="empty">Nenhum candidato cadastrado ainda.</p>
        </section>
      )}
    </div>
  );
}
