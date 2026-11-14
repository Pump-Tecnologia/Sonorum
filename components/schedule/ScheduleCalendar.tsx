'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DatesSetArg, DateSelectArg, DayHeaderContentArg, EventClickArg, EventContentArg } from '@fullcalendar/core'

import { LessonDetailDialog, type SelectedLesson } from '@/components/schedule/LessonDetailDialog'
import { NewLessonDialog, type Person } from '@/components/schedule/NewLessonDialog'
import { ScheduleToolbar, type CalendarView } from '@/components/schedule/ScheduleToolbar'
import styles from '@/components/schedule/schedule.module.css'

// Abaixo desta largura a agenda abre na lista da semana: a grade do mês não cabe.
const NARROW_QUERY = '(max-width: 640px)'

interface LessonProps {
  tone?: string
  lesson_title?: string
  student_name?: string
  student_id?: string
  status?: string
  notes?: string
  room?: string
  instrument?: unknown
}

function firstInstrument(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : ''
}

// Conteúdo do evento. O tom (cor do instrumento ou da falta) vem da API.
function renderEvent(arg: EventContentArg) {
  const props = arg.event.extendedProps as LessonProps
  const name = props.student_name || arg.event.title
  const tone = props.tone ?? 'outro'
  const status = props.status ?? 'scheduled'
  const start = arg.event.start
    ? arg.event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''

  const instrument = firstInstrument(props.instrument)

  // Lista: o mesmo card da semana; a hora já aparece na coluna ao lado.
  if (arg.view.type.startsWith('list')) {
    const meta = [instrument || props.lesson_title, props.room].filter(Boolean).join(' · ')
    return (
      <div className={`${styles.event} ${styles.eventInList}`} data-tone={tone} data-status={status}>
        <span className={styles.eventName}>{name}</span>
        {meta && <span className={styles.eventMeta}>{meta}</span>}
      </div>
    )
  }

  // Mês: ponto, hora e primeiro nome, para caber na célula sem cortar.
  if (!arg.view.type.startsWith('timeGrid')) {
    return (
      <span className={styles.monthEvent} data-tone={tone} data-status={status}>
        <span className={styles.monthDot} aria-hidden="true" />
        <span className={styles.monthTime}>{start}</span>
        <span className={styles.monthName}>{name.trim().split(/\s+/)[0]}</span>
      </span>
    )
  }

  // Semana e dia: nome em cima; embaixo, hora de início e instrumento (ou sala).
  const detail = instrument || props.room
  return (
    <div className={styles.event} data-tone={tone} data-status={status}>
      <span className={styles.eventName}>{name}</span>
      <span className={styles.eventMeta}>{detail ? `${start} · ${detail}` : start}</span>
    </div>
  )
}

// Cabeçalho do dia: no mês só o dia da semana; na semana e no dia, também o número.
// O nome do dia vem de arg.text (dayHeaderFormat): no mês o FullCalendar passa
// arg.date em UTC, e formatar no fuso local deslocava o rótulo em um dia.
function renderDayHeader(arg: DayHeaderContentArg) {
  // A lista usa o mesmo gancho para o título de cada dia ("terça-feira, 3 de novembro").
  if (arg.view.type.startsWith('list')) return arg.text
  const weekday = arg.text.replace('.', '')
  if (arg.view.type === 'dayGridMonth') return <span className={styles.weekday}>{weekday}</span>
  return (
    <span className={styles.dayHead}>
      <span className={styles.weekday}>{weekday}</span>
      <span className={styles.dayNumber} data-today={arg.isToday || undefined}>{arg.date.getDate()}</span>
    </span>
  )
}

interface ScheduleCalendarProps {
  students: Person[]
  teachers: Person[]
  rooms: Person[]
  role: string
  userId: string
}

export function ScheduleCalendar({ students, teachers, rooms, role, userId }: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [period, setPeriod] = useState({ title: '', view: 'dayGridMonth' as CalendarView, isCurrent: true })
  const [creating, setCreating] = useState<{ key: number; range?: { start: string; end: string } } | null>(null)
  const [selected, setSelected] = useState<SelectedLesson | null>(null)

  const canManage = ['admin', 'teacher'].includes(role)
  const api = () => calendarRef.current?.getApi()

  // refetchEvents() preserva a visão e a data; remontar o calendário voltaria
  // o usuário para a semana atual.
  const refetch = useCallback(() => calendarRef.current?.getApi().refetchEvents(), [])

  useEffect(() => {
    if (window.matchMedia(NARROW_QUERY).matches) calendarRef.current?.getApi().changeView('listWeek')
  }, [])

  function handleDatesSet(arg: DatesSetArg) {
    const now = Date.now()
    setPeriod({
      title: arg.view.title,
      view: arg.view.type as CalendarView,
      isCurrent: arg.view.currentStart.getTime() <= now && now < arg.view.currentEnd.getTime(),
    })
  }

  function openCreate(range?: { start: string; end: string }) {
    setCreating({ key: Date.now(), range })
  }

  function handleSelect(info: DateSelectArg) {
    openCreate({ start: info.startStr, end: info.endStr })
    api()?.unselect()
  }

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as LessonProps
    setSelected({
      id: info.event.id,
      title: props.lesson_title ?? info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      status: props.status ?? 'scheduled',
      notes: props.notes ?? '',
      studentName: props.student_name || info.event.title,
      studentId: props.student_id ?? '',
      room: props.room ?? '',
    })
  }

  const handleCreated = useCallback(() => {
    setCreating(null)
    refetch()
  }, [refetch])

  return (
    <section className={styles.stage} aria-labelledby="schedule-title">
      <ScheduleToolbar
        title={period.title}
        view={period.view}
        isCurrentPeriod={period.isCurrent}
        canCreate={canManage}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
        onViewChange={(view) => api()?.changeView(view)}
        onCreate={() => openCreate()}
      />

      <div className={styles.calendar}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locale={ptBrLocale}
          initialView="dayGridMonth"
          headerToolbar={false}
          height="auto"
          selectable={canManage}
          select={handleSelect}
          eventClick={handleEventClick}
          eventContent={renderEvent}
          datesSet={handleDatesSet}
          events="/api/lessons"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderFormat={{ weekday: 'short' }}
          listDayFormat={{ weekday: 'long', day: 'numeric', month: 'long' }}
          listDaySideFormat={false}
          dayHeaderContent={renderDayHeader}
          allDaySlot={false}
          dayMaxEvents={3}
          moreLinkContent={(arg) => `+${arg.num} ${arg.num === 1 ? 'aula' : 'aulas'}`}
          noEventsContent="Nenhuma aula nesta semana."
          nowIndicator
        />
      </div>

      {creating && (
        <NewLessonDialog
          key={creating.key}
          open
          range={creating.range}
          students={students}
          teachers={teachers}
          rooms={rooms}
          role={role}
          userId={userId}
          onClose={() => setCreating(null)}
          onCreated={handleCreated}
        />
      )}

      {selected && (
        <LessonDetailDialog
          key={selected.id}
          lesson={selected}
          canManage={canManage}
          isAdmin={role === 'admin'}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            refetch()
          }}
        />
      )}
    </section>
  )
}
