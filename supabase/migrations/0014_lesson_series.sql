-- Vincula aulas da mesma série de recorrência. Permite:
--   1) Identificar todas as ocorrências de uma série
--   2) Aplicar mudanças apenas à série futura (a partir desta aula)
--   3) Cancelar a série inteira de uma vez
alter table public.lessons add column series_id uuid;

create index lessons_series_id_idx on public.lessons (series_id);
