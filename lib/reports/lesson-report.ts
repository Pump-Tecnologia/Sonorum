import 'server-only'

import { notify, type NotifyResult } from '@/lib/notifications/notify'
import { appBaseUrl } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/server'

export type LessonReportDelivery = { ok: true; result: NotifyResult } | { ok: false; error: string }

// Monta e dispara o relatório da aula ao aluno (e-mail e WhatsApp). Usado pela ação do site
// e pela rota do app mobile. Quem chama já conferiu o papel de quem envia e o plano da escola.
export async function deliverLessonReport(lessonId: string, schoolId: string | null): Promise<LessonReportDelivery> {
  const admin = await createAdminClient()
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, title, start_datetime, notes, student_id, school_id, report:lesson_reports(technique_score, theory_score, repertoire_score, practice_score, current_song, initial_bpm, reached_bpm)')
    .eq('id', lessonId)
    .maybeSingle()

  // O admin client ignora RLS: a aula PRECISA ser da escola de quem envia.
  if (!lesson || !schoolId || lesson.school_id !== schoolId) return { ok: false, error: 'Aula não encontrada.' }
  const report = (Array.isArray(lesson.report) ? lesson.report[0] : lesson.report) as
    | { technique_score: number; theory_score: number; repertoire_score: number; practice_score: number; current_song: string | null; initial_bpm: number | null; reached_bpm: number | null }
    | null
  if (!report) return { ok: false, error: 'Preencha o relatório da aula antes de enviar.' }

  // O servidor roda em UTC: sem o fuso, aula a partir das 21h sairia com a data do dia seguinte.
  const lessonDate = new Date(lesson.start_datetime).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const bpm = report.initial_bpm && report.reached_bpm ? `${report.initial_bpm} → ${report.reached_bpm}` : null

  const result = await notify('lesson.report', lesson.student_id, {
    lessonTitle: lesson.title,
    lessonDate,
    reportUrl: `${appBaseUrl()}/relatorio/${lessonId}`,
    technique: report.technique_score,
    theory: report.theory_score,
    repertoire: report.repertoire_score,
    practice: report.practice_score,
    currentSong: report.current_song,
    bpm,
    notes: lesson.notes ?? null,
  }, { schoolId, relatedId: lessonId })

  return { ok: true, result }
}
