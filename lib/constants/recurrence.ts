// Presets de recorrência semanal. Cada um vira N ocorrências adicionais
// além da aula original. Ex.: 1 mês = 3 extras (1ª + 3 = 4 aulas total).
export const RECURRENCE_PRESETS = {
  none: { label: 'Não repetir', weeks: 0 },
  weekly_1m: { label: 'Toda semana por 1 mês', weeks: 4 },
  weekly_3m: { label: 'Toda semana por 3 meses', weeks: 13 },
  weekly_6m: { label: 'Toda semana por 6 meses', weeks: 26 },
  weekly_1y: { label: 'Toda semana por 1 ano', weeks: 52 },
} as const

export type RecurrencePreset = keyof typeof RECURRENCE_PRESETS

export function presetWeeks(preset: string): number {
  return RECURRENCE_PRESETS[preset as RecurrencePreset]?.weeks ?? 0
}
