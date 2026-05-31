-- Bucket PRIVADO para arquivos de recursos pedagógicos (PDF/partitura).
-- Acesso só via URL assinada gerada no servidor (service role). 10MB, mime restrito.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources',
  'resources',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
