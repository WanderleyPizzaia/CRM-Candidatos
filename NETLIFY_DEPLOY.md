# Deploy do CRM na Netlify

O projeto foi convertido de vinext/Cloudflare Workers para um SPA padrão em
React + Vite, então a Netlify consegue hospedá-lo diretamente como site
estático (sem precisar de runtime especial). O `netlify.toml` na raiz já
define o build.

## Passo a passo

1. Suba este projeto para um repositório no GitHub (privado, se preferir).
2. No Netlify, clique em **Add new site → Import an existing project**.
3. Selecione o repositório. O Netlify deve detectar automaticamente o
   `netlify.toml`, com:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Em **Site settings → Environment variables**, adicione:
   - `VITE_SUPABASE_URL=https://qajqsffyxhixfotfbogb.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=<chave publishable, ver .env.example>`
5. Faça o deploy.
6. No Supabase, garanta que todo usuário que vai logar no CRM tenha uma linha
   em `agency_members` (veja o README).
7. Teste no site publicado: login, listagem de candidatos, cadastro de novo
   candidato, marcar itens de checklist/agenda como concluídos, e acesso
   negado para um usuário sem `agency_members`.

## Banco Supabase

Projeto `qajqsffyxhixfotfbogb` (`crm-eleitoral-11222`), com RLS ativado nas
tabelas: `agency_members`, `team_members`, `candidates`, `checklist_items`,
`calendar_items`, `productions` e `doubled_campaigns`.

Apenas a chave **publishable/anon** fica no navegador. Nunca coloque a chave
`service_role` no frontend ou em variáveis `VITE_*` (tudo que começa com
`VITE_` é exposto no bundle público).
