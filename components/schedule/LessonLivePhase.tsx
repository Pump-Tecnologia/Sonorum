import { SubmitButton } from '@/components/ds/Button'
import { ConfirmButton } from '@/components/ds/ConfirmButton'
import { Select } from '@/components/ds/Field'
import { IconArrowRight, IconChevronDown, IconPlay, IconRepeat } from '@/components/ds/icons'
import dsStyles from '@/components/ds/ds.module.css'
import { StatusPill } from '@/components/ds/StatusPill'
import { PlainSubmit } from '@/components/schedule/PlainSubmit'
import styles from '@/components/schedule/planner.module.css'
import { cancelLessonSeries, markAttendance, startLesson, updateLesson } from '@/lib/actions/lessons'
import { GENERAL_SECTION, type LessonBlueprint } from '@/lib/constants/lesson-blueprints'
import { LESSON_STATUS, lessonStatus, type LessonStatus } from '@/lib/constants/lessons'
import type { PlanContent } from '@/lib/lesson-plan'
import type { AttachedResource } from '@/components/schedule/LessonPlanEditor'

const DONE_STATUSES: ReadonlyArray<string> = ['completed', 'late', 'missed']

// Fim da aula em andamento: um botão por resultado de presença.
const ATTENDANCE = [
  { value: 'completed', label: 'Presente', className: styles.livePresent },
  { value: 'late', label: 'Chegou atrasado', className: styles.liveLate },
  { value: 'missed', label: 'Faltou', className: styles.liveMissed },
] as const

const SOFT_LINK = `${dsStyles.button} ${dsStyles.soft}`

function Hidden({ lessonId, status }: { lessonId: string; status?: string }) {
  return (
    <>
      <input type="hidden" name="lessonId" value={lessonId} />
      {status && <input type="hidden" name="status" value={status} />}
    </>
  )
}

/** "Ajustar status" recolhido: corrige um registro feito errado. */
function ManualStatus({ lessonId, status }: { lessonId: string; status: string }) {
  return (
    <details className={styles.manual}>
      <summary>Ajustar status <IconChevronDown /></summary>
      <form action={updateLesson} className={styles.manualForm}>
        <Hidden lessonId={lessonId} />
        <Select name="status" defaultValue={status} aria-label="Status da aula">
          {(Object.keys(LESSON_STATUS) as LessonStatus[]).map((value) => (
            <option key={value} value={value}>{LESSON_STATUS[value].label}</option>
          ))}
        </Select>
        <SubmitButton variant="soft" size="sm" pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </details>
  )
}

