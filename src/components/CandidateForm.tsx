import { useState } from "react";
import type { Candidate, Office } from "../lib/types";
import type { CandidateInput } from "../lib/api";
import { parseCurrencyInput } from "../lib/format";
import { Field, Modal, SelectField, TextAreaField, useSaveHandler } from "./ui";

export function CandidateForm({
  editing,
  onClose,
  onSave,
}: {
  editing: Candidate | null;
  onClose: () => void;
  onSave: (input: CandidateInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    electoral_number: editing?.electoral_number ?? "",
    office: (editing?.office ?? "Deputado Estadual") as Office,
    party: editing?.party ?? "",
    investment_amount: editing && editing.investment_amount !== null ? String(editing.investment_amount) : "",
    investment_source: editing?.investment_source ?? "",
    city: editing?.city ?? "",
    regions: editing?.regions ?? "",
    vote_projection: editing?.vote_projection ?? "",
    candidate_team: editing?.candidate_team ?? "",
    drive_folder_url: editing?.drive_folder_url ?? "",
  });
  const change = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }) as typeof f);

  const { error, saving, submit } = useSaveHandler(
    () => {
      if (!form.name.trim()) return "Informe o nome do candidato.";
      const url = form.drive_folder_url.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return "O link do Drive precisa começar com https://";
      }
      return null;
    },
    () =>
      onSave({
        name: form.name.trim(),
        electoral_number: form.electoral_number.trim() || null,
        office: form.office,
        party: form.party.trim() || null,
        investment_amount: parseCurrencyInput(form.investment_amount),
        investment_source: form.investment_source.trim() || null,
        city: form.city.trim() || null,
        regions: form.regions.trim() || null,
        vote_projection: form.vote_projection.trim() || null,
        candidate_team: form.candidate_team.trim() || null,
        drive_folder_url: form.drive_folder_url.trim() || null,
      }),
  );

  return (
    <Modal
      eyebrow={editing ? "EDIÇÃO" : "NOVO CADASTRO"}
      title={editing ? "Editar candidato" : "Cadastrar candidato"}
      subtitle="Preencha os dados operacionais da campanha."
      error={error}
      saving={saving}
      saveLabel={editing ? "Salvar alterações" : "Salvar candidato"}
      onSave={submit}
      onClose={onClose}
    >
      <Field label="Nome do candidato" name="name" value={form.name} onChange={change} placeholder="Nome completo" />
      <Field
        label="Número do candidato"
        name="electoral_number"
        value={form.electoral_number}
        onChange={change}
        placeholder="Ex.: 40123"
      />
      <SelectField label="Cargo" value={form.office} onChange={(v) => change("office", v)}>
        <option>Deputado Estadual</option>
        <option>Deputado Federal</option>
      </SelectField>
      <Field label="Partido" name="party" value={form.party} onChange={change} placeholder="Ex.: PSB" />
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
      <Field
        label="Link da pasta no Google Drive"
        name="drive_folder_url"
        value={form.drive_folder_url}
        onChange={change}
        placeholder="https://drive.google.com/drive/folders/..."
        full
      />
      <TextAreaField
        label="Membros da equipe do candidato"
        value={form.candidate_team}
        onChange={(v) => change("candidate_team", v)}
        placeholder="Nome e função, separados por vírgula"
      />
    </Modal>
  );
}
