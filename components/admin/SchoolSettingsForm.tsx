'use client'

import { useActionState, useState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { updateSchoolSettings, type SettingsActionState } from '@/lib/actions/settings'
import { PLAN_FEATURES } from '@/lib/constants/plans'

interface SchoolData {
  name: string
  customName: string | null
  brandPrimary: string | null
  brandSecondary: string | null
  planType: string
  studentLimit: number
}

const initial: SettingsActionState = { ok: false }

const DEFAULT_PRIMARY = '#2B4C79'
const DEFAULT_SECONDARY = '#7CC99B'

export function SchoolSettingsForm({ school }: { school: SchoolData }) {
  const [state, action] = useActionState(updateSchoolSettings, initial)
  const fe = state.fieldErrors ?? {}
  const [primary, setPrimary] = useState(school.brandPrimary ?? DEFAULT_PRIMARY)
  const [secondary, setSecondary] = useState(school.brandSecondary ?? DEFAULT_SECONDARY)

  const features = PLAN_FEATURES[school.planType as keyof typeof PLAN_FEATURES] ?? PLAN_FEATURES.free

  return (
    <div className="max-w-xl space-y-6">
      {/* Plano atual — info apenas */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Plano atual</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{features.label}</p>
            <p className="text-sm text-ink-muted">
              {Number.isFinite(features.studentLimit)
                ? `Até ${features.studentLimit} alunos`
                : 'Alunos ilimitados'}
              {' · '}
              {Number.isFinite(features.teacherLimit)
                ? `${features.teacherLimit} professor`
                : 'Professores ilimitados'}
            </p>
          </div>
          <Badge tone={school.planType === 'free' ? 'neutral' : 'brand'}>
            {features.label}
          </Badge>
        </div>
      </Card>

      {/* Dados da escola */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Identidade</h2>
        <form action={action} className="space-y-5">
          {state.ok && (
            <p className="rounded-xl bg-accent-100 px-4 py-3 text-sm font-medium text-accent-800">
              Configurações salvas!
            </p>
          )}
          {state.error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {state.error}
            </p>
          )}

          <Field
            label="Nome exibido (deixe em branco para usar o nome do cadastro)"
            htmlFor="customName"
            error={fe.customName}
          >
            <Input
              id="customName"
              name="customName"
              defaultValue={school.customName ?? ''}
              placeholder={school.name}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor primária" htmlFor="brandPrimary" error={fe.brandPrimary}>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-hairline"
                />
                <Input
                  id="brandPrimary"
                  name="brandPrimary"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  placeholder={DEFAULT_PRIMARY}
                  className="font-mono"
                />
              </div>
            </Field>

            <Field label="Cor secundária" htmlFor="brandSecondary" error={fe.brandSecondary}>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-hairline"
                />
                <Input
                  id="brandSecondary"
                  name="brandSecondary"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  placeholder={DEFAULT_SECONDARY}
                  className="font-mono"
                />
              </div>
            </Field>
          </div>

          {/* Preview */}
          <div
            className="flex h-12 items-center gap-3 rounded-xl px-4"
            style={{ backgroundColor: primary }}
          >
            <span className="text-sm font-semibold text-white">
              {school.customName || school.name}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: secondary, color: primary }}
            >
              Preview
            </span>
          </div>

          <SubmitButton pendingLabel="Salvando…">Salvar configurações</SubmitButton>
        </form>
      </Card>
    </div>
  )
}
