'use client'

import { useActionState } from 'react'

import { Field, Input } from '@/components/ui/Field'
import { saveAndSendLessonReport, type NotifyActionState } from '@/lib/actions/notifications'
import { waLink } from '@/lib/notifications/whatsapp'

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

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={PRIMARY_BTN}>
          {pending ? 'Salvando…' : canSend ? 'Salvar e enviar' : 'Salvar relatório'}
        </button>
        {state.ok && <span className="text-sm font-medium text-accent-700">{canSend ? 'Salvo e enviado ✓' : 'Salvo ✓'}</span>}
        {state.error && <span className="text-sm font-medium text-red-600">{state.error}</span>}
      </div>

      {/* Ações manuais: ver/baixar a página e enviar por WhatsApp (clique direto) */}
      {hasReport && (
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Ver / baixar relatório ↗
          </a>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3ZM12 3a9 9 0 0 0-7.6 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.6.7.7-2.6-.2-.3a7.3 7.3 0 1 1 6.1 3.4Z" />
              </svg>
              Enviar no WhatsApp
            </a>
          )}
        </div>
      )}
      {canSend && <p className="text-xs text-ink-muted">Ao salvar, o relatório vai por e-mail (e WhatsApp oficial, quando ativo). O botão acima envia pelo seu WhatsApp.</p>}
    </form>
  )
}
