// Planos que o superadmin pode atribuir a uma escola (criar e editar usam a mesma lista).
const SCHOOL_PLANS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'free', label: 'Essencial (grátis)' },
  { value: 'solo_free', label: 'Solo Essencial (grátis)' },
  { value: 'solo', label: 'Solo' },
  { value: 'solo_pro', label: 'Solo Pro' },
  { value: 'professional', label: 'Profissional' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Sob medida' },
]

export function SchoolPlanOptions() {
  return (
    <>
      {SCHOOL_PLANS.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </>
  )
}
