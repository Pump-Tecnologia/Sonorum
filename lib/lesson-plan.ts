// Conteúdo normalizado do plano da aula, independente de como está persistido.
// Fonte: lesson_plans.specific_data (envelope v:1) quando existir; senão hidrata
// das colunas legadas (warmup/repertoire/homework/target_bpm), garantindo que
// aulas antigas continuem aparecendo. Mantemos os dois em espelho ao salvar.

export interface PlanContent {
  sections: Record<string, string> // sectionId -> nota
  fields: Record<string, string> // fieldKey -> valor
  planNotes: string
}

interface PlanRow {
  warmup: string | null
  repertoire: string | null
  homework: string | null
  target_bpm: string | null
  notes: string | null
  specific_data: unknown
}

interface PlanEnvelope {
  v: number
  blueprintKey?: string
  sections?: Record<string, string>
  fields?: Record<string, string>
}

function isEnvelope(x: unknown): x is PlanEnvelope {
  return typeof x === 'object' && x !== null && (x as { v?: unknown }).v === 1
}

export function readPlanContent(plan: PlanRow | null): PlanContent {
  if (plan && isEnvelope(plan.specific_data)) {
    const env = plan.specific_data
    return {
      sections: { ...(env.sections ?? {}) },
      fields: { ...(env.fields ?? {}) },
      planNotes: plan.notes ?? '',
    }
  }

  // Hidrata do legado (colunas fixas) → ids canônicos de seção.
  const sections: Record<string, string> = {}
  if (plan?.warmup) sections.warmup = plan.warmup
  if (plan?.repertoire) sections.repertoire = plan.repertoire
  if (plan?.homework) sections.homework = plan.homework
  const fields: Record<string, string> = {}
  if (plan?.target_bpm) fields.target_bpm = plan.target_bpm
  return { sections, fields, planNotes: plan?.notes ?? '' }
}
