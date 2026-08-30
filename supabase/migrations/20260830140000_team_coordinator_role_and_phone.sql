-- Coordenador entra como cargo. As duas tabelas usam a mesma lista de papéis,
-- então as duas mudam juntas para não divergirem.
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin','coordinator','designer','editor_filmmaker'));

alter table public.agency_members drop constraint if exists agency_members_role_check;
alter table public.agency_members add constraint agency_members_role_check
  check (role in ('admin','coordinator','designer','editor_filmmaker'));

-- Telefone alimenta o atalho de WhatsApp na tela de Equipe.
alter table public.team_members add column if not exists phone text;

comment on column public.team_members.phone is 'Telefone com DDD. Usado para montar o link wa.me do atalho de WhatsApp.';
