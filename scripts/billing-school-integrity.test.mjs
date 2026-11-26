// SQL real em cluster PostgreSQL temporário. Não acessa .env nem Supabase.
// Requer binários PostgreSQL instalados: node --test scripts/billing-school-integrity.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

// Sem locale fixo, o Postgres do macOS se recusa a subir.
const env = { ...process.env, LC_ALL: 'C' }
const PORT = '55448'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const SCHOOL_A = id(101)
const SCHOOL_B = id(102)
const STUDENT_A = id(1)
const STUDENT_B = id(2)
const NO_SCHOOL = id(3)
const ENROLLMENT_A = id(201)
const ENROLLMENT_B = id(202)

const NOT_STUDENT = /Aluno não pertence à escola do registro/
const NOT_ENROLLMENT = /Matrícula não pertence à escola da cobrança/

const value = (x) => (x ? `'${x}'` : 'null')
const enrollment = (key, school, student) =>
  `insert into public.enrollments(id, school_id, student_id) values ('${key}', ${value(school)}, ${value(student)})`
const goal = (n, school, student) =>
  `insert into public.student_goals(id, school_id, student_id) values (${n}, ${value(school)}, ${value(student)})`
const charge = (n, school, { student, enrollmentId, due = `2026-12-${String(n % 28 + 1).padStart(2, '0')}` } = {}) =>
  `insert into public.charges(id, school_id, student_id, enrollment_id, due_date) values (${n}, ${value(school)}, ${value(student)}, ${value(enrollmentId)}, '${due}')`

