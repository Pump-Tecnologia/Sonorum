'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ds/Button'
import { Field, FieldRow, Input, Select } from '@/components/ds/Field'
import { InfoButton } from '@/components/ds/InfoButton'
import { SchoolPlanOptions } from '@/components/superadmin/SchoolPlanOptions'
import { Card } from '@/components/ui/Card'
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

// '' segue o plano, 'on' força ativar e 'off' força desativar
function overrideValue(overrides: Record<string, boolean>, key: OverridableFeature): string {
  if (overrides[key] === true) return 'on'
  if (overrides[key] === false) return 'off'
  return ''
}

export function SchoolEditForm({ school }: { school: SchoolEditData }) {
  const [state, action] = useActionState(updateSchool, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <Card className="max-w-xl">
      <form action={action} className="space-y-5">
        <input type="hidden" name="schoolId" value={school.id} />

        {state.ok && <p className="sn-notice-ok" role="status">Escola atualizada</p>}
        {state.error && <p className="sn-alert" role="alert">{state.error}</p>}

        <FieldRow>
          <Field label="Plano" htmlFor="planType" error={fe.planType}>
            <Select id="planType" name="planType" defaultValue={school.planType}>
              <SchoolPlanOptions />
            </Select>
          </Field>

          <Field label="Mensalidade (R$)" htmlFor="monthlyPrice" error={fe.monthlyPrice}>
            <Input
              id="monthlyPrice"
              name="monthlyPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={String(school.monthlyPrice)}
              invalid={Boolean(fe.monthlyPrice)}
            />
          </Field>
        </FieldRow>

        <Field label="Vencimento do plano (opcional)" htmlFor="expirationDate" error={fe.expirationDate}>
          <Input
            id="expirationDate"
            name="expirationDate"
            type="date"
            defaultValue={school.expirationDate ?? ''}
            invalid={Boolean(fe.expirationDate)}
          />
        </Field>

        {/* Overrides de recursos por escola, sobretudo para o plano "Sob medida" */}
        <section aria-labelledby="school-features-title">
          <div className="mb-3 flex items-center gap-1">
            <h2 id="school-features-title" className="m-0 text-[17px] font-semibold tracking-tight text-(--sn-ink)">Recursos da escola</h2>
            <InfoButton label="Sobre os recursos da escola">
              “Padrão do plano” segue o que o plano libera. Ativado ou Desativado vale só para esta escola, por exemplo no plano Sob medida.
            </InfoButton>
          </div>
          <FieldRow>
            {(TRANSCRIPTION_ENABLED
              ? OVERRIDABLE_FEATURES
              : OVERRIDABLE_FEATURES.filter((k) => k !== 'transcription')
            ).map((key) => (
              <Field key={key} label={FEATURE_LABELS[key]} htmlFor={`ov_${key}`}>
                <Select
                  id={`ov_${key}`}
                  name={`ov_${key}`}
                  defaultValue={overrideValue(school.featureOverrides, key)}
                >
                  <option value="">Padrão do plano</option>
                  <option value="on">Ativado</option>
                  <option value="off">Desativado</option>
                </Select>
              </Field>
            ))}
          </FieldRow>
        </section>

        <SubmitButton className="w-full" pendingLabel="Salvando…">Salvar alterações</SubmitButton>
      </form>
    </Card>
  )
}
