import type {
  CalendarItem,
  Candidate,
  ChecklistItem,
  DoubledCampaign,
  Production,
  TeamMember,
} from "../lib/types";
import {
  checklistCategoryLabels,
  colorFor,
  formatCurrency,
  formatDate,
  formatDateTime,
  initialsOf,
  productionStatusLabels,
  roleLabels,
} from "../lib/format";

export function CandidateDetail({
  candidate,
  colorIndex,
  checklist,
  calendarItems,
  productions,
  doubled,
  teamMembers,
  onBack,
  onEdit,
  onToggleChecklist,
}: {
  candidate: Candidate;
  colorIndex: number;
  checklist: ChecklistItem[];
  calendarItems: CalendarItem[];
  productions: Production[];
  doubled: DoubledCampaign[];
  teamMembers: TeamMember[];
  onBack: () => void;
  onEdit: () => void;
  onToggleChecklist: (item: ChecklistItem) => void;
}) {
  const assigneeLabel = (id: number | null) => {
    const member = teamMembers.find((m) => m.id === id);
    return member ? `${member.name} · ${roleLabels[member.role] ?? member.role}` : "Sem responsável";
  };

  return (
    <section className="detail-view">
      <button className="back" onClick={onBack}>
        ← Voltar
      </button>
      <div className="detail-hero">
        <div className={`candidate-avatar ${colorFor(colorIndex)}`}>{initialsOf(candidate.name)}</div>
        <div>
          <span>FICHA DO CANDIDATO</span>
          <h2>{candidate.name}</h2>
          <p>
            {candidate.office} · número {candidate.electoral_number ?? "—"} · {candidate.city ?? "—"}
          </p>
        </div>
        <button className="primary" onClick={onEdit}>
          Editar ficha
        </button>
      </div>

      <div className="detail-grid">
        <article className="panel detail-card">
          <span>DADOS DA CAMPANHA</span>
          <h3>Operação e investimento</h3>
          <dl>
            <div>
              <dt>Valor investido</dt>
              <dd>{formatCurrency(candidate.investment_amount)}</dd>
            </div>
            <div>
              <dt>Origem</dt>
              <dd>{candidate.investment_source ?? "Não informado"}</dd>
            </div>
            <div>
              <dt>Projeção</dt>
              <dd>{candidate.vote_projection ?? "Não informado"}</dd>
            </div>
            <div>
              <dt>Regiões</dt>
              <dd>{candidate.regions ?? "Não informado"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel detail-card">
          <span>ARQUIVOS</span>
          <h3>Pasta do Google Drive</h3>
          {candidate.drive_folder_url ? (
            <>
              <a className="drive-btn" href={candidate.drive_folder_url} target="_blank" rel="noreferrer">
                △ Abrir pasta no Drive
              </a>
              <p className="drive-url">{candidate.drive_folder_url}</p>
            </>
          ) : (
            <p className="empty">
              Nenhuma pasta vinculada. Clique em “Editar ficha” e cole o link da pasta do Drive.
            </p>
          )}
        </article>

        <article className="panel detail-card">
          <span>EQUIPE DO CANDIDATO</span>
          <h3>Membros vinculados</h3>
          <p className="team-copy">{candidate.candidate_team || "Nenhum membro informado ainda."}</p>
        </article>

        <article className="panel detail-card full-card">
          <div className="panel-title">
            <div>
              <span>CHECKLIST</span>
              <h3>Documentos e estratégia</h3>
            </div>
          </div>
          {checklist.length ? (
            checklist.map((item) => (
              <label key={item.id} className="checklist-row">
                <input type="checkbox" checked={item.completed} onChange={() => onToggleChecklist(item)} />
                <span className={item.completed ? "done" : ""}>{item.title}</span>
                <small>
                  {checklistCategoryLabels[item.category]}
                  {item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
                </small>
              </label>
            ))
          ) : (
            <p className="empty">Nenhum item de checklist para este candidato.</p>
          )}
        </article>

        <article className="panel detail-card full-card">
          <div className="panel-title">
            <div>
              <span>AGENDA</span>
              <h3>Próximos compromissos</h3>
            </div>
          </div>
          {calendarItems.length ? (
            calendarItems.map((item) => (
              <div className="doubled" key={item.id}>
                <b>{item.title}</b>
                <span>
                  {formatDateTime(item.starts_at)} · {assigneeLabel(item.assignee_id)}
                </span>
              </div>
            ))
          ) : (
            <p className="empty">Nenhum compromisso agendado.</p>
          )}
        </article>

        <article className="panel detail-card full-card">
          <div className="panel-title">
            <div>
              <span>PRODUÇÃO</span>
              <h3>Peças e responsáveis</h3>
            </div>
          </div>
          {productions.length ? (
            productions.map((production) => (
              <div className="doubled" key={production.id}>
                <b>{production.title}</b>
                <span>
                  {production.format} · {productionStatusLabels[production.status]} ·{" "}
                  {assigneeLabel(production.assignee_id)}
                </span>
                {production.drive_file_url && (
                  <a href={production.drive_file_url} target="_blank" rel="noreferrer" title="Abrir no Drive">
                    △
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="empty">Nenhuma produção cadastrada.</p>
          )}
        </article>

        <article className="panel detail-card full-card">
          <div className="panel-title">
            <div>
              <span>DOBRADAS</span>
              <h3>Parcerias e candidaturas vinculadas</h3>
            </div>
          </div>
          {doubled.length ? (
            doubled.map((item) => (
              <div className="doubled" key={item.id}>
                <b>{item.title}</b>
                <span>
                  {item.partner_name ?? "Parceria"}
                  {item.region ? ` · ${item.region}` : ""}
                </span>
                {item.drive_folder_url && (
                  <a href={item.drive_folder_url} target="_blank" rel="noreferrer" title="Abrir no Drive">
                    △
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="empty">Nenhuma dobrada cadastrada.</p>
          )}
        </article>
      </div>
    </section>
  );
}
