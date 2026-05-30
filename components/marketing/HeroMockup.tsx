import { IconCalendar, IconChart, IconCheck, IconClock, IconGrad, IconUsers, IconWallet } from '@/components/marketing/icons'
import styles from '@/components/marketing/marketing.module.css'

// Mockup do dashboard mostrado no hero — espelha o do Laravel antigo (sonorum.app/admin).
export function HeroMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.mockupFrame}>
        <div className={styles.mockupBar}>
          <span className={`${styles.mockupDot} ${styles.mockupDotRed}`} />
          <span className={`${styles.mockupDot} ${styles.mockupDotYellow}`} />
          <span className={`${styles.mockupDot} ${styles.mockupDotGreen}`} />
          <span className={styles.mockupUrl}>sonorum.app/admin</span>
        </div>

        <div className={styles.mockupBody}>
          <aside className={styles.mockupSidebar}>
            <div className={styles.mockupLogo}>S</div>
            <span className={`${styles.mockupNavItem} ${styles.mockupNavItemActive}`}><IconCalendar /></span>
            <span className={styles.mockupNavItem}><IconUsers /></span>
            <span className={styles.mockupNavItem}><IconWallet /></span>
            <span className={styles.mockupNavItem}><IconChart /></span>
            <span className={styles.mockupNavItem}><IconGrad /></span>
          </aside>

          <div className={styles.mockupMain}>
            <div className={styles.mockupHeader}>
              <div>
                <p className={styles.mockupGreeting}>Bom dia, Davi 👋</p>
                <p className={styles.mockupDate}>Quinta-feira, 22 de maio</p>
              </div>
              <div className={styles.mockupAddBtn}>+ Nova aula</div>
            </div>

            <div className={styles.mockupKpis}>
              <Kpi label="Alunos ativos" value="47" delta="↑ 3 este mês" up />
              <Kpi label="Aulas hoje" value="8" delta="3 pendentes" />
              <Kpi label="Recebido/mês" value="R$ 4.653" delta="↑ 12%" up accent />
            </div>

            <p className={styles.mockupSectionLabel}>Agenda de hoje</p>
            <div className={styles.mockupSchedule}>
              <Slot time="09:00" name="Ana Lima" tag="Violão" state="done" />
              <Slot time="10:30" name="Pedro Silva" tag="Piano" state="active" />
              <Slot time="14:00" name="Julia Costa" tag="Canto" />
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.mockupBadge} ${styles.mockupBadgePaid}`}>
        <IconCheck size={11} /> Mensalidade paga
      </div>
      <div className={`${styles.mockupBadge} ${styles.mockupBadgeNext}`}>
        <IconClock size={11} /> Aula em 15 min
      </div>
    </div>
  )
}

function Kpi({ label, value, delta, up, accent }: {
  label: string; value: string; delta: string; up?: boolean; accent?: boolean
}) {
  return (
    <div className={`${styles.mockupKpi} ${accent ? styles.mockupKpiAccent : ''}`}>
      <p className={styles.mockupKpiLabel}>{label}</p>
      <p className={styles.mockupKpiValue}>{value}</p>
      <p className={`${styles.mockupKpiDelta} ${up ? styles.mockupKpiDeltaUp : ''}`}>{delta}</p>
    </div>
  )
}

function Slot({ time, name, tag, state }: {
  time: string; name: string; tag: string; state?: 'done' | 'active'
}) {
  const stateClass = state === 'done' ? styles.mockupSlotDone : state === 'active' ? styles.mockupSlotActive : ''
  return (
    <div className={`${styles.mockupSlot} ${stateClass}`}>
      <span className={styles.mockupSlotTime}>{time}</span>
      <span className={styles.mockupSlotName}>{name}</span>
      <span className={styles.mockupSlotTag}>{tag}</span>
    </div>
  )
}