test('banco só aceita matrícula, meta e cobrança de aluno da própria escola', () => {
  const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
  const dir = mkdtempSync(path.join(tmpdir(), 'sonorum-cobra-'))
  const run = (command, args, input) =>
    execFileSync(path.join(bin, command), args, { input, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  let started = false
  try {
    run('initdb', ['-D', path.join(dir, 'data'), '-A', 'trust', '--no-locale', '-E', 'UTF8'])
    // Socket privado; nenhuma porta TCP e nenhum banco existente é utilizado.
    run('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'server.log'), '-o', `-k ${dir} -p ${PORT} -c listen_addresses=''`, '-w', 'start'])
    started = true
    const sql = (input) => run('psql', ['-h', dir, '-p', PORT, '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], input).trim()

    // Policies no formato das reais: a equipe só tem conferida a escola da própria linha.
    const staffPolicy = (table) => `
      alter table public.${table} enable row level security;
      create policy ${table}_staff on public.${table} for all to authenticated
        using (school_id::text = current_setting('test.school', true))
        with check (school_id::text = current_setting('test.school', true));`

    sql(`
      create role anon;
      create role authenticated;
      create table public.users(id uuid primary key, school_id uuid);
      create table public.enrollments(
        id uuid primary key, school_id uuid,
        student_id uuid not null references public.users(id) on delete cascade,
        status text not null default 'active'
      );
      create table public.student_goals(
        id int primary key, school_id uuid,
        student_id uuid not null references public.users(id) on delete cascade,
        completed boolean not null default false
      );
      create table public.charges(
        id int primary key, school_id uuid,
        student_id uuid references public.users(id) on delete cascade,
        enrollment_id uuid references public.enrollments(id) on delete cascade,
        due_date date not null,
        status text not null default 'pending',
        unique (enrollment_id, due_date),
        check (enrollment_id is not null or student_id is not null)
      );
      grant usage on schema public to authenticated;
      grant select, insert, update on public.enrollments, public.student_goals, public.charges to authenticated;
      ${staffPolicy('enrollments')}
      ${staffPolicy('student_goals')}
      ${staffPolicy('charges')}
      create policy student_goals_student_update on public.student_goals for all to authenticated
        using (student_id::text = current_setting('test.uid', true))
        with check (student_id::text = current_setting('test.uid', true));

      insert into public.users values
        ('${STUDENT_A}','${SCHOOL_A}'), ('${STUDENT_B}','${SCHOOL_B}'), ('${NO_SCHOOL}', null);
      ${enrollment(ENROLLMENT_B, SCHOOL_B, STUDENT_B)};
      -- Registros antigos, já cruzados antes da trava.
      ${enrollment(id(299), SCHOOL_A, STUDENT_B)};
      ${goal(1, SCHOOL_A, STUDENT_B)};
      ${charge(1, SCHOOL_A, { student: STUDENT_B })};
      ${charge(2, SCHOOL_A, { enrollmentId: ENROLLMENT_B, due: '2026-10-10' })};
    `)

    const migration = readFileSync(new URL('../supabase/migrations/0041_student_records_same_school.sql', import.meta.url), 'utf8')
    sql(migration)
    sql(migration) // reaplicar é seguro

    const asStaff = (query, school = SCHOOL_A) =>
      sql(`set role authenticated; set test.school = '${school}'; set test.uid = ''; ${query}`)
    const asStudent = (query, student) =>
      sql(`set role authenticated; set test.school = ''; set test.uid = '${student}'; ${query}`)
    const refuses = (query, message) => assert.throws(() => asStaff(query), message, query)

    // O uso normal continua funcionando.
    asStaff(enrollment(ENROLLMENT_A, SCHOOL_A, STUDENT_A))
    asStaff(goal(2, SCHOOL_A, STUDENT_A))
    asStaff(charge(3, SCHOOL_A, { student: STUDENT_A }))
    asStaff(charge(4, SCHOOL_A, { enrollmentId: ENROLLMENT_A }))
    asStudent('update public.student_goals set completed = true where id = 2', STUDENT_A)

    // Aluno de fora, ou sem escola.
    refuses(enrollment(id(210), SCHOOL_A, STUDENT_B), NOT_STUDENT)
    refuses(goal(10, SCHOOL_A, STUDENT_B), NOT_STUDENT)
    refuses(charge(10, SCHOOL_A, { student: STUDENT_B }), NOT_STUDENT)
    refuses(charge(11, SCHOOL_A, { student: NO_SCHOOL }), NOT_STUDENT)
    refuses(charge(12, SCHOOL_A, { student: STUDENT_B, enrollmentId: ENROLLMENT_A }), NOT_STUDENT)
    // Matrícula de fora.
    refuses(charge(13, SCHOOL_A, { enrollmentId: ENROLLMENT_B }), NOT_ENROLLMENT)

    // Trocar depois de gravado também é barrado.
    refuses(`update public.enrollments set student_id = '${STUDENT_B}' where id = '${ENROLLMENT_A}'`, NOT_STUDENT)
    refuses(`update public.student_goals set student_id = '${STUDENT_B}' where id = 2`, NOT_STUDENT)
    refuses(`update public.charges set student_id = '${STUDENT_B}' where id = 3`, NOT_STUDENT)
    refuses(`update public.charges set enrollment_id = '${ENROLLMENT_B}' where id = 4`, NOT_ENROLLMENT)
    // O aluno pode mexer na própria meta, mas não passá-la para outra escola.
    assert.throws(() => asStudent(`update public.student_goals set school_id = '${SCHOOL_B}' where id = 2`, STUDENT_A), NOT_STUDENT)

    // Quem é de fora recebe a recusa da RLS, pertença ou não o aluno à escola.
    for (const student of [STUDENT_A, STUDENT_B]) {
      assert.throws(() => asStaff(charge(14, SCHOOL_A, { student }), SCHOOL_B), /row-level security/)
    }

    // O que já existia continua editável, e a geração em lote ignora o que já foi criado.
    asStaff(`update public.charges set status = 'paid' where id in (1, 2)`)
    asStaff(`update public.charges set student_id = student_id, school_id = school_id where id = 1`)
    asStaff(`update public.student_goals set completed = true where id = 1`)
    asStaff(`update public.enrollments set status = 'cancelled' where id = '${id(299)}'`)
    asStaff(`${charge(15, SCHOOL_A, { enrollmentId: ENROLLMENT_B, due: '2026-10-10' })} on conflict (enrollment_id, due_date) do nothing`)

    // Aluno que mudou de escola: a matrícula antiga ainda pode ser cobrada, sem avulsa nova.
    sql(`update public.users set school_id = '${SCHOOL_B}' where id = '${STUDENT_A}'`)
    asStaff(charge(5, SCHOOL_A, { enrollmentId: ENROLLMENT_A }))
    refuses(charge(16, SCHOOL_A, { student: STUDENT_A }), NOT_STUDENT)

    assert.equal(sql('select count(*) from public.charges where id >= 10'), '0')
    for (const name of ['enforce_student_school', 'enforce_charge_enrollment_school']) {
      assert.equal(sql(`select has_function_privilege('authenticated', 'public.${name}()', 'execute')`), 'f')
    }
  } finally {
    if (started) run('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'immediate', '-w', 'stop'])
    rmSync(dir, { recursive: true, force: true })
  }
})
