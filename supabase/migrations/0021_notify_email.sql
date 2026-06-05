-- 0021_notify_email.sql
-- Preferência opt-in por aluno: receber notificações por e-mail.
-- Essencial/Profissional não têm WhatsApp oficial (só Premium) — o e-mail é o
-- canal automático, mas só sai se o aluno (ou o admin) marcar esta opção.
-- Os mesmos eventos/templates do WhatsApp chegam por e-mail quando ativo.

alter table public.users
  add column if not exists notify_email boolean not null default false;
