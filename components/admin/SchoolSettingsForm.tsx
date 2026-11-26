'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { SubmitButton } from '@/components/auth/SubmitButton'
import { Card } from '@/components/ui/Card'
import { LinkButton } from '@/components/ds/Button'
import { InfoButton } from '@/components/ds/InfoButton'
import { Field, Input, Select } from '@/components/ui/Field'
import { updateSchoolSettings, type SettingsActionState } from '@/lib/actions/settings'
import { SCHOOL_BRAND_COLOR_ENABLED } from '@/lib/constants/branding'
import { PLAN_FEATURES } from '@/lib/constants/plans'

interface SchoolData {
  name: string
  customName: string | null
  brandPrimary: string | null
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

const DEFAULT_PRIMARY = '#25463C'

export function SchoolSettingsForm({ school, canBrand }: { school: SchoolData; canBrand: boolean }) {
  const [state, action] = useActionState(updateSchoolSettings, initial)
  const fe = state.fieldErrors ?? {}
  const [primary, setPrimary] = useState(school.brandPrimary ?? DEFAULT_PRIMARY)

  return (
    <Card>
      <h2 className="sn-card-title mb-5">Identidade</h2>
        <form
          action={action}
          onReset={(event) => event.preventDefault()}
          className="space-y-5"
        >
          {state.ok && (
            <p className="sn-notice-ok" role="status">Configurações salvas</p>
          )}
          {state.error && (
            <p className="sn-alert" role="alert">
              {state.error}
            </p>
          )}

          <Field
            label={canBrand ? 'Nome da marca' : 'Nome exibido'}
            hint={canBrand ? 'Até 10 caracteres. Aparece ao lado da logo.' : 'Em branco, usa o nome do cadastro.'}
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
              {SCHOOL_BRAND_COLOR_ENABLED && (
              <Field
                label="Cor da marca"
                htmlFor="brandPrimary"
                error={fe.brandPrimary}
                hint="Usada como acento: botões, links e o item ativo do menu. A interface continua com o tema padrão para garantir legibilidade."
              >
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="h-11 w-11 cursor-pointer rounded-full border-0 bg-transparent"
                  />
                  <Input id="brandPrimary" name="brandPrimary" value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder={DEFAULT_PRIMARY} className="max-w-[180px] font-mono" />
                </div>
              </Field>
              )}

              <Field label="Logo" htmlFor="logo" error={fe.logo} hint="PNG, JPG, WEBP ou SVG de até 2 MB.">
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full text-sm text-(--sn-text-muted) file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-(--sn-mint-soft) file:px-4 file:text-sm file:font-medium file:text-(--sn-ink-soft) hover:file:bg-(--sn-mint-hover)"
                />
                {school.logoUrl && (
                  <div className="sn-subpanel mt-2 flex items-center justify-between gap-3 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={school.logoUrl} alt="Logo atual" className="h-8 w-8 object-contain" />
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-(--sn-ink)">
                      <input type="checkbox" name="removeLogo" className="h-4 w-4 accent-(--sn-ink)" /> Remover logo
                    </label>
                  </div>
                )}
              </Field>

              {/* Preview do acento: botão + link */}
              {SCHOOL_BRAND_COLOR_ENABLED && (
              <div className="sn-subpanel flex items-center gap-3 py-3">
                <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>
                  Botão
                </span>
                <span className="text-sm font-semibold" style={{ color: primary }}>Link de exemplo</span>
                <span className="text-xs text-(--sn-text-muted)">cor de acento</span>
              </div>
              )}
            </>
          ) : (
            <div className="sn-subpanel flex flex-wrap items-center justify-between gap-3 border border-dashed border-(--sn-hairline-strong) shadow-none">
              <p className="m-0 text-[15px] text-(--sn-ink)">{SCHOOL_BRAND_COLOR_ENABLED ? 'Logo e cores da marca' : 'Logo e nome da marca'} no plano Premium</p>
              <Link href="/upgrade" className="sn-btn sn-btn-sm sn-btn-secondary">Ver planos</Link>
            </div>
          )}

          {/* Chave PIX — disponível em todos os planos (cobrança avulsa) */}
          <div className="sn-subpanel space-y-4">
            <div className="flex items-center gap-1">
              <h3 className="sn-card-title text-[15px]">Recebimento PIX</h3>
              <InfoButton label="Sobre o recebimento PIX">Sua chave PIX é usada para gerar a cobrança dos alunos. O pagamento cai direto na sua conta, sem intermediação do Sonorum.</InfoButton>
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
                <Select id="pixKeyType" name="pixKeyType" defaultValue={school.pixKeyType ?? ''}>
                  <option value="">Selecione…</option>
                  {PIX_KEY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Cidade do recebedor"
              hint="Aparece no comprovante do PIX."
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
      <h2 className="sn-card-title">Plano atual</h2>
      <p className="mt-3 mb-0 text-[28px] font-light tracking-tight text-(--sn-ink)">{features.label}</p>
      <p className="mt-1 mb-0 text-sm text-(--sn-text-muted)">
        {Number.isFinite(features.studentLimit) ? `Até ${features.studentLimit} alunos` : 'Alunos ilimitados'}
      </p>
      <LinkButton href="/upgrade" variant="soft" size="sm" className="mt-4">Ver planos</LinkButton>
    </Card>
  )
}
