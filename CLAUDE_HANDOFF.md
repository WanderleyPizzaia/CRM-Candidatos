# Handoff — Agência Criando CRM

## O que já está pronto

- App convertido de vinext/Cloudflare Workers para SPA React + Vite (build
  estático, pronto para Netlify).
- Supabase conectado via `@supabase/supabase-js` (`src/lib/supabase.ts`).
- Schema aplicado no projeto `qajqsffyxhixfotfbogb`
  (`supabase/migrations/20260819173853_create_agency_crm_schema.sql`), com
  RLS ativo em todas as tabelas.
- Banco populado com dados de exemplo: 3 candidatos, 7 membros de equipe,
  13 itens de checklist, 4 itens de agenda, 7 produções e 4 dobradas.
- Login com Supabase Auth (`src/components/Login.tsx`) + verificação de
  `agency_members` antes de liberar o dashboard.
- Dashboard (visão geral) lendo dados reais: candidatos, estatísticas,
  agenda, checklist prioritário.
- Ficha do candidato lendo checklist, produções e dobradas reais do banco.
- Cadastro de novo candidato grava direto na tabela `candidates`.
- Marcar item de checklist/agenda como concluído grava no banco.

## O que falta finalizar

1. As abas "Candidatos", "Estratégia", "Agenda", "Calendário", "Produção" e
   "Equipe" do menu lateral ainda só trocam o título do cabeçalho — o
   conteúdo continua sendo o dashboard. Falta construir uma view dedicada
   para cada uma.
2. Edição de candidato existente (o botão "Editar ficha" ainda não grava).
3. Criar produção e dobrada pela UI (hoje só existem via seed/SQL).
4. Tela de administração de membros da equipe (`team_members`) e de acesso
   (`agency_members`).
5. Upload/vínculo real com Google Drive (`drive_folder_url` já existe na
   tabela `candidates`, mas não há UI para editá-lo).

## Acesso

- Projeto Supabase: `qajqsffyxhixfotfbogb`
- URL: `https://qajqsffyxhixfotfbogb.supabase.co`
- Login de exemplo: sua conta `wancrente@hotmail.com` já está em
  `agency_members` com papel `admin` (mesma senha que você já usa nesse
  projeto Supabase, reaproveitada da campanha Alisson).

Depois de qualquer alteração, testar: login, cadastro de candidato, edição,
atualização de status e acesso de usuário não autorizado.
