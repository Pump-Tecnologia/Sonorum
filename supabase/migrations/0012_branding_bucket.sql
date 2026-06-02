-- Bucket PÚBLICO para o logo da escola (marca personalizada — Premium).
-- Público porque o logo aparece no shell sem precisar de URL assinada.
-- Upload é feito via service role no servidor; leitura é pública.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;
