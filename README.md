# CRM Agência Criando

CRM de gestão política para agências, construído em React + Vite e conectado ao
Supabase (Postgres + Auth). Já vem preenchido com dados de exemplo (3
candidatos, checklist, agenda, produções e dobradas) para você editar.

## Stack

- React 19 + Vite (SPA, sem framework de servidor)
- Supabase (`@supabase/supabase-js`) para banco de dados e autenticação
- Deploy estático (Netlify)

## Configuração local

1. Copie `.env.example` para `.env.local` e confira as chaves do Supabase:
   ```bash
   cp .env.example .env.local
   ```
2. Instale as dependências e rode o servidor de desenvolvimento:
   ```bash
   npm install
   npm run dev
   ```
3. Acesse `http://localhost:5173` e faça login com uma conta cadastrada em
   `agency_members`.

## Banco de dados (Supabase)

Projeto: `qajqsffyxhixfotfbogb` (`crm-eleitoral-11222`).

Tabelas (schema em `supabase/migrations/`):

- `agency_members` — usuários autorizados a acessar o CRM (vinculados a
  `auth.users`)
- `team_members` — membros da equipe da agência
- `candidates` — candidatos/clientes da agência
- `checklist_items` — documentos e itens de estratégia por candidato
- `calendar_items` — agenda/eventos por candidato
- `productions` — peças de conteúdo em produção
- `doubled_campaigns` — parcerias/dobradas por candidato

Todas as tabelas têm RLS ativo: só usuários presentes em `agency_members`
conseguem ler ou escrever.

Para liberar acesso a uma nova pessoa da agência, ela precisa: (1) ter uma
conta no Supabase Auth deste projeto e (2) ter uma linha em
`agency_members` com o `auth_user_id` dela.

## Build

```bash
npm run build
```

Gera os arquivos estáticos em `dist/`.

## Deploy

Veja [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md).