/** Cartão principal da fase Aula: começar, encerrar ou ver o que foi registrado. */
export function LiveActionCard({ lessonId, status, awaitingAttendance, isLive }: { lessonId: string; status: string; awaitingAttendance: boolean; isLive: boolean }) {
  const st = lessonStatus(status)

  if (status === 'in_progress') {
    return (
      <section className={styles.actionLive} aria-labelledby="live-action-title">
        <p className={styles.livePill}><span className={styles.pulse} aria-hidden="true" /> Aula em andamento</p>
        <h2 id="live-action-title" className={styles.actionTitle}>Como a aula terminou?</h2>
        <div className={styles.actionButtons}>
          {ATTENDANCE.map((b) => (
            <form key={b.value} action={markAttendance}>
              <Hidden lessonId={lessonId} status={b.value} />
              <PlainSubmit className={`${styles.liveButton} ${b.className}`} pendingLabel="Registrando…">{b.label}</PlainSubmit>
            </form>
          ))}
        </div>
        <ManualStatus lessonId={lessonId} status={status} />
      </section>
    )
  }

  if (DONE_STATUSES.includes(status) || status === 'canceled') {
    const canceled = status === 'canceled'
    return (
      <section className={styles.panel} aria-labelledby="live-action-title">
        <h2 id="live-action-title" className={styles.actionTitle}>{canceled ? 'Aula cancelada' : 'Aula registrada'}</h2>
        <div className={styles.actionResult}><StatusPill tone={st.tone}>{st.label}</StatusPill></div>
        {!canceled && (
          <div className={styles.actionButtons}>
            <a href="#avaliar" className={SOFT_LINK}>Ir para a avaliação <IconArrowRight /></a>
          </div>
        )}
        <ManualStatus lessonId={lessonId} status={status} />
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-labelledby="live-action-title">
      <h2 id="live-action-title" className={styles.actionTitle}>
        {!awaitingAttendance ? 'Pronto para começar?' : isLive ? 'A aula já começou' : 'O horário da aula já passou'}
      </h2>
      <div className={styles.actionButtons}>
        <form action={startLesson}>
          <Hidden lessonId={lessonId} />
          <SubmitButton pendingLabel="Iniciando…"><IconPlay /> Iniciar aula</SubmitButton>
        </form>
        <form action={markAttendance}>
          <Hidden lessonId={lessonId} status="missed" />
          <SubmitButton variant="danger" pendingLabel="Registrando…">Aluno faltou</SubmitButton>
        </form>
      </div>
      <ManualStatus lessonId={lessonId} status={status} />
    </section>
  )
}

interface TodayPlanProps {
  goals: string | null
  blueprint: LessonBlueprint
  content: PlanContent
  attached: AttachedResource[]
}

/** O plano em modo leitura, para conduzir a aula. */
export function TodayPlan({ goals, blueprint, content, attached }: TodayPlanProps) {
  const blueprintIds = new Set(blueprint.sections.map((s) => s.id))
  const sections = [
    ...blueprint.sections.map((s) => ({
      id: s.id,
      label: s.label,
      note: content.sections[s.id] ?? '',
      items: attached.filter((r) => r.section === s.id),
    })),
    {
      id: GENERAL_SECTION.id,
      label: GENERAL_SECTION.label,
      note: '',
      items: attached.filter((r) => r.section === 'general' || !blueprintIds.has(r.section)),
    },
  ].filter((s) => s.note || s.items.length > 0)
  const fields = blueprint.fields
    .map((f) => ({ label: f.label, value: content.fields[f.key] ?? '' }))
    .filter((f) => f.value)
  const hasPlan = Boolean(goals || sections.length || fields.length || content.planNotes)

  return (
    <section className={styles.panel} aria-labelledby="today-plan-title">
      <div className={styles.panelHead}>
        <h2 id="today-plan-title" className={styles.panelTitle}>Plano de hoje</h2>
      </div>
      {!hasPlan ? (
        <div className={styles.emptyPlan}>
          <p className={styles.empty}>Nada planejado para esta aula.</p>
          <a href="#planejar" className={`${SOFT_LINK} ${dsStyles.small}`}>Planejar agora</a>
        </div>
      ) : (
        <div className={styles.planList}>
          {goals && <PlanBlock label="Objetivos"><p className={styles.planText}>{goals}</p></PlanBlock>}
          {sections.map((s) => (
            <PlanBlock key={s.id} label={s.label}>
              {s.note && <p className={styles.planText}>{s.note}</p>}
              {s.items.length > 0 && (
                <ul className={styles.planItems}>
                  {s.items.map((r) => (
                    <li key={r.pivotId}>
                      <span>{r.title} <span className={styles.planItemMeta}>{r.category}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </PlanBlock>
          ))}
          {fields.length > 0 && (
            <div className={styles.planFields}>
              {fields.map((f) => (
                <div key={f.label} className={styles.tile}>
                  <p className={styles.planLabel}>{f.label}</p>
                  <p className={styles.tileValue}>{f.value}</p>
                </div>
              ))}
            </div>
          )}
          {content.planNotes && <PlanBlock label="Outras notas"><p className={styles.planText}>{content.planNotes}</p></PlanBlock>}
        </div>
      )}
    </section>
  )
}

function PlanBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={styles.planLabel}>{label}</p>
      {children}
    </div>
  )
}

/** "Horário e sala" recolhido, com o cancelamento da série quando houver. */
export function ScheduleDisclosure({ lessonId, inSeries, children }: { lessonId: string; inSeries: boolean; children: React.ReactNode }) {
  return (
    <details className={`${styles.panel} ${styles.disclosure}`}>
      <summary>
        <h2 className={styles.panelTitle}>Horário e sala</h2>
        {inSeries && <span className={`${styles.chip} ${styles.chipPlain}`}><IconRepeat /> Toda semana</span>}
        <span className={styles.chevron} aria-hidden="true"><IconChevronDown /></span>
      </summary>
      <div className={styles.disclosureBody}>
        {children}
        {inSeries && (
          <div className={styles.seriesFoot}>
            <ConfirmButton
              action={cancelLessonSeries}
              hidden={{ lessonId }}
              label="Cancelar a série"
              question="Cancelar esta aula e todas as próximas?"
              confirmLabel="Sim, cancelar"
              pendingLabel="Cancelando…"
            />
          </div>
        )}
      </div>
    </details>
  )
}
