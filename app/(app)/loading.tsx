import styles from '@/components/app/status.module.css'

// Carregamento entre telas da área logada: aviso e esqueleto no lugar do conteúdo.
export default function AppLoading() {
  return (
    <div className={styles.loading}>
      <p className={styles.loadingPill} role="status">Carregando…</p>
      <div className={styles.skeletonRow} aria-hidden="true">
        <div className={styles.skeletonTile} />
        <div className={styles.skeletonTile} />
        <div className={styles.skeletonTile} />
      </div>
      <div className={styles.skeletonPanel} aria-hidden="true" />
    </div>
  )
}
