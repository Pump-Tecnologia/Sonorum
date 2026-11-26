// Textos de limite do plano, com o plural certo ("1 professor", "3 professores").

function countLabel(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function teacherCount(count: number): string {
  return countLabel(count, 'professor', 'professores')
}

export function studentCount(count: number): string {
  return countLabel(count, 'aluno', 'alunos')
}

/** "O plano Solo chegou ao limite de 1 professor. Veja os planos para cadastrar mais." */
export function planLimitMessage(planLabel: string, limit: string, withPlansHint = true): string {
  const base = `O plano ${planLabel} chegou ao limite de ${limit}.`
  return withPlansHint ? `${base} Veja os planos para cadastrar mais.` : base
}
