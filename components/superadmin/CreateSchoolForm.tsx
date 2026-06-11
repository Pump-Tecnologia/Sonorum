'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AppCard } from '@/components/app/AppCard'
import { AppField, AppInput, AppSelect } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import styles from '@/components/app/app.module.css'
import { createSchool, type SchoolActionState } from '@/lib/actions/schools'

const initial: SchoolActionState = { ok: false }

export function CreateSchoolForm() {
  const [state, action] = useActionState(createSchool, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok) {
    return (
      <AppCard>
        <p className={styles.success}>Escola criada! ✓</p>
        <p style={{ margin: '0.875rem 0 0.5rem 0', fontSize: '0.9375rem' }}>
          Admin: <strong>{state.createdEmail}</strong>
          <br />
          Senha temporária:{' '}
          <code
            style={{
              padding: '0.125rem 0.5rem',
              background: 'var(--ds-canvas)',
              borderRadius: '0.375rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.875rem',
            }}
          >
            {state.tempPassword}
          </code>
        </p>
        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
          Anote agora — esta senha não será exibida de novo. Peça ao admin para trocá-la no primeiro acesso.
        </p>
        <Link href="/superadmin" className={styles.rowLink}>
          ← Voltar para escolas
        </Link>
      </AppCard>
    )
  }

  return (
    <AppCard>
      <form action={action} className={styles.form} style={{ maxWidth: '32rem' }}>
        {state.error && <p className={styles.alert}>{state.error}</p>}

        <AppField label="Nome da escola" htmlFor="name" error={fe.name}>
          <AppInput
            id="name"
            name="name"
            placeholder="Ex.: Escola Tom Maior"
            invalid={Boolean(fe.name)}
            required
          />
        </AppField>

        <AppField label="E-mail do administrador" htmlFor="adminEmail" error={fe.adminEmail}>
          <AppInput
            id="adminEmail"
            name="adminEmail"
            type="email"
            placeholder="admin@escola.com"
            invalid={Boolean(fe.adminEmail)}
            required
          />
        </AppField>

        <div className={`${styles.formRow} ${styles.formRow2}`}>
          <AppField label="Plano" htmlFor="planType" error={fe.planType}>
            <AppSelect id="planType" name="planType" defaultValue="free">
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
              defaultValue="0"
            />
          </AppField>
        </div>

        <AppSubmit pendingLabel="Criando…">Criar escola</AppSubmit>
      </form>
    </AppCard>
  )
}
