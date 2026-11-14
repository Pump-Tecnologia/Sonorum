// SQL real em cluster PostgreSQL temporário. Não acessa .env nem Supabase.
// Requer binários PostgreSQL instalados: node --test scripts/private-lesson-notes.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadModule(file, mocks) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(source, {
    exports,
    require: (id) => id in mocks ? mocks[id] : id.startsWith('@/') ? {} : require(id),
  })
  return exports
}

test('planner recusa aluno antes de consultar conteúdo da aula', async () => {
  const { default: page } = loadModule('../app/(app)/lessons/[id]/planner/page.tsx', {
    'next/navigation': { notFound: () => { throw new Error('NOT_FOUND') } },
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'student', schoolId: 'school-a' }) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => assert.fail('Aluno não deve consultar planner') }) },
  })
  await assert.rejects(page({ params: Promise.resolve({ id: 'lesson-id' }) }), /NOT_FOUND/)
})

test('planner usa projeção pública e falha fechado quando RPC privada está indisponível', async () => {
  const query = {
    select: (columns) => { assert.equal(columns.split(',').includes('private_notes'), false); return query },
    eq: () => query,
    maybeSingle: async () => ({ data: { id: 'lesson-id' } }),
  }
  const { default: page } = loadModule('../app/(app)/lessons/[id]/planner/page.tsx', {
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'teacher', schoolId: 'school-a' }) },
    '@/lib/auth/plan': { getPlanContext: async () => ({ features: {} }) },
    '@/lib/supabase/server': { createClient: async () => ({
      from: () => query,
      rpc: async (name, args) => {
        assert.equal(name, 'get_lesson_private_notes')
        assert.equal(args.p_lesson_id, 'lesson-id')
        return { data: null, error: { code: 'PGRST202' } }
      },
    }) },
  })
  await assert.rejects(page({ params: Promise.resolve({ id: 'lesson-id' }) }), /Não foi possível carregar as notas privadas/)
})

test('action de anotações recusa aluno antes de acessar o banco', async () => {
  const { updateLesson } = loadModule('../lib/actions/lessons.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => ({ role: 'student', schoolId: 'school-a' }) },
    '@/lib/supabase/server': { createClient: () => assert.fail('Aluno não deve executar atualização') },
    '@/lib/constants/recurrence': { RECURRENCE_PRESETS: { none: {} } },
    '@/lib/constants/resources': { CATEGORIES: ['Texto'], CONTENT_TYPES: ['Texto'] },
  })
  const form = new FormData()
  form.set('private_notes', 'Tentativa fictícia')
  await updateLesson(form)
})

