import { useState } from "react";
import type { Production, TeamMember, TeamRole } from "../lib/types";
import type { NewTeamMemberInput } from "../lib/api";
import { colorFor, initialsOf, roleLabels, teamRoles } from "../lib/format";
import { Field, Modal, SelectField, ViewHeader, useSaveHandler } from "./ui";

export function TeamMemberForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: NewTeamMemberInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "designer" as TeamRole });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.name.trim()) return "Informe o nome.";
      if (!form.email.trim()) return "Informe o e-mail.";
      return null;
    },
    () =>
      onSave({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        active: true,
      }),
  );

  return (
    <Modal
      eyebrow="NOVO MEMBRO"
      title="Adicionar à equipe"
      subtitle="A função define o que a pessoa faz nas peças de produção."
      error={error}
      saving={saving}
      saveLabel="Adicionar membro"
      onSave={submit}
      onClose={onClose}
    >
      <Field label="Nome" name="name" value={form.name} onChange={change} placeholder="Nome completo" />
      <Field
        label="E-mail"
        name="email"
        type="email"
        value={form.email}
        onChange={change}
        placeholder="nome@agenciacriando.com.br"
      />
      <SelectField label="Função" value={form.role} onChange={(v) => change("role", v)}>
        {teamRoles.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </SelectField>
    </Modal>
  );
}

export function TeamView({
  members,
  productions,
  onCreate,
  onToggleActive,
  onDelete,
}: {
  members: TeamMember[];
  productions: Production[];
  onCreate: () => void;
  onToggleActive: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}) {
  return (
    <div className="content">
      <ViewHeader title="Equipe da agência" actionLabel="＋ Adicionar membro" onAction={onCreate} />
      <section className="panel list-panel">
        {members.length ? (
          members.map((member, index) => {
            const assigned = productions.filter((p) => p.assignee_id === member.id);
            const open = assigned.filter((p) => p.status !== "published" && p.status !== "approved").length;
            return (
              <div className="list-row" key={member.id}>
                <div className={`candidate-avatar ${colorFor(index)}`}>{initialsOf(member.name)}</div>
                <div className="grow">
                  <b>{member.name}</b>
                  <span>
                    {member.email} · {roleLabels[member.role] ?? member.role}
                  </span>
                </div>
                <div className="member-load">
                  <strong>{open}</strong>
                  <span>em aberto</span>
                </div>
                <span className={`pill ${member.active ? "" : "inactive"}`}>
                  {member.active ? "Ativo" : "Inativo"}
                </span>
                <button className="secondary small" onClick={() => onToggleActive(member)}>
                  {member.active ? "Desativar" : "Ativar"}
                </button>
                <button className="danger small" onClick={() => onDelete(member)} title="Excluir membro">
                  Excluir
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty">Nenhum membro cadastrado ainda.</p>
        )}
      </section>
    </div>
  );
}
