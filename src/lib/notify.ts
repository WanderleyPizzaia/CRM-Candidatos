import type { CalendarItem, Candidate, Production, TeamMember } from "./types";
import {
  calendarKindLabels,
  formatDateTime,
  productionStatusLabels,
  roleLabels,
} from "./format";

export type PendingNotice = {
  member: TeamMember;
  message: string;
  /** Título curto para o cabeçalho do aviso na tela. */
  subject: string;
};

const HEADER = "*AGÊNCIA CRIANDO — NOVA DEMANDA*";
const FOOTER = "Confirme o recebimento por aqui. 🙏";

function line(label: string, value: string | null | undefined) {
  return value ? `*${label}:* ${value}` : null;
}

export function buildProductionMessage(
  production: Production,
  candidate: Candidate | undefined,
  member: TeamMember,
): string {
  const parts = [
    HEADER,
    "",
    `Olá, ${member.name.split(" ")[0]}! Você foi definido como responsável por esta peça:`,
    "",
    line("Peça", production.title),
    line("Candidato", candidate?.name),
    line("Formato", production.format),
    line("Etapa", productionStatusLabels[production.status]),
    line("Prazo", production.due_at ? formatDateTime(production.due_at) : "sem prazo definido"),
    line("Sua função", roleLabels[member.role] ?? member.role),
    production.notes ? `\n*Observações:* ${production.notes}` : null,
    production.drive_file_url ? `\n*Arquivo no Drive:* ${production.drive_file_url}` : null,
    "",
    FOOTER,
  ];
  return parts.filter((p) => p !== null).join("\n");
}

export function buildCalendarMessage(
  item: CalendarItem,
  candidate: Candidate | undefined,
  member: TeamMember,
): string {
  const parts = [
    HEADER,
    "",
    `Olá, ${member.name.split(" ")[0]}! Você ficou responsável por este compromisso:`,
    "",
    line("Compromisso", item.title),
    line("Candidato", candidate?.name),
    line("Tipo", calendarKindLabels[item.kind]),
    line("Quando", formatDateTime(item.starts_at)),
    line("Prazo", item.due_at ? formatDateTime(item.due_at) : null),
    "",
    FOOTER,
  ];
  return parts.filter((p) => p !== null).join("\n");
}
