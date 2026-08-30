export type Office = "Deputado Federal" | "Deputado Estadual";
export type CandidateStatus = "active" | "paused" | "closed";
export type ChecklistCategory =
  | "ground"
  | "digital"
  | "document"
  | "electoral_requirement"
  /** Itens criados antes da separação chão/internet. */
  | "strategy";
export type ChecklistPriority = "alta" | "media" | "baixa";
export type CalendarKind = "agenda" | "content" | "deadline" | "recording";
export type ProductionStatus =
  | "briefing"
  | "production"
  | "approval"
  | "changes"
  | "approved"
  | "published";
export type TeamRole = "admin" | "designer" | "editor_filmmaker";

export type Candidate = {
  id: number;
  name: string;
  electoral_number: string | null;
  office: Office;
  party: string | null;
  city: string | null;
  state: string | null;
  investment_amount: number | null;
  investment_source: string | null;
  regions: string | null;
  vote_projection: string | null;
  candidate_team: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  status: CandidateStatus;
  created_at: string;
};

export type ChecklistItem = {
  id: number;
  candidate_id: number;
  category: ChecklistCategory;
  title: string;
  label: string | null;
  due_date: string | null;
  completed: boolean;
  priority: ChecklistPriority;
  created_at: string;
};

export type CalendarItem = {
  id: number;
  candidate_id: number;
  title: string;
  kind: CalendarKind;
  starts_at: string;
  due_at: string | null;
  completed: boolean;
  assignee_id: number | null;
  created_at: string;
};

export type Production = {
  id: number;
  candidate_id: number;
  title: string;
  format: string;
  status: ProductionStatus;
  due_at: string | null;
  drive_file_url: string | null;
  reference_image_url: string | null;
  notes: string | null;
  assignee_id: number | null;
  created_at: string;
};

export type DoubledCampaign = {
  id: number;
  candidate_id: number;
  title: string;
  partner_name: string | null;
  region: string | null;
  drive_folder_url: string | null;
  notes: string | null;
  created_at: string;
};

export type TeamMember = {
  id: number;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: TeamRole;
  active: boolean;
  created_at: string;
};

export type AgencyMember = {
  auth_user_id: string;
  role: TeamRole;
  created_at: string;
};

export type VoteProjection = {
  id: number;
  candidate_id: number;
  region: string;
  projected_votes: number;
  created_at: string;
};
