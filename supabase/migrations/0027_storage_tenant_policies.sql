-- Sonorum — Policies de storage por tenant (item M1 da auditoria de segurança).
--
-- Hoje todo acesso aos buckets privados passa pelo service-role (URL assinada
-- gerada no servidor), e sem policies o acesso direto de anon/authenticated já
-- é negado. Estas policies são a camada extra pedida na auditoria: se algum
-- caminho de acesso client-side for introduzido no futuro, ele já nasce
-- restrito à pasta da própria escola (1º segmento do path = school_id).
--
-- Escrita (insert/update/delete) segue SEM policy de propósito: só o
-- service-role escreve nos buckets.

-- resources: paths são `<school_id>/uuid.ext` ou `global/uuid.ext` (catálogo).
create policy "resources_select_own_school" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resources'
    and (
      (storage.foldername(name))[1] = public.current_school_id()::text
      or (storage.foldername(name))[1] = 'global'
    )
  );

-- audio: paths são `<school_id>/uuid.ext` ou `global/uuid.ext`.
create policy "audio_select_own_school" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio'
    and (
      (storage.foldername(name))[1] = public.current_school_id()::text
      or (storage.foldername(name))[1] = 'global'
    )
  );
