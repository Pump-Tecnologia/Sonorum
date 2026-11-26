import { SubmitButton } from '@/components/ds/Button'
import { IconArrowLeft } from '@/components/ds/icons'
import styles from '@/components/app/app.module.css'
import { stopImpersonating } from '@/lib/actions/impersonate'

const ROLE_LABEL: Record<string, string> = {
  admin: 'administrador',
  teacher: 'professor',
  student: 'aluno',
}

// Faixa fixa no topo enquanto o admin "entra como" outra pessoa: o estado é
// sensível (tudo o que fizer vale na conta dela), então fica escura e sempre visível.
export function ImpersonationBanner({ asUserName, asRole }: { asUserName: string; asRole: string }) {
  const role = ROLE_LABEL[asRole]
  return (
    <aside className={styles.impersonation} aria-label="Você está usando outra conta">
      <p className={styles.impersonationText}>
        <span className={styles.impersonationDot} aria-hidden="true" />
        <span>
          Usando como <strong>{asUserName.trim()}</strong>{role ? `, ${role}` : ''}
        </span>
      </p>
      <form action={stopImpersonating}>
        <SubmitButton size="sm" pendingLabel="Voltando…" className={styles.impersonationStop}>
          <IconArrowLeft /> Voltar para minha conta
        </SubmitButton>
      </form>
    </aside>
  )
}
