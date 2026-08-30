import { supabase } from "./supabase";
import type {
  AgencyMember,
  CalendarItem,
  CalendarKind,
  Candidate,
  ChecklistCategory,
  ChecklistItem,
  ChecklistPriority,
  DoubledCampaign,
  Office,
  Production,
  ProductionStatus,
  TeamMember,
  TeamRole,
  VoteProjection,
} from "./types";

export type DashboardData = {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  calendarItems: CalendarItem[];
  productions: Production[];
  doubledCampaigns: DoubledCampaign[];
  teamMembers: TeamMember[];
  voteProjections: VoteProjection[];
};

/**
 * Uma requisição pendurada deixaria a tela presa no "carregando" para sempre,
 * então toda chamada ao Supabase falha explicitamente depois de um tempo.
 */
async function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: o servidor não respondeu a tempo. Verifique sua conexão.`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function fetchAgencyMembership(userId: string): Promise<AgencyMember | null> {
  const { data, error } = await withTimeout(
    supabase.from("agency_members").select("*").eq("auth_user_id", userId).maybeSingle(),
    "Verificação de acesso",
  );
  if (error) throw error;
  return data;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [
    candidates,
    checklistItems,
    calendarItems,
    productions,
    doubledCampaigns,
    teamMembers,
    voteProjections,
  ] = await withTimeout(
    Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: true }),
      supabase.from("checklist_items").select("*").order("due_date", { ascending: true }),
      supabase.from("calendar_items").select("*").order("starts_at", { ascending: true }),
      supabase.from("productions").select("*").order("due_at", { ascending: true }),
      supabase.from("doubled_campaigns").select("*").order("created_at", { ascending: true }),
      supabase.from("team_members").select("*").order("name", { ascending: true }),
      supabase.from("vote_projections").select("*").order("projected_votes", { ascending: false }),
    ]),
    "Carregamento dos dados",
  );

  for (const result of [
    candidates,
    checklistItems,
    calendarItems,
    productions,
    doubledCampaigns,
    teamMembers,
    voteProjections,
  ]) {
    if (result.error) throw result.error;
  }

  return {
    candidates: candidates.data ?? [],
    checklistItems: checklistItems.data ?? [],
    calendarItems: calendarItems.data ?? [],
    productions: productions.data ?? [],
    doubledCampaigns: doubledCampaigns.data ?? [],
    teamMembers: teamMembers.data ?? [],
    voteProjections: voteProjections.data ?? [],
  };
}

/* ---------------------------------------------------------------- candidatos */

export type CandidateInput = {
  name: string;
  electoral_number: string | null;
  office: Office;
  party: string | null;
  investment_amount: number | null;
  investment_source: string | null;
  city: string | null;
  regions: string | null;
  vote_projection: string | null;
  candidate_team: string | null;
  drive_folder_url: string | null;
};

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from("candidates").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCandidate(id: number, input: CandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from("candidates").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/**
 * O banco apaga em cascata: checklist, agenda, produções e dobradas do
 * candidato somem junto. Confirme com o usuário antes de chamar.
 */
export async function deleteCandidate(id: number) {
  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) throw error;
}

/* ----------------------------------------------------------------- checklist */

export type NewChecklistItemInput = {
  candidate_id: number;
  category: ChecklistCategory;
  title: string;
  label: string | null;
  due_date: string | null;
  priority: ChecklistPriority;
};

export async function createChecklistItem(input: NewChecklistItemInput): Promise<ChecklistItem> {
  const { data, error } = await supabase.from("checklist_items").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateChecklistItem(
  id: number,
  input: Omit<NewChecklistItemInput, "candidate_id">,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("checklist_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setChecklistItemCompleted(id: number, completed: boolean) {
  const { error } = await supabase.from("checklist_items").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function setChecklistItemPriority(id: number, priority: ChecklistPriority) {
  const { error } = await supabase.from("checklist_items").update({ priority }).eq("id", id);
  if (error) throw error;
}

export async function setChecklistItemCategory(id: number, category: ChecklistCategory) {
  const { error } = await supabase.from("checklist_items").update({ category }).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: number) {
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------------------------------------------- agenda */

export type NewCalendarItemInput = {
  candidate_id: number;
  title: string;
  kind: CalendarKind;
  starts_at: string;
  due_at: string | null;
  assignee_id: number | null;
};

export async function createCalendarItem(input: NewCalendarItemInput): Promise<CalendarItem> {
  const { data, error } = await supabase.from("calendar_items").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCalendarItem(
  id: number,
  input: Omit<NewCalendarItemInput, "candidate_id">,
): Promise<CalendarItem> {
  const { data, error } = await supabase
    .from("calendar_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setCalendarItemCompleted(id: number, completed: boolean) {
  const { error } = await supabase.from("calendar_items").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function deleteCalendarItem(id: number) {
  const { error } = await supabase.from("calendar_items").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ produção */

export type NewProductionInput = {
  candidate_id: number;
  title: string;
  format: string;
  status: ProductionStatus;
  due_at: string | null;
  drive_file_url: string | null;
  notes: string | null;
  assignee_id: number | null;
};

export async function createProduction(input: NewProductionInput): Promise<Production> {
  const { data, error } = await supabase.from("productions").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduction(
  id: number,
  patch: Partial<NewProductionInput>,
): Promise<Production> {
  const { data, error } = await supabase.from("productions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduction(id: number) {
  const { error } = await supabase.from("productions").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------- equipe */

export type NewTeamMemberInput = {
  name: string;
  email: string;
  role: TeamRole;
  active: boolean;
};

export async function createTeamMember(input: NewTeamMemberInput): Promise<TeamMember> {
  const { data, error } = await supabase.from("team_members").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateTeamMember(
  id: number,
  input: Omit<NewTeamMemberInput, "active">,
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from("team_members")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTeamMemberActive(id: number, active: boolean) {
  const { error } = await supabase.from("team_members").update({ active }).eq("id", id);
  if (error) throw error;
}

/**
 * Peças e eventos atribuídos a esta pessoa não são apagados: o banco apenas
 * zera o responsável (`on delete set null`).
 */
export async function deleteTeamMember(id: number) {
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------------------------------- projeção de votos */

export type VoteProjectionInput = {
  candidate_id: number;
  region: string;
  projected_votes: number;
};

/** Regravar a mesma região substitui o valor, em vez de duplicar a fatia. */
export async function upsertVoteProjection(input: VoteProjectionInput): Promise<VoteProjection> {
  const { data, error } = await supabase
    .from("vote_projections")
    .upsert(input, { onConflict: "candidate_id,region" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVoteProjection(id: number) {
  const { error } = await supabase.from("vote_projections").delete().eq("id", id);
  if (error) throw error;
}
