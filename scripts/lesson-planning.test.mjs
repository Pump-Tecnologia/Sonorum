// PostgreSQL real e temporário; não utiliza .env nem dados hospedados.
import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(file, mocks) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    exports,
    require: (id) => id in mocks ? mocks[id] : id.startsWith('@/') ? {} : require(id),
  })
  return exports
}

for (const success of [true, false]) {
  test(`action de planejamento ${success ? 'salva' : 'recusa falha'} sem escrever objetivos separadamente`, async () => {
    let revalidated = 0
    let calls = 0
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: 'lesson-id' } }) }
    const { saveLessonPlan } = load('../lib/actions/lessons.ts', {
      'next/cache': { revalidatePath: () => { revalidated++ } },
      '@/lib/constants/recurrence': { RECURRENCE_PRESETS: { none: {} } },
      '@/lib/constants/resources': { CATEGORIES: ['Texto'], CONTENT_TYPES: ['Texto'] },
      '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-a' }) },
      '@/lib/supabase/server': { createClient: async () => ({
        from: (table) => { assert.equal(table, 'lessons'); return query },
        rpc: async (name, args) => {
          calls++
          assert.equal(name, 'save_lesson_plan')
          assert.equal(args.p_goals, 'Trocar acordes')
          assert.equal(args.p_plan.warmup, 'Escalas')
          assert.equal(args.p_plan.specific_data.sections.technique, 'Precisão')
          assert.equal(args.p_plan.specific_data.fields.target_bpm, '90')
          return { data: success, error: success ? null : { code: '23514' } }
        },
      }) },
    })
    const form = new FormData()
    for (const [key, value] of Object.entries({ lessonId: 'lesson-id', goals: 'Trocar acordes', 'sec.warmup': 'Escalas', 'sec.technique': 'Precisão', 'fld.target_bpm': '90' })) form.set(key, value)
    const result = await saveLessonPlan({ ok: false }, form)
    assert.equal(result.ok, success)
    assert.equal(calls, 1)
    assert.equal(revalidated, success ? 2 : 0)
  })
}

test('aplicação de modelo usa a mesma transação e limpa o envelope legado', async () => {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: 'lesson-id', goals: 'Do modelo', warmup_note: 'Modelo QA' } }) }
  const { applyTemplateToLesson } = load('../lib/actions/lesson-templates.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/constants/resources': { INST_CATEGORIES: ['Cordas'] },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'admin', schoolId: 'school-a' }) },
    '@/lib/supabase/server': { createClient: async () => ({
      from: () => query,
      rpc: async (name, args) => {
        assert.equal(name, 'save_lesson_plan')
        assert.equal(args.p_goals, 'Do modelo')
        assert.equal(args.p_plan.warmup, 'Modelo QA')
        assert.equal(args.p_plan.specific_data, null)
        assert.equal('notes' in args.p_plan, false)
        return { data: true, error: null }
      },
    }) },
  })
  assert.equal((await applyTemplateToLesson({ lessonId: 'lesson-id', templateId: 'template-id' })).ok, true)
})

test('falha ao salvar relatório não revalida nem tenta notificar o aluno', async () => {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: 'lesson-id', school_id: 'school-a' } }) }
  const { saveAndSendLessonReport } = load('../lib/actions/notifications.ts', {
    'next/cache': { revalidatePath: () => assert.fail('Relatório não salvo') },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-a' }) },
    '@/lib/notifications/notify': { notify: () => assert.fail('Não deve enviar relatório não salvo') },
    '@/lib/supabase/server': { createAdminClient: async () => ({
      from: (table) => table === 'lessons' ? query : {
        upsert: async () => ({ error: { code: '23514' } }),
      },
    }) },
  })
  const form = new FormData()
  form.set('lessonId', 'lesson-id')
  form.set('technique_score', '4')
  const result = await saveAndSendLessonReport({ ok: false }, form)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'Não foi possível salvar o relatório.')
})