test('notas privadas: permissões SQL, RPC, isolamento e preservação do histórico', () => {
  const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
  const dir = mkdtempSync(path.join(tmpdir(), 'sonorum-private-notes-'))
  const pg = (command, args) => execFileSync(path.join(bin, command), args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  let started = false
  try {
    pg('initdb', ['-D', path.join(dir, 'data'), '-A', 'trust', '--no-locale'])
    // Socket privado; nenhuma porta TCP e nenhum banco existente é utilizado.
    pg('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'server.log'), '-o', `-k ${dir} -p 55446 -c listen_addresses=''`, '-w', 'start'])
    started = true
    const sql = (input) => execFileSync(path.join(bin, 'psql'), ['-h', dir, '-p', '55446', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const migration = readFileSync(new URL('../supabase/migrations/0036_private_lesson_notes.sql', import.meta.url), 'utf8')
    const grants = readFileSync(new URL('../supabase/migrations/0037_private_lesson_notes_grants.sql', import.meta.url), 'utf8')
    sql(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      create table public.users(id uuid primary key, role text, school_id uuid);
      create table public.lessons(id uuid primary key, school_id uuid, student_id uuid, notes text, private_notes text);
      insert into public.users values
        ('00000000-0000-0000-0000-000000000001','admin','10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000002','teacher','10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000003','student','10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000004','student','10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000005','admin','10000000-0000-0000-0000-000000000002'),
        ('00000000-0000-0000-0000-000000000006','superadmin',null);
      insert into public.lessons values
        ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','feedback público','segredo histórico A'),
        ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','feedback colega','segredo colega'),
        ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',null,'feedback escola B','segredo escola B');
    `)
    // Usa os helpers e políticas de lessons reais do projeto.
    const rls = readFileSync(new URL('../supabase/migrations/0002_rls.sql', import.meta.url), 'utf8')
    sql(rls.slice(rls.indexOf('create or replace function public.current_user_role()'), rls.indexOf('-- ─', rls.indexOf('create or replace function public.current_user_role()'))))
    sql(`alter table public.lessons enable row level security;
      grant all on public.lessons to anon, authenticated, service_role;
      grant select(private_notes) on public.lessons to authenticated;
      ${rls.slice(rls.indexOf('create policy lessons_superadmin'), rls.indexOf('-- lesson_plans:'))}`)
    const as = (id, query, role = 'authenticated') => sql(`set role ${role}; set test.user_id = '${id}'; ${query}`)
    const lesson = '20000000-0000-0000-0000-000000000001'
    const user = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
    const denied = (id, query, role) => assert.throws(() => as(id, query, role), /permission denied|Acesso negado/)

    assert.throws(() => sql(grants), /Apply 0036/)
    sql(migration)
    // Preparação não interrompe o planner antigo; proteção ativa só na fase 2.
    assert.equal(as(user(1), `select private_notes from public.lessons where id='${lesson}'`), 'segredo histórico A')
    sql(grants)
    sql(migration)
    sql(grants) // reaplicação não reabre a coluna privada nem altera dados.

    // Aluno continua lendo feedback próprio; não lê colega nem qualquer nota privada.
    assert.equal(as(user(3), `select notes from public.lessons where id='${lesson}'`), 'feedback público')
    assert.equal(as(user(3), 'select count(id) from public.lessons'), '1')
    denied(user(3), `select private_notes from public.lessons where id='${lesson}'`)
    denied(user(3), `select * from public.lessons where id='${lesson}'`)
    denied(user(3), `select to_jsonb(l) from public.lessons l where id='${lesson}'`)
    denied(user(3), "select id from public.lessons where private_notes like '%histórico%'")
    denied(user(3), `select public.get_lesson_private_notes('${lesson}')`)
    denied(user(4), `select public.get_lesson_private_notes('${lesson}')`)
    assert.equal(as(user(3), `update public.lessons set private_notes='intrusão' where id='${lesson}'; select notes from public.lessons where id='${lesson}'`), 'feedback público')

    // Staff da mesma escola mantém leitura e escrita; a leitura crua segue proibida.
    for (const n of [1, 2]) {
      assert.equal(as(user(n), `select public.get_lesson_private_notes('${lesson}')`), 'segredo histórico A')
      denied(user(n), `select private_notes from public.lessons where id='${lesson}'`)
    }
    assert.equal(as(user(5), `select public.get_lesson_private_notes('${lesson}')`), '')
    assert.equal(as(user(5), `select count(id) from public.lessons where id='${lesson}'`), '0')
    assert.equal(as(user(6), `select public.get_lesson_private_notes('${lesson}')`), 'segredo histórico A')
    denied('', `select public.get_lesson_private_notes('${lesson}')`, 'anon')
    denied('', `select private_notes from public.lessons`, 'anon')
    assert.equal(as('', `select private_notes from public.lessons where id='${lesson}'`, 'service_role'), 'segredo histórico A')
    assert.equal(sql('select count(private_notes) from public.lessons'), '3')
    as(user(2), `update public.lessons set notes='feedback atualizado', private_notes='privado atualizado' where id='${lesson}'`)
    assert.equal(as(user(1), `select public.get_lesson_private_notes('${lesson}')`), 'privado atualizado')
    assert.equal(as(user(3), `select notes from public.lessons where id='${lesson}'`), 'feedback atualizado')
    assert.equal(as(user(1), "select public.get_lesson_private_notes('ffffffff-ffff-ffff-ffff-ffffffffffff')"), '')
  } finally {
    if (started) pg('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'immediate', '-w', 'stop'])
    rmSync(dir, { recursive: true, force: true })
  }
})
