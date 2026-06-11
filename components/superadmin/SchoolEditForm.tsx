'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AppCard } from '@/components/app/AppCard'
import { AppField, AppInput, AppSelect } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import styles from '@/components/app/app.module.css'
import { updateSchool, type SchoolActionState } from '@/lib/actions/schools'
import { OVERRIDABLE_FEATURES, type OverridableFeature } from '@/lib/constants/plans'

interface SchoolEditData {
  id: string
  name: string
  planType: string
  monthlyPrice: number
  expirationDate: string | null
  featureOverrides: Record<string, boolean>
}

const initial: SchoolActionState = { ok: false }

const FEATURE_LABELS: Record<OverridableFeature, string> = {
  financial: 'Financeiro',
  reports: 'Relatórios',
  transcription: 'Transcrição IA',
  branding: 'Branding',
  whatsappOfficial: 'WhatsApp oficial',
}

// '' = segue o plano · 'on' = força ativar · 'off' = força desativar
function overrideValue(overrides: Record<string, boolean>, key: OverridableFeature): string {
  if (overrides[key] === true) return 'on'
  if (overrides[key] === false) return 'off'
  return ''
}

export function SchoolEditForm({ school }: { school: SchoolEditData }) {
  const [state, action] = useActionState(updateSchool, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <AppCard>
      <form action={action} className={styles.form} style={{ maxWidth: '32rem' }}>
        <input type="hidden" name="schoolId" value={school.id} />

        {state.ok && <p className={styles.success}>Escola atualizada! ✓</p>}
        {state.error && <p className={styles.alert}>{state.error}</p>}

        <div className={`${styles.formRow} ${styles.formRow2}`}>
          <AppField label="Plano" htmlFor="planType" error={fe.planType}>
            <AppSelect id="planType" name="planType" defaultValue={school.planType}>
              <option value="free">Essencial (grátis)</option>
              <option value="professional">Profissional</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Sob medida</option>
            </AppSelect>
          </AppField>

          <AppField label="Mensalidade (R$)" htmlFor="monthlyPrice" error={fe.monthlyPrice}>
            <AppInput
              id="monthlyPrice"
              name="monthlyPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={String(school.monthlyPrice)}
            />
          </AppField>
        </div>

        <AppField
          label="Vencimento do plano (opcional)"
          htmlFor="expirationDate"
          error={fe.expirationDate}
        >
          <AppInput
            id="expirationDate"
            name="expirationDate"
            type="date"
            defaultValue={school.expirationDate ?? ''}
          />
        </AppField>

        {/* Overrides de recursos por escola — sobretudo para o plano "Sob medida" */}
        <div>
          <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>
            Recursos (sobrescreve o plano)
          </p>
          <p className={styles.hint} style={{ marginBottom: '0.75rem' }}>
            Padrão = segue o plano. Use para liberar ou bloquear um recurso só nesta escola (ex.: Sob medida).
          </p>
          <div className={`${styles.formRow} ${styles.formRow2}`}>
            {OVERRIDABLE_FEATURES.map((key) => (
              <AppField key={key} label={FEATURE_LABELS[key]} htmlFor={`ov_${key}`}>
                <AppSelect
                  id={`ov_${key}`}
                  name={`ov_${key}`}
                  defaultValue={overrideValue(school.featureOverrides, key)}
                >
                  <option value="">Padrão do plano</option>
                  <option value="on">Ativado</option>
                  <option value="off">Desativado</option>
                </AppSelect>
              </AppField>
            ))}
          </div>
        </div>

        <AppSubmit pendingLabel="Salvando…">Salvar alterações</AppSubmit>
      </form>

      <Link href="/superadmin" className={styles.rowLink} style={{ marginTop: '1rem', display: 'inline-block' }}>
        ← Voltar para escolas
      </Link>
    </AppCard>
  )
}
