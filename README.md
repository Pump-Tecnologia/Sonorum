# Sonorum

Plataforma de gestão para escolas de música. Migração de Laravel/Inertia → **Next.js 16 + Supabase + Vercel** (ver `SONORUM_MIGRATION.md` no repo Laravel original).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres + RLS) · Cloudflare R2 · Resend · Deploy na Vercel.

---

## ⚠️ Caminho com acento + Turbopack

O Turbopack do Next 16 dá panic quando o caminho do projeto contém caracteres não-ASCII (este projeto vive em `.../Projetos de Código/`, com o `ó`). Por isso os scripts locais usam **webpack** (`next dev --webpack` / `next build --webpack`).

- **Na Vercel o caminho é ASCII**, então o build padrão (Turbopack) funciona normalmente lá — sem mudança necessária.
- Para reativar o Turbopack localmente, mova o repo para um caminho sem acentos (ex.: `~/dev/sonorum-app`) e remova os `--webpack` dos scripts.

---

## Setup

### 1. Dependências

```bash
npm install
```

### 2. Projeto Supabase (sa-east-1 / São Paulo)

No dashboard do Supabase, crie um projeto novo na região **South America (São Paulo)** e rode, na ordem, no SQL Editor:

1. `supabase/migrations/0001_schema.sql` — tabelas + índices
2. `supabase/migrations/0002_rls.sql` — Row Level Security (substitui os middlewares de tenant/role do Laravel)
3. `supabase/migrations/0003_auth_hook.sql` — sync `auth.users` → `public.users` + Custom Access Token Hook

Depois, **ative o hook**: Authentication → Hooks → *Custom Access Token* → selecione `public.custom_access_token_hook`. Sem isso, `role` e `school_id` não entram no JWT e o roteamento por papel não funciona.

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as keys do projeto novo (Settings → API): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`, além de R2, Resend e WhatsApp.

### 4. Tipos do banco

```bash
npm run types:gen   # sobrescreve lib/types/database.ts (stub) com os tipos reais
```

### 5. Rodar

```bash
npm run dev   # http://localhost:3000
```

---

## Arquitetura

```
app/
  (marketing)/      → landing pública (sonorum.com.br)
  (auth)/           → login, register, forgot-password, reset-password
  (app)/            → área autenticada (app.sonorum.com.br)
    superadmin/ admin/ teacher/ student/ dashboard/
  auth/callback/    → troca code→sessão (confirmação de e-mail, reset)
components/
  ui/ auth/ app/    → primitivas e componentes de negócio
lib/
  supabase/         → client (browser), server (RSC/actions), middleware (proxy), createAdminClient
  auth/             → server actions, schemas zod, sessão (getCurrentUser)
  constants/        → roles, nav
  types/            → database (gerado) + app (curados)
proxy.ts            → auth + roteamento por papel na borda
supabase/migrations → schema, RLS, auth hook
```

### Segurança (substitui o Laravel)

| Laravel | Aqui |
|---|---|
| Sessões PHP | Supabase Auth (JWT em cookie httpOnly via `@supabase/ssr`) |
| `TenantScope` / `BelongsToSchool` | RLS por `school_id` em cada tabela |
| Middlewares de role | RLS + roteamento por papel no `proxy.ts` |
| `EnsureSchoolIsActive` | (a aplicar nas policies — ver TODO) |

`role` e `school_id` ficam em **`app_metadata`** (só service-role escreve) → sem escalonamento de privilégio pelo cliente.

---

## Status da migração

- ✅ **Fase 1** — Setup, clients Supabase, proxy, schema, RLS, auth hook
- ✅ **Fase 2** — Auth (login, registro com criação de escola, reset de senha)
- ✅ **Fase 3** — Layouts (marketing, shell autenticado com sidebar por papel)
- ⬜ Fases 4–10 — SuperAdmin, Admin, Agenda, Teacher/Student, Financeiro, LP completa, deploy e migração de dados
