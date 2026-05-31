'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { AppCard } from '@/components/app/AppCard'
import { AppField, AppInput, AppSelect } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import styles from '@/components/app/app.module.css'
import { updateSchool, type SchoolActionState } from '@/lib/actions/schools'

interface SchoolEditData {
  id: string
  name: string
  planType: string
  monthlyPrice: number
  expirationDate: string | null
}

const initial: SchoolActionState = { ok: false }

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

        <AppSubmit pendingLabel="Salvando…">Salvar alterações</AppSubmit>
      </form>

      <Link href="/superadmin" className={styles.rowLink} style={{ marginTop: '1rem', display: 'inline-block' }}>
        ← Voltar para escolas
      </Link>
    </AppCard>
  )
}
