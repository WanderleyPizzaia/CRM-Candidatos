import { supabase } from "./supabase";
import type {
  AgencyMember,
  CalendarItem,
  Candidate,
  ChecklistItem,
  DoubledCampaign,
  Office,
  Production,
  TeamMember,
} from "./types";

export type DashboardData = {
  candidates: Candidate[];
  checklistItems: ChecklistItem[];
  calendarItems: CalendarItem[];
  productions: Production[];
  doubledCampaigns: DoubledCampaign[];
  teamMembers: TeamMember[];
};

export async function fetchAgencyMembership(userId: string): Promise<AgencyMember | null> {
  const { data, error } = await supabase
    .from("agency_members")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [candidates, checklistItems, calendarItems, productions, doubledCampaigns, teamMembers] =
    await Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: true }),
      supabase.from("checklist_items").select("*").order("due_date", { ascending: true }),
      supabase.from("calendar_items").select("*").order("starts_at", { ascending: true }),
      supabase.from("productions").select("*").order("due_at", { ascending: true }),
      supabase.from("doubled_campaigns").select("*").order("created_at", { ascending: true }),
      supabase.from("team_members").select("*").order("name", { ascending: true }),
    ]);

  for (const result of [
    candidates,
    checklistItems,
    calendarItems,
    productions,
    doubledCampaigns,
    teamMembers,
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
  };
}

export type NewCandidateInput = {
  name: string;
  electoral_number: string | null;
  office: Office;
  investment_amount: number | null;
  investment_source: string | null;
  city: string | null;
  regions: string | null;
  vote_projection: string | null;
  candidate_team: string | null;
};

export async function createCandidate(input: NewCandidateInput): Promise<Candidate> {
  const { data, error } = await supabase.from("candidates").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setChecklistItemCompleted(id: number, completed: boolean) {
  const { error } = await supabase.from("checklist_items").update({ completed }).eq("id", id);
  if (error) throw error;
}

export async function setCalendarItemCompleted(id: number, completed: boolean) {
  const { error } = await supabase.from("calendar_items").update({ completed }).eq("id", id);
  if (error) throw error;
}
