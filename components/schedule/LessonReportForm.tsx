'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ds/Button'
import { Field, FieldRow, Input } from '@/components/ds/Field'
import { ExternalLink } from '@/components/ds/ExternalLink'
import dsStyles from '@/components/ds/ds.module.css'
import { InfoButton } from '@/components/ds/InfoButton'
import styles from '@/components/schedule/planner.module.css'
import { saveAndSendLessonReport, type NotifyActionState } from '@/lib/actions/notifications'
import { waLink } from '@/lib/notifications/whatsapp'

const REPORT_LABEL = { technique: 'Técnica', theory: 'Teoria', repertoire: 'Repertório', practice: 'Dedicação' }
const SKILLS = ['technique', 'theory', 'repertoire', 'practice'] as const
const SCALE = [1, 2, 3, 4, 5] as const

interface ReportData {
  technique_score?: number
  theory_score?: number
  repertoire_score?: number
  practice_score?: number
  current_song?: string | null
  initial_bpm?: number | null
  reached_bpm?: number | null
}

const initial: NotifyActionState = { ok: false }

// Relatório de desempenho (aba Avaliar). Salvar = salvar + (planos pagos) enviar
// por e-mail / WhatsApp oficial. Como a API oficial pode não estar ligada, há
// sempre o botão MANUAL de WhatsApp (clique direto → wa.me com o link da página
// pública do relatório) e o link "Ver relatório" pra abrir/baixar.
export function LessonReportForm({
  lessonId,
  report,
  canSend,
  studentName,
  studentPhone,
  reportUrl,
}: {
  lessonId: string
  report: ReportData | null
  canSend: boolean
  studentName: string
  studentPhone: string | null
  reportUrl: string
}) {
  const [state, action, pending] = useActionState(saveAndSendLessonReport, initial)
  const hasReport = Boolean(report) || state.ok
  const waUrl = waLink(studentPhone, `Olá ${studentName}! Segue o relatório da sua aula: ${reportUrl}`)

  return (
    <form action={action}>
      <input type="hidden" name="lessonId" value={lessonId} />

      <div className={styles.scores}>
        {SKILLS.map((key) => {
          const labelId = `${key}_score-label`
          return (
            <div key={key} className={styles.scoreRow}>
              <span id={labelId} className={styles.scoreLabel}>{REPORT_LABEL[key]}</span>
              <div role="radiogroup" aria-labelledby={labelId} className={styles.scale}>
                {SCALE.map((n) => (
                  <label key={n} className={styles.dot}>
                    <input
                      type="radio"
                      name={`${key}_score`}
                      value={n}
                      defaultChecked={report?.[`${key}_score` as keyof ReportData] === n}
                      aria-label={`${REPORT_LABEL[key]}: ${n} de 5`}
                    />
                    <span aria-hidden="true">{n}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.reportFields}>
        <Field label="Música atual" htmlFor="current_song">
          <Input id="current_song" name="current_song" defaultValue={report?.current_song ?? ''} />
        </Field>
        <FieldRow>
          <Field label="BPM inicial" htmlFor="initial_bpm">
            <Input id="initial_bpm" name="initial_bpm" type="number" inputMode="numeric" defaultValue={report?.initial_bpm ?? ''} />
          </Field>
          <Field label="BPM alcançado" htmlFor="reached_bpm">
            <Input id="reached_bpm" name="reached_bpm" type="number" inputMode="numeric" defaultValue={report?.reached_bpm ?? ''} />
          </Field>
        </FieldRow>
      </div>

      <div className={styles.reportFoot}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : canSend ? 'Salvar e enviar' : 'Salvar relatório'}
        </Button>
        {canSend && (
          <InfoButton label="Para onde vai o relatório">
            Ao salvar, o relatório vai por e-mail para o aluno, e pelo WhatsApp oficial quando estiver ligado.
            O botão do WhatsApp abaixo manda pelo seu próprio WhatsApp.
          </InfoButton>
        )}
        {state.ok && !pending && <p className={styles.ok} role="status">{canSend ? 'Salvo e enviado' : 'Relatório salvo'}</p>}
        {state.error && !pending && <p className={styles.bad} role="alert">{state.error}</p>}
      </div>

      {/* Ações manuais: ver/baixar a página e enviar por WhatsApp (clique direto) */}
      {hasReport && (
        <div className={styles.share}>
          <ExternalLink href={reportUrl} className={styles.textLink}>Ver relatório</ExternalLink>
          {waUrl && (
            <ExternalLink href={waUrl} showIcon={false} className={`${dsStyles.button} ${dsStyles.soft} ${dsStyles.small}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3ZM12 3a9 9 0 0 0-7.6 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.6.7.7-2.6-.2-.3a7.3 7.3 0 1 1 6.1 3.4Z" />
              </svg>
              Enviar no WhatsApp
            </ExternalLink>
          )}
        </div>
      )}
    </form>
  )
}
