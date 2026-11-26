'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useActionState, useState } from 'react'

import { AuthField, AuthInput } from '@/components/auth/AuthField'
import { AuthSubmit } from '@/components/auth/AuthSubmit'
import styles from '@/components/auth/auth.module.css'
import { signUp } from '@/lib/auth/actions'
import type { ActionState } from '@/lib/auth/schemas'
import { SELLABLE_PLANS } from '@/lib/constants/plans'

const initial: ActionState = { ok: false }

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initial)
  // Keep only non-sensitive fields in component memory across failed actions.
  // Password stays uncontrolled and is cleared by React's form reset.
  const [values, setValues] = useState({ schoolName: '', name: '', email: '' })
  const fe = state.fieldErrors ?? {}
  const params = useSearchParams()
  // Plano escolhido na landing → após o cadastro, cai no checkout dele.
  // solo_free é gratuito (não é "sellable") — segue o fluxo de cadastro grátis.
  const plan = params.get('plan')
  const isPaidPlan = SELLABLE_PLANS.includes(plan as (typeof SELLABLE_PLANS)[number])
  // Nos planos Solo/Solo Essencial/Solo Pro não existe "escola" — o campo
  // vira o nome do trabalho do professor.
  const isSolo = plan === 'solo_free' || plan === 'solo' || plan === 'solo_pro'
  // Destino interno alternativo (quando não há plano).
  const nextParam = params.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : null
  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : isPaidPlan
      ? `/login?next=${encodeURIComponent(`/upgrade?plan=${plan}`)}`
      : '/login'

  return (
    <form action={action} className={styles.form}>
      {plan && <input type="hidden" name="plan" value={plan} />}
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <p className={styles.alert}>{state.error}</p>}

      <AuthField
        label={isSolo ? 'Nome do seu trabalho' : 'Nome da escola'}
        htmlFor="schoolName"
        error={fe.schoolName}
        hint={isSolo ? 'Como você se apresenta para seus alunos. Pode ser seu próprio nome.' : undefined}
      >
        <AuthInput
          id="schoolName"
          name="schoolName"
          value={values.schoolName}
          onChange={(e) => setValues((v) => ({ ...v, schoolName: e.target.value }))}
          autoComplete="organization"
          placeholder={isSolo ? 'Ex.: Aulas de violão com Ana Souza' : 'Ex.: Escola Tom Maior'}
          invalid={Boolean(fe.schoolName)}
          required
        />
      </AuthField>

      <AuthField label="Seu nome" htmlFor="name" error={fe.name}>
        <AuthInput
          id="name"
          name="name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          autoComplete="name"
          placeholder="Como devemos te chamar?"
          invalid={Boolean(fe.name)}
          required
        />
      </AuthField>

      <AuthField label="E-mail" htmlFor="email" error={fe.email}>
        <AuthInput
          id="email"
          name="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          invalid={Boolean(fe.email)}
          required
        />
      </AuthField>

      <AuthField label="Senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres">
        <AuthInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(fe.password)}
          required
        />
      </AuthField>

      <AuthSubmit pendingLabel={isPaidPlan ? 'Indo para o pagamento…' : 'Criando…'}>
        {isPaidPlan ? 'Criar conta e ir ao pagamento' : 'Criar conta grátis'}
      </AuthSubmit>

      <p className={styles.footerLine}>
        Já tem conta? <Link href={loginHref}>Entrar</Link>
      </p>
    </form>
  )
}
