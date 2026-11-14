# Roteiro de revisão dos fluxos para lançamento

Este documento acompanha a revisão funcional do Sonorum desde a infraestrutura e o primeiro acesso até os recursos mais recentes. O status abaixo é uma leitura do código local; não comprova que configurações externas, migrations ou deploy estejam aplicados.

## Como vamos revisar

- **Código revisado**: fluxo e permissões conferidos na implementação.
- **Validação prática pendente**: ainda falta percorrer o fluxo em ambiente de teste, sem dados reais.
- **Bloqueio**: problema confirmado que precisa ser resolvido ou explicitamente aceito antes do lançamento.
- O checkout já continha trabalho em andamento; as correções desta revisão foram aplicadas sobre ele sem descartar essas alterações.

## Ordem do walkthrough

| Etapa | Fluxos | Status |
|---|---|---|
| 0. Fundação | Next/Vercel, Supabase, migrations, RLS, Auth Hook, storage, variáveis e domínios | Verificações SQL de 0031–0035 confirmadas; ativação do Auth Hook e ambiente externo pendentes |
| 1. Acesso | entrada, login, cadastro grátis e pago, recuperação de senha, callback e logout | Fluxo revisado; redirecionamento corrigido; confirmação de e-mail e runtime pendentes |
| 2. Provisionamento | Super Admin, criação/edição de escola, biblioteca inicial e impersonação | Barreiras de autorização e impersonação corrigidas; depende de migrations e validação prática |
| 3. Operação da escola | perfil, configurações, salas, professores, alunos, importações, vínculos e limites | Criação, importação e limites revisados; percurso prático pendente |
| 4. Aulas | agenda, recorrência, planejamento, presença, relatório, modelos e notificações | Ações e leitura de agenda revisadas; percurso ponta a ponta pendente |
| 5. Portal do aluno | dashboard, agenda, aula, materiais, progresso, metas e mensalidades | Leitura escopada por usuário revisada; percurso ponta a ponta pendente |
| 6. Conteúdo e IA | recursos, biblioteca compartilhada, arquivos, transcrição e revisão | Upload, revisão e callback conferidos em código; provedor e storage externos pendentes |
| 7. Financeiro da escola | planos de aluno, matrículas, geração/baixa de cobranças, PIX e links de pagamento | Integridade da troca de matrícula e calendário BRT corrigidos; validação com cobrança de teste pendente |
| 8. Assinatura Sonorum | planos SaaS, checkout, webhooks, renovação, cancelamento e retorno | Referências, valor, autenticação e ativação revisados; migrations/configuração de gateway pendentes |
| 9. Integrações | e-mail, WhatsApp, Google Calendar, cron e armazenamento | Implementação local mapeada; credenciais, callbacks e entrega real pendentes |
| 10. Evoluções recentes | Solo/Solo Essencial, admin que também leciona, mudanças de segurança e migrations 0026–0035 | Código local revisado; usuário confirmou checks SQL 0031–0035; validar Auth Hook e claims de sessão |
| 11. Lançamento | domínio público/marketing, onboarding, suporte, monitoramento, backup e comunicação | Pendente |

## Achados confirmados até aqui

### Acesso e cadastro

1. **Redirecionamento de retorno aceitava `//dominio-externo`.** Corrigido com `safeInternalRedirect` em login, cadastro e callback; caminhos externos e protocol-relative retornam ao dashboard.
2. **Cadastro confirma o e-mail automaticamente.** `signUp` cria o usuário com `email_confirm: true` e autentica imediatamente. A política continua como decisão de produto para o piloto/lançamento.
3. **Rate limit distribuído.** Corrigido em `0033_distributed_rate_limit.sql`: login, cadastro, redefinição, importação e webhooks usam contador atômico no Postgres; a chave é armazenada como HMAC. O usuário informou que aplicou a migration; falta validar o RPC no ambiente.
4. **`/modelos` estava fora da proteção de papel.** Incluído nos prefixos protegidos e limitado a admin/professor.

### Limites e importação

