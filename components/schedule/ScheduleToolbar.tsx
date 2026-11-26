import { Button, IconButton } from '@/components/ds/Button'
import { IconChevronLeft, IconChevronRight, IconPlus } from '@/components/ds/icons'
import { SegmentedControl, type SegmentOption } from '@/components/ds/SegmentedControl'
import styles from '@/components/schedule/schedule.module.css'

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'

const VIEWS: ReadonlyArray<SegmentOption<CalendarView>> = [
  { value: 'dayGridMonth', label: 'Mês' },
  { value: 'timeGridWeek', label: 'Semana' },
  { value: 'timeGridDay', label: 'Dia' },
  { value: 'listWeek', label: 'Lista' },
]

const STEP_LABEL: Record<CalendarView, [string, string]> = {
  dayGridMonth: ['Mês anterior', 'Próximo mês'],
  timeGridWeek: ['Semana anterior', 'Próxima semana'],
  timeGridDay: ['Dia anterior', 'Próximo dia'],
  listWeek: ['Semana anterior', 'Próxima semana'],
}

interface ScheduleToolbarProps {
  title: string
  view: CalendarView
  isCurrentPeriod: boolean
  canCreate: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  onCreate: () => void
}

export function ScheduleToolbar({ title, view, isCurrentPeriod, canCreate, onPrev, onNext, onToday, onViewChange, onCreate }: ScheduleToolbarProps) {
  const [prevLabel, nextLabel] = STEP_LABEL[view]
  return (
    <header className={styles.toolbar}>
      <div className={styles.heading}>
        <h1 id="schedule-title" className={styles.kicker}>Agenda</h1>
        <p className={styles.period} aria-live="polite">{title || ' '}</p>
      </div>

      {canCreate && (
        <Button className={styles.create} onClick={onCreate}>
          <IconPlus /> Nova aula
        </Button>
      )}

      <div className={styles.controls}>
        <div className={styles.stepper}>
          <IconButton label={prevLabel} onClick={onPrev}><IconChevronLeft /></IconButton>
          <IconButton label={nextLabel} onClick={onNext}><IconChevronRight /></IconButton>
          <Button variant="soft" size="sm" onClick={onToday} disabled={isCurrentPeriod}>Hoje</Button>
        </div>
        <SegmentedControl label="Visão da agenda" options={VIEWS} value={view} onChange={onViewChange} />
      </div>
    </header>
  )
}
