import type {
  CalendarKind,
  ChecklistCategory,
  ChecklistPriority,
  ProductionStatus,
  TeamRole,
} from "./types";

export const ELECTION_DEADLINE = new Date("2026-09-30T23:59:59-03:00");

export const avatarColors = ["coral", "blue", "gold"] as const;

export const roleLabels: Record<TeamRole, string> = {
  admin: "Administrador",
  designer: "Designer",
  editor_filmmaker: "Editor/Filmmaker",
};
export const teamRoles: TeamRole[] = ["admin", "designer", "editor_filmmaker"];

export const calendarKindLabels: Record<CalendarKind, string> = {
  agenda: "Agenda",
  content: "Conteúdo",
  deadline: "Prazo",
  recording: "Gravação",
};
export const calendarKinds: CalendarKind[] = ["agenda", "content", "deadline", "recording"];

export const checklistCategoryLabels: Record<ChecklistCategory, string> = {
  document: "Documento",
  electoral_requirement: "Exigência eleitoral",
  strategy: "Estratégia",
};
export const checklistCategories: ChecklistCategory[] = [
  "strategy",
  "document",
  "electoral_requirement",
];

export const checklistPriorityLabels: Record<ChecklistPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
/** Da mais urgente para a menos — é esta a ordem em que o checklist é exibido. */
export const checklistPriorities: ChecklistPriority[] = ["alta", "media", "baixa"];

export function priorityRank(priority: ChecklistPriority) {
  const rank = checklistPriorities.indexOf(priority);
  return rank === -1 ? checklistPriorities.length : rank;
}

export const productionStatusLabels: Record<ProductionStatus, string> = {
  briefing: "Briefing",
  production: "Produção",
  approval: "Aprovação",
  changes: "Ajustes",
  approved: "Aprovado",
  published: "Publicado",
};
export const productionStatuses: ProductionStatus[] = [
  "briefing",
  "production",
  "approval",
  "changes",
  "approved",
  "published",
];

export function initialsOf(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "NC";
}

export function colorFor(index: number) {
  return avatarColors[Math.abs(index) % avatarColors.length];
}

export function formatCurrency(value: number | null) {
  if (value === null) return "Não informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseCurrencyInput(value: string): number | null {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();
}

export function formatDate(value: string | null) {
  if (!value) return null;
  // Datas puras (YYYY-MM-DD) viram UTC no construtor e voltam um dia atrás no
  // fuso do Brasil, então são formatadas manualmente.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (dateOnly) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Converte um timestamp do banco para o formato aceito por `<input type="datetime-local">`. */
export function toDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function isOverdue(value: string | null, completed: boolean) {
  if (!value || completed) return false;
  return new Date(value) < new Date();
}
