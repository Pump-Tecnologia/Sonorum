import styles from '@/components/marketing/marketing.module.css'

const ITEMS = [
  'Agendamento inteligente',
  'Controle de mensalidades',
  'Portal do aluno',
  'Relatórios de desempenho',
  'Biblioteca pedagógica',
  'Repasse de professores',
  'Multi-professor',
]

export function Ticker() {
  // Repete 3x para o loop infinito não mostrar gaps durante a translação.
  const tripled = [...ITEMS, ...ITEMS, ...ITEMS]
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {tripled.map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            {item}
            <span className={styles.tickerSep}> · </span>
          </span>
        ))}
      </div>
    </div>
  )
}
