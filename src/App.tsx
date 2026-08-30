import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import {
  createCalendarItem,
  createCandidate,
  createChecklistItem,
  createProduction,
  createTeamMember,
  deleteCalendarItem,
  deleteCandidate,
  deleteChecklistItem,
  deleteProduction,
  deleteTeamMember,
  deleteVoteProjection,
  upsertVoteProjection,
  fetchAgencyMembership,
  fetchDashboardData,
  setCalendarItemCompleted,
  setChecklistItemCategory,
  setChecklistItemCompleted,
  setChecklistItemPriority,
  setTeamMemberActive,
  updateCalendarItem,
  updateChecklistItem,
  updateTeamMember,
  updateCandidate,
  updateProduction,
  type CandidateInput,
  type DashboardData,
  type NewCalendarItemInput,
  type NewChecklistItemInput,
  type NewProductionInput,
  type NewTeamMemberInput,
  type VoteProjectionInput,
} from "./lib/api";
import type {
  AgencyMember,
  CalendarItem,
  Candidate,
  ChecklistCategory,
  ChecklistItem,
  ChecklistPriority,
  Production,
  ProductionStatus,
  TeamMember,
  VoteProjection,
} from "./lib/types";
import {
  ELECTION_DEADLINE,
  checklistPriorityLabels,
  colorFor,
  daysUntil,
  formatDate,
  initialsOf,
  priorityRank,
  roleLabels,
  todayLabel,
} from "./lib/format";
import { Login } from "./components/Login";
import { CandidateForm } from "./components/CandidateForm";
import { CandidateDetail } from "./components/CandidateDetail";
import { CandidatesView } from "./components/CandidatesView";
import { ChecklistItemForm, StrategyView, VoteProjectionForm } from "./components/StrategyView";
import { AgendaView, CalendarItemForm } from "./components/AgendaView";
import { CalendarView } from "./components/CalendarView";
import { ProductionBoard, ProductionForm } from "./components/ProductionBoard";
import { TeamMemberForm, TeamView } from "./components/TeamView";

const nav = [
  ["Visão geral", "⌂"],
  ["Candidatos", "◉"],
  ["Estratégia", "◇"],
  ["Agenda", "□"],
  ["Calendário", "▦"],
  ["Produção", "✦"],
  ["Equipe", "♙"],
] as const;

