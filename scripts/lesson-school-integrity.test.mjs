// SQL real em cluster PostgreSQL temporário. Não acessa .env nem Supabase.
// Requer binários PostgreSQL instalados: node --test scripts/lesson-school-integrity.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

// Sem locale fixo, o Postgres do macOS se recusa a subir.
const env = { ...process.env, LC_ALL: 'C' }
const PORT = '55447'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const SCHOOL_A = id(101)
const SCHOOL_B = id(102)
const STUDENT_A = id(1)
const TEACHER_A = id(2)
const STUDENT_B = id(3)
const TEACHER_B = id(4)
const NO_SCHOOL = id(5)

test('banco só aceita aula com aluno e professor da própria escola', () => {
  const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
  const dir = mkdtempSync(path.join(tmpdir(), 'sonorum-escola-'))
  const run = (command, args, input) =>
    execFileSync(path.join(bin, command), args, { input, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  let started = false
  try {
    run('initdb', ['-D', path.join(dir, 'data'), '-A', 'trust', '--no-locale', '-E', 'UTF8'])
    // Socket privado; nenhuma porta TCP e nenhum banco existente é utilizado.
    run('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'server.log'), '-o', `-k ${dir} -p ${PORT} -c listen_addresses=''`, '-w', 'start'])
    started = true
    const sql = (input) => run('psql', ['-h', dir, '-p', PORT, '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], input).trim()

    sql(`
      create role anon;
      create role authenticated;
      create table public.users(id uuid primary key, school_id uuid);
      create table public.lessons(
        id int primary key,
        school_id uuid,
        student_id uuid not null references public.users(id) on delete cascade,
        teacher_id uuid references public.users(id) on delete set null,
        status text not null default 'scheduled'
      );
      grant usage on schema public to authenticated;
      grant select, insert, update on public.lessons to authenticated;
      -- Mesmo formato da policy lessons_staff: só confere a escola da própria aula.
      alter table public.lessons enable row level security;
      create policy lessons_staff on public.lessons for all to authenticated
        using (school_id::text = current_setting('test.school', true))
        with check (school_id::text = current_setting('test.school', true));
      insert into public.users values
        ('${STUDENT_A}','${SCHOOL_A}'), ('${TEACHER_A}','${SCHOOL_A}'),
        ('${STUDENT_B}','${SCHOOL_B}'), ('${TEACHER_B}','${SCHOOL_B}'),
        ('${NO_SCHOOL}', null);
      -- Aula antiga, já cruzada antes da trava.
      insert into public.lessons(id, school_id, student_id, teacher_id)
        values (1, '${SCHOOL_A}', '${STUDENT_B}', '${TEACHER_B}');
    `)

    const migration = readFileSync(new URL('../supabase/migrations/0040_lesson_same_school.sql', import.meta.url), 'utf8')
    sql(migration)
    sql(migration) // reaplicar é seguro

    const insert = (n, school, student, teacher) =>
      `insert into public.lessons(id, school_id, student_id, teacher_id) values (${n}, ${school ? `'${school}'` : 'null'}, '${student}', ${teacher ? `'${teacher}'` : 'null'})`
    const asStaff = (query, school = SCHOOL_A) => sql(`set role authenticated; set test.school = '${school}'; ${query}`)
    const refuses = (query, message) => assert.throws(() => asStaff(query), message)
    // Service role e rotinas internas ignoram a RLS, mas não a trava.
    const refusesBypassingRls = (query, message) => assert.throws(() => sql(query), message)

    // Equipe grava sem precisar enxergar a tabela de usuários.
    asStaff(insert(2, SCHOOL_A, STUDENT_A, TEACHER_A))
    asStaff(insert(3, SCHOOL_A, STUDENT_A, null))

    refuses(insert(10, SCHOOL_A, STUDENT_B, TEACHER_A), /Aluno não pertence à escola da aula/)
    refuses(insert(11, SCHOOL_A, NO_SCHOOL, null), /Aluno não pertence à escola da aula/)
    refusesBypassingRls(insert(12, null, STUDENT_A, null), /Aluno não pertence à escola da aula/)
    refuses(insert(13, SCHOOL_A, STUDENT_A, TEACHER_B), /Professor não pertence à escola da aula/)
    refuses(`update public.lessons set student_id = '${STUDENT_B}' where id = 2`, /Aluno não pertence/)
    refuses(`update public.lessons set teacher_id = '${TEACHER_B}' where id = 2`, /Professor não pertence/)
    refusesBypassingRls(`update public.lessons set school_id = '${SCHOOL_B}' where id = 2`, /não pertence à escola da aula/)

    // Quem é de fora recebe a mesma recusa da RLS, pertença ou não a pessoa à escola.
    for (const student of [STUDENT_A, STUDENT_B]) {
      assert.throws(() => asStaff(insert(14, SCHOOL_A, student, null), SCHOOL_B), /row-level security/)
    }

    // O que já existia continua editável enquanto escola, aluno e professor não mudam.
    asStaff(`update public.lessons set status = 'completed' where id = 1`)
    asStaff(`update public.lessons set student_id = student_id, teacher_id = teacher_id, status = 'canceled' where id = 1`)

    // Trocar só o professor não reavalia um aluno que depois mudou de escola.
    sql(`update public.users set school_id = '${SCHOOL_B}' where id = '${STUDENT_A}'`)
    asStaff(`update public.lessons set teacher_id = null where id = 2`)

    sql(`delete from public.users where id = '${TEACHER_A}'`)
    assert.equal(sql('select count(*) from public.lessons where teacher_id is null'), '2')
    assert.equal(sql('select count(*) from public.lessons where id >= 10'), '0')
    assert.equal(sql(`select has_function_privilege('authenticated', 'public.enforce_lesson_school()', 'execute')`), 'f')
  } finally {
    if (started) run('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'immediate', '-w', 'stop'])
    rmSync(dir, { recursive: true, force: true })
  }
})
