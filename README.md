# Sonorum

Plataforma de gestão para escolas de música. Migração de Laravel/Inertia → **Next.js 16 + Supabase + Vercel** (ver `SONORUM_MIGRATION.md` no repo Laravel original).

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres + RLS) · Cloudflare R2 · Resend · Deploy na Vercel.

---

## Setup

### 1. Dependências

```bash
npm install
```

### 2. Projeto Supabase (sa-east-1 / São Paulo)

No dashboard do Supabase, crie um projeto na região **South America (São Paulo)** e aplique **todos os arquivos de `supabase/migrations/`, em ordem numérica**, até a migration mais recente do repositório. Não pare em `0003`: as migrations posteriores incluem políticas de storage, membership Solo, webhooks e permissões por coluna necessárias pela aplicação.

Depois, **ative o hook**: Authentication → Hooks → *Custom Access Token* → selecione `public.custom_access_token_hook`. Sem isso, `role` e `school_id` não entram no JWT e o roteamento por papel não funciona.

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as keys do projeto (Settings → API): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`, `NEXT_PUBLIC_APP_URL`, além dos provedores que serão usados. Em produção, defina `PAYMENTS_PROVIDER=mercadopago` ou `PAYMENTS_PROVIDER=asaas` e configure as credenciais e segredo do webhook correspondentes. O provider `mock` é apenas para desenvolvimento.

### 4. Tipos do banco

```bash
npm run types:gen   # sobrescreve lib/types/database.ts (stub) com os tipos reais
```

### 5. Rodar

```bash
npm run dev   # http://localhost:3100
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
| Vencimento do plano | Recursos e limites gratuitos após `expiration_date`; dados existentes são preservados |

`role` e `school_id` ficam em **`app_metadata`** (só service-role escreve) → sem escalonamento de privilégio pelo cliente.

---

## Estado deste checkout

- Os fluxos de Super Admin, Admin, Professor e Aluno, agenda, conteúdo, financeiro, assinaturas e integrações estão implementados no app; consulte `docs/roteiro-fluxos-lancamento.md` para o estado por jornada e pendências externas.
- `npm run lint` e `npm run build` passaram localmente em 2026-10-23. Isso não valida o runtime do Supabase, gateways, envio de e-mail, Google Calendar ou deploy.
- A captura mais recente confirmou `true` nos checks SQL do Auth Hook e das migrations `0031`–`0035`. O próximo passo é ativar `public.custom_access_token_hook` em Authentication → Auth Hooks (Beta) → Custom Access Token e validar os claims em uma sessão nova.
- Não haverá staging por enquanto. O `.env.local` aponta para um Supabase hospedado sem identificação de ambiente; os scripts `scripts/smoke-*.mjs` criam e removem dados e não devem ser executados até confirmar o destino.
