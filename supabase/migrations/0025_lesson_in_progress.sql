-- Sonorum — status "Em andamento" para aulas
-- Adiciona 'in_progress' ao CHECK de lessons.status. O professor "Inicia" a aula
-- (scheduled -> in_progress) e "Encerra" registrando a presença (in_progress ->
-- completed/late/missed). Não destrutivo: só amplia os valores permitidos.

alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('scheduled', 'in_progress', 'completed', 'late', 'missed', 'canceled'));