type Access =
  | { status: "checking" }
  | { status: "authorized"; member: AgencyMember }
  | { status: "denied" }
  | { status: "error"; message: string };

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // O supabase-js segura um lock interno durante este callback: qualquer
      // consulta disparada em reação a ele trava. Sair da pilha do callback
      // antes de atualizar o estado evita esse deadlock.
      setTimeout(() => {
        setSession(newSession);
        setLoading(false);
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export default function App() {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [access, setAccess] = useState<Access>({ status: "checking" });
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [active, setActive] = useState<string>("Visão geral");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [candidateForm, setCandidateForm] = useState<{ open: boolean; editing: Candidate | null }>({
    open: false,
    editing: null,
  });
  const [checklistForm, setChecklistForm] = useState<{
    open: boolean;
    track: ChecklistCategory;
    editing: ChecklistItem | null;
  }>({ open: false, track: "ground", editing: null });
  const [strategyCandidateId, setStrategyCandidateId] = useState<number | null>(null);
  const [showProjectionForm, setShowProjectionForm] = useState(false);
  const [calendarForm, setCalendarForm] = useState<{ open: boolean; editing: CalendarItem | null }>({
    open: false,
    editing: null,
  });
  const [teamForm, setTeamForm] = useState<{ open: boolean; editing: TeamMember | null }>({
    open: false,
    editing: null,
  });
  const [productionForm, setProductionForm] = useState<{ open: boolean; editing: Production | null }>({
    open: false,
    editing: null,
  });

  // A sessão é recriada a cada refresh de token; seguir o id evita recarregar tudo à toa.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setAccess({ status: "checking" });
      setData(null);
      return;
    }
    let cancelled = false;
    setAccess({ status: "checking" });
    fetchAgencyMembership(userId)
      .then((member) => {
        if (cancelled) return;
        setAccess(member ? { status: "authorized", member } : { status: "denied" });
      })
      .catch((err) => {
        if (cancelled) return;
        setAccess({
          status: "error",
          message: err instanceof Error ? err.message : "Erro ao verificar acesso.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, retryKey]);

  const authorized = access.status === "authorized";

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setDataLoading(true);
    setDataError(null);
    fetchDashboardData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setDataError(err instanceof Error ? err.message : "Erro ao carregar dados.");
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authorized, retryKey]);

  const detail = useMemo(
    () => data?.candidates.find((c) => c.id === detailId) ?? null,
    [data, detailId],
  );

  const strategyCandidate = useMemo(
    () => data?.candidates.find((c) => c.id === strategyCandidateId) ?? null,
    [data, strategyCandidateId],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const activeCandidates = data.candidates.filter((c) => c.status === "active").length;
    const inProduction = data.productions.filter(
      (p) => p.status !== "published" && p.status !== "approved",
    ).length;
    const overdueProductions = data.productions.filter(
      (p) => p.due_at && new Date(p.due_at) < now && p.status !== "approved" && p.status !== "published",
    ).length;
    const inApproval = data.productions.filter((p) => p.status === "approval").length;
    const checklistDone = data.checklistItems.filter((c) => c.completed).length;
    const checklistTotal = data.checklistItems.length;
    const checklistPercent = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
    const docLike = data.checklistItems.filter(
      (c) => c.category === "document" || c.category === "electoral_requirement",
    );
    const pendingRequirements = docLike.filter(
      (c) => c.category === "electoral_requirement" && !c.completed,
    ).length;
    const overdueCalendar = data.calendarItems.filter(
      (item) => !item.completed && new Date(item.starts_at) < now,
    ).length;
    return {
      activeCandidates,
      inProduction,
      overdueProductions,
      inApproval,
      checklistPercent,
      docDone: docLike.filter((c) => c.completed).length,
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
      .sort((a, b) => {
        const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
        if (byPriority !== 0) return byPriority;
        return (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
      })
      .slice(0, 4);
  }, [data]);

  const reportError = (err: unknown, fallback: string) =>
    setError(err instanceof Error ? err.message : fallback);

  /* ------------------------------------------------------------- candidatos */

  const handleSaveCandidate = async (input: CandidateInput) => {
    if (candidateForm.editing) {
      const updated = await updateCandidate(candidateForm.editing.id, input);
      setData((prev) =>
        prev ? { ...prev, candidates: prev.candidates.map((c) => (c.id === updated.id ? updated : c)) } : prev,
      );
    } else {
      const created = await createCandidate(input);
      setData((prev) => (prev ? { ...prev, candidates: [...prev.candidates, created] } : prev));
    }
    setCandidateForm({ open: false, editing: null });
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!data) return;
    const belongsTo = (id: number) => id === candidate.id;
    const counts = {
      checklist: data.checklistItems.filter((c) => belongsTo(c.candidate_id)).length,
      calendar: data.calendarItems.filter((c) => belongsTo(c.candidate_id)).length,
      productions: data.productions.filter((p) => belongsTo(p.candidate_id)).length,
      doubled: data.doubledCampaigns.filter((d) => belongsTo(d.candidate_id)).length,
    };
    // O banco apaga em cascata, então o usuário precisa ver o que vai junto.
    const cascade = Object.values(counts).some((n) => n > 0)
      ? "\n\nIsto apaga junto, em definitivo:" +
        `\n· ${counts.checklist} item(ns) de checklist` +
        `\n· ${counts.calendar} evento(s) de agenda` +
        `\n· ${counts.productions} peça(s) de produção` +
        `\n· ${counts.doubled} dobrada(s)`
      : "";
    const confirmed = window.confirm(
      `Excluir "${candidate.name}" do CRM?${cascade}\n\nEssa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    const previous = data;
    setData((prev) =>
      prev
        ? {
            ...prev,
            candidates: prev.candidates.filter((c) => c.id !== candidate.id),
            checklistItems: prev.checklistItems.filter((c) => !belongsTo(c.candidate_id)),
            calendarItems: prev.calendarItems.filter((c) => !belongsTo(c.candidate_id)),
            productions: prev.productions.filter((p) => !belongsTo(p.candidate_id)),
            doubledCampaigns: prev.doubledCampaigns.filter((d) => !belongsTo(d.candidate_id)),
          }
        : prev,
    );
    if (detailId === candidate.id) setDetailId(null);

    try {
      await deleteCandidate(candidate.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao excluir o candidato.");
    }
  };

  /* -------------------------------------------------------------- checklist */

  const handleSaveChecklistItem = async (input: NewChecklistItemInput) => {
    const editing = checklistForm.editing;
    if (editing) {
      const { candidate_id: _ignored, ...fields } = input;
      const updated = await updateChecklistItem(editing.id, fields);
      setData((prev) =>
        prev
          ? {
              ...prev,
              checklistItems: prev.checklistItems.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev,
      );
    } else {
      const created = await createChecklistItem(input);
      setData((prev) => (prev ? { ...prev, checklistItems: [...prev.checklistItems, created] } : prev));
    }
    setChecklistForm((f) => ({ ...f, open: false, editing: null }));
  };

  /* ------------------------------------------------------- projeção de votos */

  const handleSaveProjection = async (input: VoteProjectionInput) => {
    const saved = await upsertVoteProjection(input);
    setData((prev) => {
      if (!prev) return prev;
      const rest = prev.voteProjections.filter((p) => p.id !== saved.id);
      return { ...prev, voteProjections: [...rest, saved] };
    });
    setShowProjectionForm(false);
  };

  const handleDeleteProjection = async (projection: VoteProjection) => {
    if (!window.confirm(`Remover a projeção de "${projection.region}"?`)) return;
    const previous = data;
    setData((prev) =>
      prev
        ? { ...prev, voteProjections: prev.voteProjections.filter((p) => p.id !== projection.id) }
        : prev,
    );
    try {
      await deleteVoteProjection(projection.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao remover a projeção.");
    }
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    const completed = !item.completed;
    setData((prev) =>
      prev
        ? {
            ...prev,
            checklistItems: prev.checklistItems.map((c) => (c.id === item.id ? { ...c, completed } : c)),
          }
        : prev,
    );
    try {
      await setChecklistItemCompleted(item.id, completed);
    } catch (err) {
      reportError(err, "Erro ao atualizar checklist.");
    }
  };

  const handleChangeChecklistPriority = async (item: ChecklistItem, priority: ChecklistPriority) => {
    const previous = data;
    setData((prev) =>
      prev
        ? {
            ...prev,
            checklistItems: prev.checklistItems.map((c) => (c.id === item.id ? { ...c, priority } : c)),
          }
        : prev,
    );
    try {
      await setChecklistItemPriority(item.id, priority);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao mudar a prioridade.");
    }
  };

  const handleChangeChecklistCategory = async (item: ChecklistItem, category: ChecklistCategory) => {
    const previous = data;
    setData((prev) =>
      prev
        ? {
            ...prev,
            checklistItems: prev.checklistItems.map((c) => (c.id === item.id ? { ...c, category } : c)),
          }
        : prev,
    );
    try {
      await setChecklistItemCategory(item.id, category);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao mudar a frente do item.");
    }
  };

  const handleDeleteChecklistItem = async (item: ChecklistItem) => {
    if (!window.confirm(`Excluir "${item.title}" do checklist?`)) return;
    const previous = data;
    setData((prev) =>
      prev ? { ...prev, checklistItems: prev.checklistItems.filter((c) => c.id !== item.id) } : prev,
    );
    try {
      await deleteChecklistItem(item.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao excluir item.");
    }
  };

  /* ----------------------------------------------------------------- agenda */

  const handleSaveCalendarItem = async (input: NewCalendarItemInput) => {
    const editing = calendarForm.editing;
    if (editing) {
      const { candidate_id: _ignored, ...fields } = input;
      const updated = await updateCalendarItem(editing.id, fields);
      setData((prev) =>
        prev
          ? { ...prev, calendarItems: prev.calendarItems.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      );
    } else {
      const created = await createCalendarItem(input);
      setData((prev) => (prev ? { ...prev, calendarItems: [...prev.calendarItems, created] } : prev));
    }
    setCalendarForm({ open: false, editing: null });
  };

  const handleToggleCalendar = async (item: CalendarItem) => {
    const completed = !item.completed;
    setData((prev) =>
      prev
        ? {
            ...prev,
            calendarItems: prev.calendarItems.map((c) => (c.id === item.id ? { ...c, completed } : c)),
          }
        : prev,
    );
    try {
      await setCalendarItemCompleted(item.id, completed);
    } catch (err) {
      reportError(err, "Erro ao atualizar agenda.");
    }
  };

  const handleDeleteCalendarItem = async (item: CalendarItem) => {
    if (!window.confirm(`Excluir o evento "${item.title}"?`)) return;
    const previous = data;
    setData((prev) =>
      prev ? { ...prev, calendarItems: prev.calendarItems.filter((c) => c.id !== item.id) } : prev,
    );
    try {
      await deleteCalendarItem(item.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao excluir evento.");
    }
  };

  /* --------------------------------------------------------------- produção */

  const handleSaveProduction = async (input: NewProductionInput) => {
    if (productionForm.editing) {
      const updated = await updateProduction(productionForm.editing.id, input);
      setData((prev) =>
        prev
          ? { ...prev, productions: prev.productions.map((p) => (p.id === updated.id ? updated : p)) }
          : prev,
      );
    } else {
      const created = await createProduction(input);
      setData((prev) => (prev ? { ...prev, productions: [...prev.productions, created] } : prev));
    }
    setProductionForm({ open: false, editing: null });
  };

  const handleMoveProduction = async (production: Production, status: ProductionStatus) => {
    const previous = data;
    setData((prev) =>
      prev
        ? { ...prev, productions: prev.productions.map((p) => (p.id === production.id ? { ...p, status } : p)) }
        : prev,
    );
    try {
      await updateProduction(production.id, { status });
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao mover a peça.");
    }
  };

  const handleDeleteProduction = async (production: Production) => {
    if (!window.confirm(`Excluir a peça "${production.title}"?`)) return;
    const previous = data;
    setData((prev) =>
      prev ? { ...prev, productions: prev.productions.filter((p) => p.id !== production.id) } : prev,
    );
    try {
      await deleteProduction(production.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao excluir a peça.");
    }
  };

  /* ----------------------------------------------------------------- equipe */

  const handleSaveTeamMember = async (input: NewTeamMemberInput) => {
    const editing = teamForm.editing;
    if (editing) {
      const { active: _ignored, ...fields } = input;
      const updated = await updateTeamMember(editing.id, fields);
      setData((prev) =>
        prev
          ? { ...prev, teamMembers: prev.teamMembers.map((m) => (m.id === updated.id ? updated : m)) }
          : prev,
      );
    } else {
      const created = await createTeamMember(input);
      setData((prev) => (prev ? { ...prev, teamMembers: [...prev.teamMembers, created] } : prev));
    }
    setTeamForm({ open: false, editing: null });
  };

  const handleToggleTeamMemberActive = async (member: TeamMember) => {
    const nextActive = !member.active;
    setData((prev) =>
      prev
        ? {
            ...prev,
            teamMembers: prev.teamMembers.map((m) => (m.id === member.id ? { ...m, active: nextActive } : m)),
          }
        : prev,
    );
    try {
      await setTeamMemberActive(member.id, nextActive);
    } catch (err) {
      reportError(err, "Erro ao atualizar membro da equipe.");
    }
  };

  const handleDeleteTeamMember = async (member: TeamMember) => {
    if (!data) return;
    const assignedProductions = data.productions.filter((p) => p.assignee_id === member.id).length;
    const assignedEvents = data.calendarItems.filter((c) => c.assignee_id === member.id).length;
    // O banco zera o responsável em vez de apagar o trabalho.
    const unassigned =
      assignedProductions + assignedEvents > 0
        ? `\n\n${assignedProductions} peça(s) e ${assignedEvents} evento(s) ficarão sem responsável — o trabalho em si não é apagado.`
        : "";
    const confirmed = window.confirm(
      `Excluir "${member.name}" da equipe?${unassigned}` +
        `\n\nSe a intenção é só tirar do dia a dia mantendo o histórico, use "Desativar".` +
        `\n\nEssa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    const previous = data;
    setData((prev) =>
      prev
        ? {
            ...prev,
            teamMembers: prev.teamMembers.filter((m) => m.id !== member.id),
            productions: prev.productions.map((p) =>
              p.assignee_id === member.id ? { ...p, assignee_id: null } : p,
            ),
            calendarItems: prev.calendarItems.map((c) =>
              c.assignee_id === member.id ? { ...c, assignee_id: null } : c,
            ),
          }
        : prev,
    );

    try {
      await deleteTeamMember(member.id);
    } catch (err) {
      setData(previous);
      reportError(err, "Erro ao excluir o membro da equipe.");
    }
  };

  /* ------------------------------------------------------------- roteamento */

  if (sessionLoading) return <div className="app-loading">Carregando…</div>;
  if (!session) return <Login />;
  if (access.status === "checking") return <div className="app-loading">Verificando acesso…</div>;

  if (access.status === "error") {
    return (
      <div className="access-denied">
        <h1>Não foi possível verificar seu acesso</h1>
        <p className="login-error">{access.message}</p>
        <div className="modal-actions">
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
          <button className="primary" onClick={() => setRetryKey((k) => k + 1)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (access.status === "denied") {
    return (
      <div className="access-denied">
        <h1>Acesso não autorizado</h1>
        <p>
          Sua conta ({session.user.email}) ainda não foi vinculada à Agência Criando. Fale com um
          administrador.
        </p>
        <button className="primary" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    );
  }

  const daysRemaining = daysUntil(ELECTION_DEADLINE);
  const openCandidate = (candidate: Candidate) => {
    setDetailId(candidate.id);
    setActive("Candidatos");
  };

  const renderWorkspace = () => {
    if (dataError) {
      return (
        <div className="access-denied">
          <h1>Não foi possível carregar os dados</h1>
          <p className="login-error">{dataError}</p>
          <button className="primary" onClick={() => setRetryKey((k) => k + 1)}>
            Tentar novamente
          </button>
        </div>
      );
    }
    if (dataLoading || !data || !stats) {
      return <div className="app-loading">Carregando dados do CRM…</div>;
    }
    if (detail) {
      return (
        <CandidateDetail
          candidate={detail}
          colorIndex={data.candidates.findIndex((c) => c.id === detail.id)}
          checklist={data.checklistItems.filter((c) => c.candidate_id === detail.id)}
          calendarItems={data.calendarItems.filter((c) => c.candidate_id === detail.id)}
          productions={data.productions.filter((p) => p.candidate_id === detail.id)}
          doubled={data.doubledCampaigns.filter((d) => d.candidate_id === detail.id)}
          teamMembers={data.teamMembers}
          onBack={() => setDetailId(null)}
          onEdit={() => setCandidateForm({ open: true, editing: detail })}
          onToggleChecklist={handleToggleChecklist}
        />
      );
    }

    switch (active) {
      case "Candidatos":
        return (
          <CandidatesView
            candidates={data.candidates}
            checklistItems={data.checklistItems}
            onOpen={openCandidate}
            onEdit={(candidate) => setCandidateForm({ open: true, editing: candidate })}
            onCreate={() => setCandidateForm({ open: true, editing: null })}
            onDelete={handleDeleteCandidate}
          />
        );
      case "Estratégia":
        return (
          <StrategyView
            candidates={data.candidates}
            items={data.checklistItems}
            voteProjections={data.voteProjections}
            selected={strategyCandidate}
            onSelect={(candidate) => setStrategyCandidateId(candidate?.id ?? null)}
            onToggle={handleToggleChecklist}
            onDelete={handleDeleteChecklistItem}
            onEditItem={(item) => setChecklistForm({ open: true, track: item.category, editing: item })}
            onChangePriority={handleChangeChecklistPriority}
            onChangeCategory={handleChangeChecklistCategory}
            onCreateItem={(track) => setChecklistForm({ open: true, track, editing: null })}
            onAddProjection={() => setShowProjectionForm(true)}
            onDeleteProjection={handleDeleteProjection}
          />
        );
      case "Agenda":
        return (
          <AgendaView
            items={data.calendarItems}
            candidates={data.candidates}
            teamMembers={data.teamMembers}
            onToggle={handleToggleCalendar}
            onDelete={handleDeleteCalendarItem}
            onEdit={(item) => setCalendarForm({ open: true, editing: item })}
            onCreate={() => setCalendarForm({ open: true, editing: null })}
          />
        );
      case "Calendário":
        return (
          <CalendarView
            calendarItems={data.calendarItems}
            productions={data.productions}
            candidates={data.candidates}
            teamMembers={data.teamMembers}
            onCreate={() => setCalendarForm({ open: true, editing: null })}
          />
        );
      case "Produção":
        return (
          <ProductionBoard
            productions={data.productions}
            candidates={data.candidates}
            teamMembers={data.teamMembers}
            onCreate={() => setProductionForm({ open: true, editing: null })}
            onEdit={(production) => setProductionForm({ open: true, editing: production })}
            onMove={handleMoveProduction}
            onDelete={handleDeleteProduction}
          />
        );
      case "Equipe":
        return (
          <TeamView
            members={data.teamMembers}
            productions={data.productions}
            onCreate={() => setTeamForm({ open: true, editing: null })}
            onToggleActive={handleToggleTeamMemberActive}
            onDelete={handleDeleteTeamMember}
            onEdit={(member) => setTeamForm({ open: true, editing: member })}
          />
        );
      default:
        return (
          <div className="content">
            <section className="welcome">
              <div>
                <span>OPERAÇÃO {daysRemaining} DIAS</span>
                <h2>Bom dia, Agência Criando.</h2>
                <p>
                  A campanha está em movimento. Há <b>{stats.criticalPending} pendências críticas</b> que
                  precisam da sua atenção hoje.
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
                  const items = data.checklistItems.filter((item) => item.candidate_id === c.id);
                  const progress = items.length
                    ? Math.round((items.filter((item) => item.completed).length / items.length) * 100)
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
                    </article>
                  );
                })}
                <button
                  className="add-candidate"
                  onClick={() => setCandidateForm({ open: true, editing: null })}
                >
                  ＋ Adicionar candidato
                </button>
              </section>

              <section className="panel agenda">
                <div className="panel-title">
                  <div>
                    <span>PRÓXIMOS DIAS</span>
                    <h3>Agenda da equipe</h3>
                  </div>
                  <button onClick={() => setActive("Agenda")}>Ver agenda →</button>
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
                      <small className={`prio-tag prio-${item.priority}`}>
                        {checklistPriorityLabels[item.priority]}
                        {item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
                      </small>
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
                <button onClick={() => setActive("Candidatos")}>Gerenciar vínculos →</button>
              </section>
            </div>
          </div>
        );
    }
  };

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
              className={active === label && !detail ? "active" : ""}
              onClick={() => {
                setActive(label);
                setDetailId(null);
              }}
            >
              <i>{icon}</i>
              {label}
              {label === "Produção" && stats && stats.inProduction > 0 && <em>{stats.inProduction}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{initialsOf(session.user.email ?? "?")}</div>
          <div>
            <b>{session.user.email}</b>
            <span>{roleLabels[access.member.role] ?? access.member.role}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} title="Sair">
            ⏻
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
            <button className="primary" onClick={() => setCandidateForm({ open: true, editing: null })}>
              ＋ Novo candidato
            </button>
          </div>
        </header>
        {error && (
          <p className="banner-error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </p>
        )}
        {renderWorkspace()}
      </section>

      {candidateForm.open && (
        <CandidateForm
          editing={candidateForm.editing}
          onClose={() => setCandidateForm({ open: false, editing: null })}
          onSave={handleSaveCandidate}
        />
      )}
      {checklistForm.open && data && (
        <ChecklistItemForm
          candidates={data.candidates}
          defaultCandidateId={strategyCandidateId ?? detailId}
          defaultCategory={checklistForm.track}
          editing={checklistForm.editing}
          onClose={() => setChecklistForm((f) => ({ ...f, open: false, editing: null }))}
          onSave={handleSaveChecklistItem}
        />
      )}
      {showProjectionForm && strategyCandidate && (
        <VoteProjectionForm
          candidate={strategyCandidate}
          onClose={() => setShowProjectionForm(false)}
          onSave={handleSaveProjection}
        />
      )}
      {calendarForm.open && data && (
        <CalendarItemForm
          candidates={data.candidates}
          teamMembers={data.teamMembers}
          editing={calendarForm.editing}
          onClose={() => setCalendarForm({ open: false, editing: null })}
          onSave={handleSaveCalendarItem}
        />
      )}
      {productionForm.open && data && (
        <ProductionForm
          candidates={data.candidates}
          teamMembers={data.teamMembers}
          editing={productionForm.editing}
          onClose={() => setProductionForm({ open: false, editing: null })}
          onSave={handleSaveProduction}
        />
      )}
      {teamForm.open && (
        <TeamMemberForm
          editing={teamForm.editing}
          onClose={() => setTeamForm({ open: false, editing: null })}
          onSave={handleSaveTeamMember}
        />
      )}
    </main>
  );
}
