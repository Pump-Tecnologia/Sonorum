# Relatório Técnico: Módulo Financeiro, Asaas e Carência de 5 Dias

**Data:** 11/11/2026  
**Responsável Técnico:** Davi / Sonorum  
**Contexto:** Sonorum App (Next.js 15, React 19, Supabase, Asaas Gateway)  

---

## 1. Resumo Executivo das Implementações

1. **Desativação do Módulo Financeiro nos Planos Gratuitos**:
   - `free` (Essencial): `financial: false`.
   - `solo_free` (Solo Essencial): `financial: false`.
   - Planos pagos (`solo`, `solo_pro`, `professional`, `premium`, `enterprise`): `financial: true`.

2. **Período de Carência de 5 Dias (`GRACE_PERIOD_DAYS = 5`)**:
   - Quando a assinatura de uma escola ou professor solo vence (`today > expirationDate`), o sistema não corta imediatamente os serviços.
   - Durante os **5 dias de carência** (`today <= expirationDate + 5 dias`):
     - Todos os recursos do plano pago permanecem ativos (`effectivePlanFeatures` mantém o plano contratado).
     - Um banner superior de alerta (`GracePeriodBanner`) é exibido para os administradores informando a data de vencimento e a contagem regressiva de dias de carência ("X dias restantes para regularizar").
   - Apenas no **6º dia** (`isPlanGraceExpired`):
     - A escola é rebaixada para o plano gratuito equivalente (`free` ou `solo_free`).
     - O módulo financeiro é bloqueado e o banner passa a indicar expiração definitiva com CTA para reativação.

3. **Telas de Bloqueio Alinhadas e Amigáveis (In-place Lock Screen)**:
   - Removidos os redirecionamentos silenciosos ou abruptos (`redirect('/upgrade')`).
   - "Planos" e "Financeiro" continuam permanentemente visíveis na barra lateral para os administradores.
   - Ao acessar `/financial` ou `/plans` sem ter o módulo financeiro ativo (seja por estar no plano gratuito ou por ter expirado após o período de carência):
     - O cabeçalho da página é mantido.
     - É renderizado o componente `LockedFeatureCard` detalhando:
       - Título e proposta de valor do recurso.
       - Lista de benefícios (Pix/Boleto automáticos Asaas, baixa via webhook, notificações por WhatsApp/E-mail, métricas de inadimplência, flexibilidade de descontos).
       - Badge de status (Recurso Exclusivo / Carência / Assinatura Expirada).
       - CTA claro direcionando para `/upgrade`.
   - Na página de criação de plano (`/plans/new`), tentativas de acesso direto sem o módulo financeiro redirecionam para `/plans`, exibindo a tela explicativa.
   - No perfil do aluno (`/admin/students/[id]`), o card de matrícula bloqueada foi atualizado para apontar para os planos Solo ou Profissional.

4. **Eliminação Integral do Mercado Pago e Consolidação no Asaas**:
   - O Asaas é o único motor de pagamento tanto para o billing SaaS (escola → Sonorum) quanto para a infraestrutura de cobrança de alunos via subcontas.
   - Webhook único no Asaas `/api/webhooks/asaas` processando:
     - Pagamentos avulsos de planos SaaS (`reconcilePayment`).
     - Assinaturas recorrentes SaaS (`reconcileSubscription`).
     - Mensalidades de alunos emitidas na subconta da escola (`reconcileStudentCharge`).

---

## 2. Matriz de Permissões e Carência

| Cenário | Status no Banco | `features.financial` | Visualização `/financial` e `/plans` | Banner Global |
|---|---|:---:|---|---|
| **Plano Essencial (free)** | `expiration_date: null` | `false` | Card Explicativo de Bloqueio com CTA | Nenhum |
| **Plano Solo Essencial (solo_free)** | `expiration_date: null` | `false` | Card Explicativo de Bloqueio com CTA | Nenhum |
| **Plano Pago Válido (ex: Profissional)** | `expiration_date >= hoje` | `true` | Módulo Completo Liberado | Nenhum |
| **Plano Pago Vencido (Dia 1 a 5)** | `hoje <= expiration + 5d` | `true` *(mantido)* | Módulo Completo Liberado | **Aviso Amarelo de Carência** (dias restantes) |
| **Plano Pago Expirado (Dia 6+)** | `hoje > expiration + 5d` | `false` *(bloqueado)* | Card Explicativo de Bloqueio com CTA | **Aviso Vermelho de Expiração** |

---

## 3. Testes Automatizados e Verificações

- Foi criada a suíte dedicada `scripts/financial-plans-lock.test.mjs` validando:
  - Planos gratuitos sem módulo financeiro.
  - Planos pagos com módulo financeiro ativo.
  - Cálculo de virada de mês e deltas de dias em `lib/timezone.ts`.
  - Contagem regressiva da carência (dias 1, 2, 3, 4, 5 e bloqueio no dia 6).
  - Comportamento de `effectivePlanFeatures` durante e após a carência.
  - Bloqueio das Server Actions (`enrollStudent`, `createPlan`, `createCharge`).
- Suíte completa de 54 testes executada com sucesso (`node --test ...`): **54 aprovados, 0 falhas**.
- Verificação de tipos TypeScript (`npx tsc --noEmit`): **0 erros**.
- Verificação de linter (`npm run lint`): **0 erros**.