test('planejamento atômico, unicidade, histórico, concorrência e isolamento', async () => {
  const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
  const dir = mkdtempSync(path.join(tmpdir(), 'sonorum-planning-'))
  const pg = (name, args) => execFileSync(path.join(bin, name), args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  let started = false
  try {
    pg('initdb', ['-D', path.join(dir, 'data'), '-A', 'trust', '--no-locale'])
    pg('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'server.log'), '-o', `-k ${dir} -p 55447 -c listen_addresses=''`, '-w', 'start'])
    started = true
    const args = ['-h', dir, '-p', '55447', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1']
    const sql = (input) => execFileSync(path.join(bin, 'psql'), args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const file = (name) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
    const base = file('0001_schema.sql')
    const rls = file('0002_rls.sql')
    const migration = file('0038_atomic_lesson_planning.sql')
    const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
    sql(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      create table public.schools(id uuid primary key);
      create table public.users(id uuid primary key,role text,school_id uuid);
      create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
      insert into public.schools values('${id(11)}'),('${id(12)}');
      insert into public.users values('${id(1)}','admin','${id(11)}'),('${id(2)}','teacher','${id(11)}'),('${id(3)}','student','${id(11)}'),('${id(4)}','admin','${id(12)}');`)
    for (const table of ['lessons', 'lesson_plans', 'lesson_reports']) {
      // Tables, indexes and triggers from the project's real base schema.
      const start = base.indexOf(`create table public.${table} (`)
      const end = base.indexOf('-- ─', start)
      sql(base.slice(start, end === -1 ? undefined : end))
      sql(`alter table public.${table} enable row level security; grant all on public.${table} to authenticated,service_role;`)
    }
    const helperStart = rls.indexOf('create or replace function public.current_user_role()')
    sql(rls.slice(helperStart, rls.indexOf('-- ─', helperStart)))
    sql(rls.slice(rls.indexOf('create policy lessons_superadmin'), rls.indexOf('-- pedagogical_resources:')))
    sql(file('0036_private_lesson_notes.sql'))
    sql(file('0037_private_lesson_notes_grants.sql'))
    sql(`insert into public.lessons(id,school_id,student_id,title,start_datetime,end_datetime,goals) values
      ('${id(21)}','${id(11)}','${id(3)}','Aula QA',now(),now()+interval '1 hour','Objetivo antigo'),
      ('${id(22)}','${id(12)}','${id(4)}','Controle B',now(),now()+interval '1 hour','Controle antigo');
      insert into public.lesson_plans(school_id,lesson_id,warmup,notes) values
      ('${id(11)}','${id(21)}','histórico A','nota preservada'),('${id(11)}','${id(21)}','duplicado','controle');`)
    assert.throws(() => sql(migration), /Duplicate lesson plans/)
    assert.equal(sql('select count(*) from public.lesson_plans'), '2')
    assert.equal(sql("select count(*) from pg_constraint where conname='lesson_plans_lesson_id_key'"), '0')
    sql("delete from public.lesson_plans where warmup='duplicado'")
    sql(`update public.lesson_plans set school_id='${id(12)}'`)
    assert.throws(() => sql(migration), /Inconsistent school/)
    sql(`update public.lesson_plans set school_id='${id(11)}'`)
    sql(`insert into public.lesson_reports(school_id,lesson_id) values ('${id(11)}','${id(21)}'),('${id(11)}','${id(21)}')`)
    assert.throws(() => sql(migration), /Duplicate lesson plans/)
    sql(`delete from public.lesson_reports where id in (select id from public.lesson_reports limit 1)`)
    sql(migration)
    sql(migration)
    assert.equal(sql('select count(*) from public.lesson_plans'), '1')
    assert.equal(sql('select warmup from public.lesson_plans'), 'histórico A')

    const as = (who, query, role = 'authenticated') => `set role ${role}; set test.user_id='${who}'; ${query}`
    const save = (goal, warmup, lesson = id(21), extra = '') => `select public.save_lesson_plan('${lesson}','${goal}','{"warmup":"${warmup}","specific_data":{"v":1}${extra}}'::jsonb)`
    assert.equal(sql(as(id(1), save('Objetivo novo', 'Escalas'))), 't')
    assert.equal(sql(as(id(2), save('Objetivo editado', 'Acordes'))), 't')
    assert.equal(sql('select count(*) from public.lesson_plans'), '1')
    assert.equal(sql('select goals from public.lessons order by id limit 1'), 'Objetivo editado')
    assert.equal(sql('select notes from public.lesson_plans'), 'nota preservada')
    // Modelo limpa envelope, preserva notas gerais quando não são enviadas.
    sql(as(id(2), `select public.save_lesson_plan('${id(21)}','Modelo','{"warmup":"Do modelo","specific_data":null}')`))
    assert.equal(sql('select specific_data is null from public.lesson_plans'), 't')
    assert.equal(sql('select notes from public.lesson_plans'), 'nota preservada')

    // Falha real após UPDATE de goals deve reverter TODA a chamada.
    sql(`create function public.reject_plan_test() returns trigger language plpgsql as $$ begin
      if new.warmup='FAIL' then raise exception 'Forced plan failure'; end if; return new; end $$;
      create trigger reject_plan_test before insert or update on public.lesson_plans for each row execute function public.reject_plan_test();`)
    assert.throws(() => sql(as(id(1), save('Objetivo que não deve persistir', 'FAIL'))), /Forced plan failure/)
    assert.equal(sql(`select goals from public.lessons where id='${id(21)}'`), 'Modelo')
    assert.equal(sql('select warmup from public.lesson_plans'), 'Do modelo')
    for (const who of [id(3), id(4), '']) assert.throws(() => sql(as(who, save('Inválido', 'Inválido'))), /Acesso negado|Aula não encontrada/)
    assert.throws(() => sql(as('', save('Inválido', 'Inválido'), 'anon')), /permission denied/)
    assert.throws(() => sql(as(id(1), save('Outra escola', 'Inválido', id(22)))), /Aula não encontrada/)

    // Duas conexões simultâneas: goals e warmup devem pertencer ao mesmo save.
    const run = promisify(execFile)
    await Promise.all(['A', 'B'].map((x) => run(path.join(bin, 'psql'), [...args, '-c', as(id(2), save(`Concorrente ${x}`, x))], { encoding: 'utf8' })))
    assert.match(sql('select l.goals || p.warmup from public.lessons l join public.lesson_plans p on p.lesson_id=l.id'), /^Concorrente (AA|BB)$/)
    assert.equal(sql('select count(*) from public.lesson_plans'), '1')

    // Mesmo contrato de upsert do relatório: cria/edita sem duplicar.
    for (const score of [3, 5]) sql(as(id(2), `insert into public.lesson_reports(school_id,lesson_id,technique_score) values('${id(11)}','${id(21)}',${score}) on conflict(lesson_id) do update set technique_score=excluded.technique_score`))
    assert.equal(sql('select count(*) from public.lesson_reports'), '1')
    assert.equal(sql(as(id(3), 'select technique_score from public.lesson_reports')), '5')
    assert.equal(sql(as(id(4), 'select count(*) from public.lesson_reports')), '0')
  } finally {
    if (started) pg('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'immediate', '-w', 'stop'])
    rmSync(dir, { recursive: true, force: true })
  }
})
