'use client'

import { useActionState } from 'react'

import { AppCard } from '@/components/app/AppCard'
import { AppField, AppInput, AppSelect } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import styles from '@/components/app/app.module.css'
import { InfoButton } from '@/components/ds/InfoButton'
import { updateSchool, type SchoolActionState } from '@/lib/actions/schools'
import { OVERRIDABLE_FEATURES, type OverridableFeature } from '@/lib/constants/plans'
import { TRANSCRIPTION_ENABLED } from '@/lib/constants/transcription'

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
    <AppCard className={styles.cardNarrow}>
      <form action={action} className={styles.form}>
        <input type="hidden" name="schoolId" value={school.id} />

        {state.ok && <p className={styles.success}>Escola atualizada</p>}
        {state.error && <p className={styles.alert}>{state.error}</p>}

        <div className={`${styles.formRow} ${styles.formRow2}`}>
          <AppField label="Plano" htmlFor="planType" error={fe.planType}>
            <AppSelect id="planType" name="planType" defaultValue={school.planType}>
              <option value="free">Essencial (grátis)</option>
              <option value="solo_free">Solo Essencial (grátis)</option>
              <option value="solo">Solo</option>
              <option value="solo_pro">Solo Pro</option>
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
          <div className="mt-2 mb-3 flex items-center gap-1">
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>Recursos da escola</h2>
            <InfoButton label="Sobre os recursos da escola">
              “Padrão do plano” segue o que o plano libera. Ativado ou Desativado vale só para esta escola, por exemplo no plano Sob medida.
            </InfoButton>
          </div>
          <div className={`${styles.formRow} ${styles.formRow2}`}>
            {(TRANSCRIPTION_ENABLED
              ? OVERRIDABLE_FEATURES
              : OVERRIDABLE_FEATURES.filter((k) => k !== 'transcription')
            ).map((key) => (
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

    </AppCard>
  )
}
