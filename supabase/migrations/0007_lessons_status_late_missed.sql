-- Adiciona os status 'late' (atrasado) e 'missed' (faltou) às aulas,
-- usados pela presença (modo dar-aula). Antes só havia scheduled/completed/canceled.
alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status = any (array['scheduled', 'completed', 'late', 'missed', 'canceled']));
