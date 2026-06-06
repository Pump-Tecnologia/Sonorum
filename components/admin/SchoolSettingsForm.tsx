'use client'

import Link from 'next/link'
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
  logoUrl: string | null
  planType: string
  studentLimit: number
  pixKey: string | null
  pixKeyType: string | null
  pixCity: string | null
}

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Celular' },
  { value: 'random', label: 'Chave aleatória' },
]

const initial: SettingsActionState = { ok: false }

const DEFAULT_PRIMARY = '#2B4C79'
const DEFAULT_SECONDARY = '#7CC99B'

export function SchoolSettingsForm({ school, canBrand }: { school: SchoolData; canBrand: boolean }) {
  const [state, action] = useActionState(updateSchoolSettings, initial)
  const fe = state.fieldErrors ?? {}
  const [primary, setPrimary] = useState(school.brandPrimary ?? DEFAULT_PRIMARY)
  const [secondary, setSecondary] = useState(school.brandSecondary ?? DEFAULT_SECONDARY)

  return (
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
            label={
              canBrand
                ? 'Nome da marca (até 10 caracteres — aparece ao lado da logo)'
                : 'Nome exibido (deixe em branco para usar o nome do cadastro)'
            }
            htmlFor="customName"
            error={fe.customName}
          >
            <Input
              id="customName"
              name="customName"
              defaultValue={school.customName ?? ''}
              placeholder={school.name}
              maxLength={canBrand ? 10 : undefined}
            />
          </Field>

          {canBrand ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cor primária" htmlFor="brandPrimary" error={fe.brandPrimary}>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primary}
                      onChange={(e) => setPrimary(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-hairline"
                    />
                    <Input id="brandPrimary" name="brandPrimary" value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder={DEFAULT_PRIMARY} className="font-mono" />
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
                    <Input id="brandSecondary" name="brandSecondary" value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder={DEFAULT_SECONDARY} className="font-mono" />
                  </div>
                </Field>
              </div>

              <Field label="Logo (PNG, JPG, WEBP ou SVG · até 2MB)" htmlFor="logo" error={fe.logo}>
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
                {school.logoUrl && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={school.logoUrl} alt="Logo atual" className="h-8 w-8 object-contain" />
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <input type="checkbox" name="removeLogo" /> Remover logo
                    </label>
                  </div>
                )}
              </Field>

              {/* Preview */}
              <div className="flex h-12 items-center gap-3 rounded-xl px-4" style={{ backgroundColor: primary }}>
                <span className="text-sm font-semibold text-white">{school.customName || school.name}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: secondary, color: primary }}>Preview</span>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-hairline bg-surface-muted/40 p-4">
              <p className="text-sm font-medium text-ink">Logo e cores da marca — Premium</p>
              <p className="mt-1 text-sm text-ink-muted">
                Personalize a identidade da sua escola (logo e cores) no plano Premium.{' '}
                <Link href="/upgrade" className="font-medium text-brand-600 hover:underline">Fazer upgrade</Link>
              </p>
            </div>
          )}

          {/* Chave PIX — disponível em todos os planos (cobrança avulsa) */}
          <div className="space-y-4 rounded-xl border border-hairline bg-surface-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Recebimento PIX</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Sua chave PIX é usada para gerar a cobrança dos alunos. O pagamento cai direto na sua conta — o Sonorum não intermedia.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Chave PIX" htmlFor="pixKey" error={fe.pixKey}>
                <Input
                  id="pixKey"
                  name="pixKey"
                  defaultValue={school.pixKey ?? ''}
                  placeholder="email, CPF/CNPJ, celular ou chave aleatória"
                />
              </Field>
              <Field label="Tipo da chave" htmlFor="pixKeyType" error={fe.pixKeyType}>
                <select
                  id="pixKeyType"
                  name="pixKeyType"
                  defaultValue={school.pixKeyType ?? ''}
                  className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {PIX_KEY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Cidade do recebedor (aparece no comprovante PIX)"
              htmlFor="pixCity"
              error={fe.pixCity}
            >
              <Input id="pixCity" name="pixCity" defaultValue={school.pixCity ?? ''} placeholder="Ex.: São Paulo" />
            </Field>
          </div>

          <SubmitButton pendingLabel="Salvando…">Salvar configurações</SubmitButton>
        </form>
      </Card>
  )
}

// Card compacto do plano atual (lateral em Configurações).
export function PlanSummaryCard({ planType }: { planType: string }) {
  const features = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES] ?? PLAN_FEATURES.free
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-ink">Plano atual</h2>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{features.label}</p>
          <p className="text-xs text-ink-muted">
            {Number.isFinite(features.studentLimit) ? `Até ${features.studentLimit} alunos` : 'Alunos ilimitados'}
          </p>
        </div>
        <Badge tone={planType === 'free' ? 'neutral' : 'brand'}>{features.label}</Badge>
      </div>
    </Card>
  )
}
