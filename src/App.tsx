import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  createCandidate,
  fetchAgencyMembership,
  fetchDashboardData,
  setCalendarItemCompleted,
  setChecklistItemCompleted,
  type DashboardData,
} from "./lib/api";
import type {
  AgencyMember,
  CalendarItem,
  Candidate,
  ChecklistItem,
  DoubledCampaign,
  Office,
  Production,
} from "./lib/types";
import { Login } from "./components/Login";

const nav = [
  ["Visão geral", "⌂"],
  ["Candidatos", "◉"],
  ["Estratégia", "◇"],
  ["Agenda", "□"],
  ["Calendário", "▦"],
  ["Produção", "✦"],
  ["Equipe", "♙"],
] as const;

const avatarColors = ["coral", "blue", "gold"] as const;
const roleLabels: Record<string, string> = {
  admin: "Administrador",
  designer: "Designer",
  editor_filmmaker: "Editor/Filmmaker",
};

const ELECTION_DEADLINE = new Date("2026-09-30T23:59:59-03:00");

function initialsOf(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "NC";
}

function colorFor(index: number) {
  return avatarColors[index % avatarColors.length];
}

function formatCurrency(value: number | null) {
  if (value === null) return "Não informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrencyInput(value: string): number | null {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysUntil(date: Date) {
  const diffMs = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

function todayLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.toUpperCase();
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(name, e.target.value)} placeholder={placeholder} />
    </label>
  );
}

type NewCandidateFormState = {
  name: string;
  electoral_number: string;
  office: Office;
  investment_amount: string;
  investment_source: string;
  city: string;
  regions: string;
  vote_projection: string;
  candidate_team: string;
};

const emptyCandidateForm: NewCandidateFormState = {
  name: "",
  electoral_number: "",
  office: "Deputado Estadual",
  investment_amount: "",
  investment_source: "",
  city: "",
  regions: "",
  vote_projection: "",
  candidate_team: "",
};

function CandidateForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (form: NewCandidateFormState) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyCandidateForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      setError("Informe o nome do candidato.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o candidato.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <span>NOVO CADASTRO</span>
            <h2>Cadastrar candidato</h2>
            <p>Preencha os dados operacionais da campanha.</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <Field label="Nome do candidato" name="name" value={form.name} onChange={change} placeholder="Nome completo" />
          <Field
            label="Número do candidato"
            name="electoral_number"
            value={form.electoral_number}
            onChange={change}
            placeholder="Ex.: 40123"
          />
          <label className="field">
            <span>Cargo</span>
            <select value={form.office} onChange={(e) => change("office", e.target.value)}>
              <option>Deputado Estadual</option>
              <option>Deputado Federal</option>
            </select>
          </label>
          <Field
            label="Valor investido"
            name="investment_amount"
            value={form.investment_amount}
            onChange={change}
            placeholder="R$ 0,00"
          />
          <Field
            label="Origem do investimento"
            name="investment_source"
            value={form.investment_source}
            onChange={change}
            placeholder="Fundo partidário, próprio..."
          />
          <Field label="Cidade-base" name="city" value={form.city} onChange={change} placeholder="Cidade" />
          <Field
            label="Regiões de atuação"
            name="regions"
            value={form.regions}
            onChange={change}
            placeholder="Bairros, cidades ou regiões"
          />
          <Field
            label="Projeção de votação"
            name="vote_projection"
            value={form.vote_projection}
            onChange={change}
            placeholder="Ex.: 42.000 votos"
          />
          <label className="field full">
            <span>Membros da equipe do candidato</span>
            <textarea
              value={form.candidate_team}
              onChange={(e) => change("candidate_team", e.target.value)}
              placeholder="Nome e função, separados por vírgula"
            />
          </label>
        </div>
        {error && <p className="login-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar candidato"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateDetail({
  candidate,
  colorIndex,
  checklist,
  productions,
  doubled,
  onBack,
  onToggleChecklist,
}: {
  candidate: Candidate;
  colorIndex: number;
  checklist: ChecklistItem[];
  productions: Production[];
  doubled: DoubledCampaign[];
  onBack: () => void;
  onToggleChecklist: (item: ChecklistItem) => void;
}) {
  return (
    <section className="detail-view">
      <button className="back" onClick={onBack}>
        ← Voltar para candidatos
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
          <span>EQUIPE</span>
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
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => onToggleChecklist(item)}
                />
                <span>{item.title}</span>
                <small>{item.completed ? "Concluído" : item.due_date ? `Prazo ${item.due_date}` : "Pendente"}</small>
              </label>
            ))
          ) : (
            <p className="empty">Nenhum item de checklist cadastrado.</p>
          )}
        </article>
        <article className="panel detail-card full-card">
          <div className="panel-title">
            <div>
              <span>PRODUÇÃO</span>
              <h3>Peças em andamento</h3>
            </div>
          </div>
          {productions.length ? (
            productions.map((p) => (
              <div className="doubled" key={p.id}>
                <b>{p.title}</b>
                <span>
                  {p.format} · {p.status}
                </span>
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
            doubled.map((d) => (
              <div className="doubled" key={d.id}>
                <b>{d.title}</b>
                <span>Estratégia vinculada · Drive</span>
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

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export default function App() {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [membership, setMembership] = useState<AgencyMember | null | undefined>(undefined);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState("Visão geral");
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      setMembership(undefined);
      setData(null);
      return;
    }
    let cancelled = false;
    fetchAgencyMembership(session.user.id)
      .then((result) => {
        if (!cancelled) setMembership(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao verificar acesso.");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !membership) return;
    let cancelled = false;
    setDataLoading(true);
    fetchDashboardData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, membership]);

  const detail = useMemo(
    () => data?.candidates.find((c) => c.id === detailId) ?? null,
    [data, detailId],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const activeCandidates = data.candidates.filter((c) => c.status === "active").length;
    const inProduction = data.productions.filter((p) => p.status !== "published").length;
    const overdueProductions = data.productions.filter(
      (p) => p.due_at && new Date(p.due_at) < new Date() && !["approved", "published"].includes(p.status),
    ).length;
    const inApproval = data.productions.filter((p) => p.status === "approval").length;
    const checklistDone = data.checklistItems.filter((c) => c.completed).length;
    const checklistTotal = data.checklistItems.length;
    const checklistPercent = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
    const docLike = data.checklistItems.filter(
      (c) => c.category === "document" || c.category === "electoral_requirement",
    );
    const docDone = docLike.filter((c) => c.completed).length;
    const pendingRequirements = docLike.filter((c) => c.category === "electoral_requirement" && !c.completed).length;
    const overdueCalendar = data.calendarItems.filter(
      (item) => !item.completed && new Date(item.starts_at) < new Date(),
    ).length;
    return {
      activeCandidates,
      inProduction,
      overdueProductions,
      inApproval,
      checklistPercent,
      docDone,
      docTotal: docLike.length,
      pendingRequirements,
      criticalPending: overdueProductions + overdueCalendar,
    };
  }, [data]);

  const upcomingCalendar = useMemo(() => {
    if (!data) return [];
    return [...data.calendarItems]
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 4);
  }, [data]);

  const priorityChecklist = useMemo(() => {
    if (!data) return [];
    return data.checklistItems
      .filter((item) => !item.completed)
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      .slice(0, 4);
  }, [data]);

  const handleCreateCandidate = async (form: NewCandidateFormState) => {
    const created = await createCandidate({
      name: form.name.trim(),
      electoral_number: form.electoral_number.trim() || null,
      office: form.office,
      investment_amount: parseCurrencyInput(form.investment_amount),
      investment_source: form.investment_source.trim() || null,
      city: form.city.trim() || null,
      regions: form.regions.trim() || null,
      vote_projection: form.vote_projection.trim() || null,
      candidate_team: form.candidate_team.trim() || null,
    });
    setData((prev) => (prev ? { ...prev, candidates: [...prev.candidates, created] } : prev));
    setShowForm(false);
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    const nextCompleted = !item.completed;
    setData((prev) =>
      prev
        ? {
            ...prev,
            checklistItems: prev.checklistItems.map((c) =>
              c.id === item.id ? { ...c, completed: nextCompleted } : c,
            ),
          }
        : prev,
    );
    try {
      await setChecklistItemCompleted(item.id, nextCompleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar checklist.");
    }
  };

  const handleToggleCalendar = async (item: CalendarItem) => {
    const nextCompleted = !item.completed;
    setData((prev) =>
      prev
        ? {
            ...prev,
            calendarItems: prev.calendarItems.map((c) =>
              c.id === item.id ? { ...c, completed: nextCompleted } : c,
            ),
          }
        : prev,
    );
    try {
      await setCalendarItemCompleted(item.id, nextCompleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar agenda.");
    }
  };

  if (sessionLoading) {
    return <div className="app-loading">Carregando…</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (membership === undefined) {
    return <div className="app-loading">Verificando acesso…</div>;
  }

  if (membership === null) {
    return (
      <div className="access-denied">
        <h1>Acesso não autorizado</h1>
        <p>Sua conta ainda não foi vinculada à Agência Criando. Fale com um administrador.</p>
        <button className="primary" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    );
  }

  const daysRemaining = daysUntil(ELECTION_DEADLINE);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark">A</div>
          <div>
            <b>Agência Criando</b>
            <span>Gestão política</span>
          </div>
        </div>
        <nav>
          {nav.map(([label, icon]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => {
                setActive(label);
                setDetailId(null);
              }}
            >
              <i>{icon}</i>
              {label}
              {label === "Produção" && stats && <em>{stats.inProduction}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{initialsOf(session.user.email ?? "?")}</div>
          <div>
            <b>{session.user.email}</b>
            <span>{roleLabels[membership.role] ?? membership.role}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} title="Sair">
            ···
          </button>
        </div>
      </aside>
      <section className="workspace">
        <header>
          <div>
            <p>{todayLabel()}</p>
            <h1>{detail ? detail.name : active}</h1>
          </div>
          <div className="header-actions">
            <button className="icon-btn">⌕</button>
            <button className="icon-btn notify">♧</button>
            <button className="primary" onClick={() => setShowForm(true)}>
              ＋ Novo candidato
            </button>
          </div>
        </header>
        {error && <p className="banner-error">{error}</p>}
        {dataLoading || !data || !stats ? (
          <div className="app-loading">Carregando dados do CRM…</div>
        ) : detail ? (
          <CandidateDetail
            candidate={detail}
            colorIndex={data.candidates.findIndex((c) => c.id === detail.id)}
            checklist={data.checklistItems.filter((c) => c.candidate_id === detail.id)}
            productions={data.productions.filter((p) => p.candidate_id === detail.id)}
            doubled={data.doubledCampaigns.filter((d) => d.candidate_id === detail.id)}
            onBack={() => setDetailId(null)}
            onToggleChecklist={handleToggleChecklist}
          />
        ) : (
          <div className="content">
            <section className="welcome">
              <div>
                <span>OPERAÇÃO {daysRemaining} DIAS</span>
                <h2>Bom dia, Agência Criando.</h2>
                <p>
                  A campanha está em movimento. Há <b>{stats.criticalPending} pendências críticas</b> que precisam
                  da sua atenção hoje.
                </p>
              </div>
              <div className="countdown">
                <strong>{daysRemaining}</strong>
                <span>DIAS RESTANTES</span>
                <small>até 30 de setembro</small>
              </div>
            </section>
            <div className="stats">
              <article>
                <span>CANDIDATOS ATIVOS</span>
                <strong>{String(stats.activeCandidates).padStart(2, "0")}</strong>
                <small>Todos com estratégia iniciada</small>
              </article>
              <article>
                <span>CONTEÚDOS EM PRODUÇÃO</span>
                <strong>{stats.inProduction}</strong>
                <small>
                  <b className="bad">{stats.overdueProductions} atrasados</b> · {stats.inApproval} em aprovação
                </small>
              </article>
              <article>
                <span>TAREFAS CONCLUÍDAS</span>
                <strong>{stats.checklistPercent}%</strong>
                <div className="bar">
                  <i style={{ width: `${stats.checklistPercent}%` }} />
                </div>
              </article>
              <article>
                <span>DOCUMENTOS</span>
                <strong>
                  {stats.docDone}/{stats.docTotal}
                </strong>
                <small>
                  <b className="warn">{stats.pendingRequirements} exigências pendentes</b>
                </small>
              </article>
            </div>
            <div className="grid-main">
              <section className="panel candidates">
                <div className="panel-title">
                  <div>
                    <span>CARTEIRA</span>
                    <h3>Candidatos</h3>
                  </div>
                  <button onClick={() => setActive("Candidatos")}>Ver todos →</button>
                </div>
                {data.candidates.map((c, index) => {
                  const candidateChecklist = data.checklistItems.filter((item) => item.candidate_id === c.id);
                  const progress = candidateChecklist.length
                    ? Math.round(
                        (candidateChecklist.filter((item) => item.completed).length / candidateChecklist.length) *
                          100,
                      )
                    : 0;
                  return (
                    <article key={c.id} onClick={() => setDetailId(c.id)} className="candidate-row">
                      <div className={`candidate-avatar ${colorFor(index)}`}>{initialsOf(c.name)}</div>
                      <div className="candidate-info">
                        <b>{c.name}</b>
                        <span>
                          {c.office} · {c.electoral_number ?? "—"}
                        </span>
                        <div className="progress">
                          <i style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="candidate-meta">
                        <strong>{progress}%</strong>
                        <span>estratégia</span>
                      </div>
                      <div className="candidate-days">
                        <strong>{daysRemaining}</strong>
                        <span>dias</span>
                      </div>
                      <button className="more">•••</button>
                    </article>
                  );
                })}
                <button className="add-candidate" onClick={() => setShowForm(true)}>
                  ＋ Adicionar candidato
                </button>
              </section>
              <section className="panel agenda">
                <div className="panel-title">
                  <div>
                    <span>PRÓXIMOS DIAS</span>
                    <h3>Agenda da equipe</h3>
                  </div>
                  <button onClick={() => setActive("Agenda")}>Calendário →</button>
                </div>
                {upcomingCalendar.length ? (
                  upcomingCalendar.map((item) => {
                    const start = new Date(item.starts_at);
                    const overdue = !item.completed && start < new Date();
                    return (
                      <article key={item.id} className={overdue ? "overdue" : ""}>
                        <button
                          className={`check ${item.completed ? "checked" : ""}`}
                          onClick={() => handleToggleCalendar(item)}
                        >
                          {item.completed ? "✓" : ""}
                        </button>
                        <div className="event-date">
                          <strong>{start.getDate()}</strong>
                          <span>{start.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</span>
                        </div>
                        <i className={`dot ${overdue ? "red" : "blue"}`} />
                        <div className="event-info">
                          <b>{item.title}</b>
                          <span>
                            {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                            {data.candidates.find((c) => c.id === item.candidate_id)?.name ?? ""}
                          </span>
                        </div>
                        {overdue && <em>ATRASADO</em>}
                      </article>
                    );
                  })
                ) : (
                  <p className="empty">Nenhum evento cadastrado.</p>
                )}
              </section>
            </div>
            <div className="grid-bottom">
              <section className="panel checklist">
                <div className="panel-title">
                  <div>
                    <span>ESTRATÉGIA</span>
                    <h3>Checklist prioritário</h3>
                  </div>
                  <button onClick={() => setActive("Estratégia")}>Abrir estratégia →</button>
                </div>
                {priorityChecklist.length ? (
                  priorityChecklist.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item)}
                      />
                      <span>{item.title}</span>
                      <small>{item.due_date ? `Prazo ${item.due_date}` : "Pendente"}</small>
                    </label>
                  ))
                ) : (
                  <p className="empty">Nenhum item pendente.</p>
                )}
              </section>
              <section className="panel drive">
                <div className="drive-icon">△</div>
                <div>
                  <span>GOOGLE DRIVE</span>
                  <h3>Pastas por candidato</h3>
                  <p>Estratégia, documentos, referências e entregas em um só lugar.</p>
                </div>
                <button>Gerenciar vínculos →</button>
              </section>
            </div>
          </div>
        )}
      </section>
      {showForm && <CandidateForm onClose={() => setShowForm(false)} onSave={handleCreateCandidate} />}
    </main>
  );
}
