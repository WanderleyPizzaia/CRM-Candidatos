alter table public.checklist_items
  add column if not exists priority text not null default 'media'
  check (priority in ('alta','media','baixa'));

comment on column public.checklist_items.priority is 'Prioridade do item: alta, media ou baixa. Ordena o checklist na tela de Estratégia.';
