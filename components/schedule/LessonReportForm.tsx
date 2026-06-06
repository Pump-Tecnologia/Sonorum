'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Field, Input } from '@/components/ui/Field'
import { saveAndSendLessonReport, type NotifyActionState } from '@/lib/actions/notifications'

const REPORT_LABEL = { technique: 'Técnica', theory: 'Teoria', repertoire: 'Repertório', practice: 'Dedicação' }
const SKILLS = ['technique', 'theory', 'repertoire', 'practice'] as const
const PRIMARY_BTN = 'rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60'

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

// Relatório de desempenho (aba Avaliar). Salvar = salvar + (nos planos pagos)
// enviar ao aluno; abre o WhatsApp quando o envio devolve links wa.me.
export function LessonReportForm({ lessonId, report, canSend }: { lessonId: string; report: ReportData | null; canSend: boolean }) {
  const [state, action, pending] = useActionState(saveAndSendLessonReport, initial)
  const handled = useRef<NotifyActionState | null>(null)

  useEffect(() => {
    if (state === handled.current) return
    handled.current = state
    if (state.ok && state.whatsappLinks?.length) {
      for (const l of state.whatsappLinks) window.open(l.url, '_blank', 'noopener,noreferrer')
    }
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />

      {SKILLS.map((key) => (
        <Field key={key} label={REPORT_LABEL[key]} htmlFor={`${key}_score`}>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${key}_score`}
                  value={n}
                  defaultChecked={report?.[`${key}_score` as keyof ReportData] === n}
                  className="peer sr-only"
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-sm font-semibold transition-colors hover:bg-brand-50 peer-checked:border-brand-500 peer-checked:bg-brand-600 peer-checked:text-white">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </Field>
      ))}

      <Field label="Música atual" htmlFor="current_song">
        <Input id="current_song" name="current_song" defaultValue={report?.current_song ?? ''} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="BPM inicial" htmlFor="initial_bpm">
          <Input id="initial_bpm" name="initial_bpm" type="number" defaultValue={report?.initial_bpm ?? ''} />
        </Field>
        <Field label="BPM alcançado" htmlFor="reached_bpm">
          <Input id="reached_bpm" name="reached_bpm" type="number" defaultValue={report?.reached_bpm ?? ''} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY_BTN}>
          {pending ? 'Salvando…' : canSend ? 'Salvar e enviar ao aluno' : 'Salvar relatório'}
        </button>
        {state.ok && <span className="text-sm font-medium text-accent-700">{canSend ? 'Salvo e enviado ✓' : 'Salvo ✓'}</span>}
        {state.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
      </div>
      {canSend && <p className="text-xs text-ink-muted">Ao salvar, o relatório é enviado ao aluno por e-mail/WhatsApp.</p>}
    </form>
  )
}
