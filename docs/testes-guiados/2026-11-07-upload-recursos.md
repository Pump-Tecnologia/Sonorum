# Upload de recursos pedagógicos e anexação à aula — #34, #35 e #51

Rodada técnica de 07/11/2026 em https://app.sonorum.com.br (deploy `dpl_2nJ4S17wA5DcaBq7SriJnwUSMVWu`) e build de produção local. Supabase Sonorum identificado: `lfmxeklzjwhlyraxicgq`. Uso exclusivo de contas e dados fictícios: professor e aluno vinculados à mesma escola de teste. Sem uso de dados reais ou da conta do Matheus; notificações por e-mail e WhatsApp desativadas nas fixtures.

## Contexto e reprodução da falha #51

No teste das jornadas #34 (Aula/planejador) e #35 (Portal/materiais), foi realizado o cadastro de um recurso pedagógico em `/resources/new` com upload de arquivo:
1. Preenchimento de título (`QA Upload — partitura`), dificuldade (`Intermediário`), tipo (`PDF`) e descrição curta.
2. Seleção de um arquivo `.pdf` inválido (conteúdo texto simples sem os bytes mágicos do formato).
3. Ao acionar "Criar recurso", a validação do servidor rejeitou o arquivo corretamente com a mensagem: *"O conteúdo do arquivo não corresponde ao formato declarado."*, sem persistir o registro no banco nem gravar arquivo órfão no Storage.
4. **Falha #51**: após a resposta da Server Action (`useActionState`), o formulário sofria o reset automático do React 19 para componentes não controlados; o título e a descrição eram apagados e os seletores de dificuldade e tipo voltavam aos valores padrão (`Iniciante` e `Texto`).
5. Evidência do erro antes do ajuste: [upload-invalido-antes](evidencias/2026-11-07-upload-invalido-antes.png).

## Correção aplicada

- **`components/resources/ResourceForm.tsx`**: adicionado `onReset={(event) => event.preventDefault()}` no formulário, impedindo que o evento nativo de reset acionado pelo React após a Server Action limpe o DOM dos inputs e selects não controlados quando há falha de validação.
- **`lib/actions/resources.ts`**: adicionada verificação explícita de `school_id = me.schoolId` nas Server Actions de edição (`updateResource`), remoção (`deleteResource`) e restauração (`restoreResource`), fornecendo defesa em profundidade além das políticas RLS para evitar mutações cross-tenant.

## Testes e validação

| Caso | Esperado e observado | Resultado |
|---|---|---|
| Upload com formato inválido | Erro "O conteúdo do arquivo não corresponde ao formato declarado." exibido; título, dificuldade, tipo e descrição mantidos preenchidos no formulário. Nenhum recurso ou arquivo gravado. | Passou |
| Correção do arquivo sem redigitar | Apenas o arquivo foi substituído por um PDF válido sintético; campos de texto mantidos sem necessidade de nova digitação; envio concluído com sucesso e redirecionamento para `/resources`. | Passou |
| Persistência e integridade | Recurso criado com ID único no Supabase; arquivo persistido no bucket de storage com caminho escopado pela escola; contagem de recursos incrementada em 1. | Passou |
| Anexação pelo professor (#34) | Professor acessou o planejador da aula da turma e anexou o recurso pedagógico criado à aula. Vínculo persistido em `lesson_resources`. | Passou |
| Acesso pelo aluno (#35) | Aluno fez login no portal, acessou "Meus materiais" e visualizou o recurso recém-anexado; download do PDF gerou URL assinada válida retornando HTTP 200 e bytes idênticos ao arquivo enviado. | Passou |

Evidências:
- Preservação do formulário após erro: [upload-invalido-preservado](evidencias/2026-11-07-upload-invalido-preservado.png)
- Anexação no painel do professor: [upload-anexado-professor](evidencias/2026-11-07-upload-anexado-professor.png)
- Consulta do material no portal do aluno: [upload-material-aluno](evidencias/2026-11-07-upload-material-aluno.png)

## Limpeza

Contas fictícias de professor e aluno, escola QA, aula de teste, recurso pedagógico, vínculo na aula e o arquivo correspondente no bucket de storage foram completamente removidos após os testes. Ausência conferida via API e tabelas do banco. Nenhum dado de produção foi afetado.

## Status

- **#51**: Concluído e verificado.
- **#34 e #35**: Recorte técnico de upload de materiais e disponibilização ao aluno aprovado. As tarefas continuam em andamento para os demais cenários pendentes e validação de usabilidade com o Matheus.