5. **Importações de alunos e professores ignoravam limites de plano.** Corrigido: os lotes agora calculam a capacidade restante e rejeitam o excedente.
6. **A volta da impersonação confiava em cookie editável.** Corrigido com cookie HMAC, validade, vínculo da sessão alvo, revalidação do papel/escopo do operador e retorno auditado.
7. **Páginas Super Admin consultavam service-role sem validar papel no servidor.** Corrigido com layout de autorização; o proxy também falha fechado quando não consegue ler um papel válido. O Auth Hook ainda precisa estar ativo no Supabase.
8. **Criação de escola Solo podia deixar de criar o vínculo de professor.** Corrigido nos fluxos Super Admin e cadastro público; falha no vínculo agora desfaz a criação.
9. **`provisionSchoolLibrary` era uma ação service-role sem autorização própria.** Corrigido: exige Super Admin no ponto de entrada.
10. **Credenciais eram enviadas em texto e a tela exibia senha temporária.** Corrigido: criação individual, criação de escola, importação e redefinição agora enviam link de uso único para definir senha; falha no e-mail reverte a nova conta. E-mail de produção sem Resend configurado agora retorna erro em vez de sucesso fictício.
11. **Aprovação de cobrança SaaS podia associar webhook à tentativa mais recente e não conferia o valor.** Corrigido com referência própria por tentativa, resolução por payment ID, falha fechada em ambiguidades legadas e comparação de centavos.
12. **Aprovação da cobrança e extensão do plano eram duas gravações separadas.** Corrigido por RPC transacional idempotente em `0031_atomic_saas_payment_approval.sql`.
13. **Asaas podia ativar plano só porque a assinatura constava como `ACTIVE`.** Corrigido: exige evento confirmado e reconsulta a cobrança para conferir status, vínculo da assinatura e valor.
14. **Webhook de pagamento aceitava execução em produção sem segredo configurado.** Corrigido: Asaas e Mercado Pago retornam erro de configuração em produção; o token Asaas usa comparação em tempo constante.
15. **A tela de cartão Mercado Pago podia enviar token para Asaas.** A action agora recusa tokenização de outro provedor; o fluxo Asaas hospedado permanece em `/upgrade`.
16. **Trocar matrícula cancelava a atual antes de criar a nova.** Corrigido com RPC transacional que valida admin, aluno e plano dentro da escola e bloqueia o aluno durante a troca.
17. **Políticas RLS permitiam editar campos privilegiados do próprio usuário e da escola.** Corrigido em `0032_column_level_update_permissions.sql`: usuários não têm UPDATE direto em `users` nem `schools`; metas permitem que o aluno altere somente `completed`. A action de configurações usa service-role após validar papel e escola.
18. **O gateway mock podia ser forçado em produção e as variáveis de pagamento não estavam no `.env.example`.** Corrigido: produção falha fechada sem gateway real, `mock` não é aceito em produção, provider desconhecido falha explicitamente e o exemplo agora lista as chaves necessárias.
19. **Cobranças por aula e alguns resumos usavam limites UTC.** Corrigido: contagem de aulas, geração de cobranças, dia/mês do dashboard, vencimento e desconto usam limites de calendário BRT; datas de entrada inválidas são rejeitadas.
20. **Criações simultâneas podiam exceder a cota de alunos ou professores.** Corrigido em `0034_atomic_school_plan_quotas.sql`: triggers serializam a checagem por escola e aplicam limites também em criações individuais, importações e ativação de admin-professor. O usuário informou que aplicou a migration.
21. **Primeira cobrança Asaas podia ser comparada com valor ausente; estados temporários de disputa podiam parecer estorno final.** Corrigido localmente: o reconcile carrega o valor da assinatura, estados intermediários não são classificados como reembolso integral e notificações atrasadas não regridem pagamentos aprovados. A política de acesso após reembolso integral ainda precisa de decisão de produto.
22. **Plano vencido mantinha os recursos pagos e limites ilimitados.** Corrigido localmente: a escola passa a usar o conjunto gratuito equivalente após `expiration_date`, mantendo dados e acesso básico; a migration `0035_expired_plan_quotas.sql` aplica os limites também no banco. A migration ainda precisa ser aplicada no projeto de destino.

As falhas de autorização e integridade listadas foram corrigidas no código local. A eficácia final depende de aplicar as migrations pendentes e confirmar o runtime do projeto Supabase de destino; não houve staging nem testes com dados reais.

## Inventário inicial de áreas

- **Auth**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`.
- **Super Admin**: visão geral, escolas, edição de plano/preço/validade, biblioteca global e impersonação.
- **Admin**: dashboard, alunos, professores, importação, sala, configurações, relatórios, planos, matrículas, financeiro e upgrade.
- **Professor**: dashboard, agenda, planejamento de aula, presença, recursos e modelos.
- **Aluno**: dashboard, agenda, detalhe da aula, materiais, progresso/metas e mensalidades.
- **Recursos recentes**: transcrição de cifra, contas Solo, admin-professor, Asaas e endurecimento de segurança.
- **APIs e jobs**: aulas, recursos, próxima aula, Google Calendar, lembretes/cron e webhooks de pagamento/transcrição.

## Pendências de lançamento confirmadas

- Não haverá staging por enquanto. O `.env.local` aponta para um Supabase hospedado sem identificação de ambiente e usa `localhost:3100` como URL do app; não executar nele os scripts `scripts/smoke-*.mjs`, pois criam e removem escolas e usuários.
- A consulta no Supabase mostrou inicialmente `0031` ausente e `0032` sem convergir. Depois da aplicação, a captura mais recente confirmou `true` em todos os checks SQL de `0031`–`0035`, incluindo ausência de UPDATE amplo em `users`, `schools` e `student_goals`. Isso verifica objetos, grants e triggers; não exercita operações reais.
- A captura mais recente também confirmou a função e os grants de `supabase_auth_admin` para o Auth Hook. A consulta SQL não confirma que o hook foi habilitado no painel.
- Ativar `public.custom_access_token_hook` em Supabase → Authentication → Auth Hooks (Beta) → Custom Access Token e conferir os claims `user_role`/`school_id` em uma sessão nova.
- Configurar em produção `PAYMENTS_PROVIDER`, credenciais do gateway, `MP_WEBHOOK_SECRET` ou `ASAAS_WEBHOOK_TOKEN`, conforme o provedor escolhido, além da URL pública. Para Asaas, cadastrar eventos de cobrança no painel apontando para `/api/webhooks/asaas`; usar `ASAAS_ENV` de produção.
- Confirmar política de confirmação de e-mail e efeito de reembolso integral/chargeback no acesso SaaS. Cobranças reembolsadas deixam de renovar, mas a revogação imediata de acesso depende de regra de negócio ainda não implementada.
- Confirmar `RESEND_API_KEY` e `RESEND_FROM` em produção; validar entrega, expiração e uso do link de definição/redefinição de senha.
- Lint e build locais passaram em 2026-10-23. Sem staging, nenhum percurso que grava dados foi validado; a configuração de produção e o runtime do Supabase, gateway, e-mail, Google, cron e deploy seguem sem confirmação.

## Critério de conclusão por fluxo

Para cada jornada, registrar: perfil usado, pré-condições, passos principais, resultado esperado, limites/erros, efeito no banco, dependências externas e resultado do percurso. Esta etapa inclui revisão estática, lint e build locais; não foram executados smoke scripts, migrações nem chamadas a provedores reais.
