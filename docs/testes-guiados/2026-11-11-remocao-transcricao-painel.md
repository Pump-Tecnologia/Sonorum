# Remoção da transcrição por IA do painel do app — #66

Validação técnica de 11/11/2026 conforme decisão de produto e critérios de aceite da tarefa #66.

## Contexto e requisitos

A transcrição de áudio por IA para geração de acordes/cifras foi postergada para pós-lançamento. Os critérios de aceite definidos no item #66 são:
1. Nenhum usuário (aluno, professor ou admin) visualiza pontos de entrada, menus, botões ou upsell para a transcrição por IA.
2. O restante do painel e das áreas de recursos/planos funciona normalmente sem erros.
3. O código e infraestrutura da transcrição permanecem no repositório para reativação futura via flag simples (`TRANSCRIPTION_ENABLED`).

## Verificação e ajustes aplicados

1. **Feature flag central**:
   - `lib/constants/transcription.ts`: `TRANSCRIPTION_ENABLED = false`.
   - Reativação futura necessita apenas alterar para `true`.

2. **Navegação do painel (`lib/constants/nav.ts`)**:
   - `TRANSCRIPTION_NAV` é avaliado condicionalmente com `TRANSCRIPTION_ENABLED`.
   - Nenhum perfil (`admin`, `teacher`, `superadmin`, `student`) possui o item "Transcrição IA" no menu/sidebar.

3. **Rotas e páginas (`app/(app)/resources/transcribe/layout.tsx`)**:
   - Layout raiz de transcrição dispara `if (!TRANSCRIPTION_ENABLED) notFound()`.
   - Qualquer tentativa de navegação direta para rotas `/resources/transcribe/*` resulta em HTTP 404 (página não encontrada padrão do Next.js).

4. **Apresentação de planos e upsell (`app/(app)/upgrade/page.tsx`)**:
   - A linha de funcionalidade `'Transcrição de cifra por IA'` é filtrada dos planos `premium` e `solo_pro` quando `TRANSCRIPTION_ENABLED === false`.
   - Usuários não encontram menção ao recurso na contratação/upgrade.

5. **Painel de superadmin (`components/superadmin/SchoolEditForm.tsx`)**:
   - O seletor de override de recursos para escolas omite a opção "Transcrição IA" quando `TRANSCRIPTION_ENABLED === false`, evitando estados inconsistentes na configuração manual de escolas.

6. **Proteção de Server Actions (`lib/actions/transcription.ts`)**:
   - Server Actions checam `if (!TRANSCRIPTION_ENABLED) return null` dentro de `requireStaff()`, garantindo defesa em profundidade com falha fechada (`{ ok: false, error: 'Acesso negado.' }`).

## Testes automatizados

- Criada suíte de regressão `scripts/transcription-disabled.test.mjs` cobrindo:
  - Validação da flag `TRANSCRIPTION_ENABLED === false`.
  - Ausência de itens de menu/links em todos os perfis (`NAV_BY_ROLE`).
  - Ausência de propaganda do recurso na matriz de planos (`upgrade`).
  - Falha fechada nas server actions caso invocadas diretamente.
- Suíte geral de 48 testes unitários passando sem falhas (`node --test`).
- Lint (`npm run lint`) e checagem de tipos TypeScript (`npx tsc --noEmit`) 100% aprovados sem erros.

## Status

- **#66**: Concluído e verificado.
