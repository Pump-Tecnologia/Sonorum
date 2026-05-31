import styles from '@/components/app/app.module.css'
import { stopImpersonating } from '@/lib/actions/impersonate'

export function ImpersonationBanner({ asUserName }: { asUserName: string }) {
  return (
    <div className={styles.impersonationBanner}>
      <div className={styles.impersonationInner}>
        <p>
          Visualizando como <span className={styles.impersonationStrong}>{asUserName}</span> — modo
          de impersonação ativo.
        </p>
        <form action={stopImpersonating}>
          <button type="submit" className={styles.impersonationStop}>
            Voltar para minha conta
          </button>
        </form>
      </div>
    </div>
  )
}
