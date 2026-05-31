'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useActionState, useState } from 'react'
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core'

import { AppButton } from '@/components/app/AppButton'
import { AppField, AppInput, AppSelect, AppTextarea } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import appStyles from '@/components/app/app.module.css'
import styles from '@/components/schedule/schedule.module.css'
import { cancelLesson, createLesson, type LessonActionState } from '@/lib/actions/lessons'

interface Person { id: string; name: string }

const initial: LessonActionState = { ok: false }

interface SelectedEvent {
  id: string
  title: string
  start: string
  end: string
  status: string
  notes: string
  student_name: string
  room: string
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Realizada',
  late: 'Atrasado',
  missed: 'Faltou',
  canceled: 'Cancelada',
}

export function ScheduleCalendar({
  students,
  teachers,
  rooms,
  role,
  userId,
}: {
  students: Person[]
  teachers: Person[]
  rooms: Person[]
  role: string
  userId: string
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [eventModal, setEventModal] = useState<SelectedEvent | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)
  const [state, action] = useActionState(createLesson, initial)
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [calendarKey, setCalendarKey] = useState(0)

  function handleDateSelect(info: DateSelectArg) {
    setSelectedRange({ start: info.startStr, end: info.endStr })
    setModalOpen(true)
  }

  function handleEventClick(info: EventClickArg) {
    const ep = info.event.extendedProps
    setEventModal({
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      status: ep.status,
      notes: ep.notes ?? '',
      student_name: ep.student_name,
      room: ep.room ?? '',
    })
  }

  function closeModals() {
    setModalOpen(false)
    setEventModal(null)
    setSelectedRange(null)
  }

  // Fecha o modal e remonta o calendário para refetch após criar
  if (state.ok && modalOpen) {
    closeModals()
    setCalendarKey((k) => k + 1)
  }

  const canManage = ['admin', 'teacher'].includes(role)

  return (
    <div className={styles.wrap}>
      {canManage && (
        <div className={styles.toolbar}>
          <AppButton onClick={() => setModalOpen(true)}>+ Nova aula</AppButton>
        </div>
      )}

      <div className={styles.calendar}>
        <FullCalendar
          key={calendarKey}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locale={ptBrLocale}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek',
          }}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            list: 'Lista',
          }}
          height="auto"
          selectable={canManage}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events="/api/lessons"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          allDaySlot={false}
          dayMaxEvents={3}
          nowIndicator
        />
      </div>

      {/* Modal criar aula */}
      {modalOpen && (
        <div className={styles.backdrop} onClick={closeModals}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nova aula</h2>
              <button onClick={closeModals} className={styles.modalClose} aria-label="Fechar">
                ✕
              </button>
            </div>

            {state.error && <p className={appStyles.alert}>{state.error}</p>}

            <form action={action} className={appStyles.form}>
              <AppField label="Aluno" htmlFor="studentId" error={state.fieldErrors?.studentId}>
                <AppSelect id="studentId" name="studentId" required defaultValue="">
                  <option value="" disabled>Selecione…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </AppSelect>
              </AppField>

              {role === 'admin' && teachers.length > 0 && (
                <AppField label="Professor (opcional)" htmlFor="teacherId">
                  <AppSelect id="teacherId" name="teacherId" defaultValue="">
                    <option value="">Nenhum</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </AppSelect>
                </AppField>
              )}
              {role === 'teacher' && <input type="hidden" name="teacherId" value={userId} />}

              {rooms.length > 0 && (
                <AppField label="Sala (opcional)" htmlFor="roomId">
                  <AppSelect id="roomId" name="roomId" defaultValue="">
                    <option value="">Sem sala</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </AppSelect>
                </AppField>
              )}

              <AppField label="Título" htmlFor="title" error={state.fieldErrors?.title}>
                <AppInput id="title" name="title" required defaultValue="Aula" />
              </AppField>

              <div className={`${appStyles.formRow} ${appStyles.formRow2}`}>
                <AppField label="Início" htmlFor="startDatetime" error={state.fieldErrors?.startDatetime}>
                  <AppInput
                    id="startDatetime"
                    name="startDatetime"
                    type="datetime-local"
                    defaultValue={selectedRange?.start?.slice(0, 16) ?? ''}
                    required
                  />
                </AppField>
                <AppField label="Fim" htmlFor="endDatetime" error={state.fieldErrors?.endDatetime}>
                  <AppInput
                    id="endDatetime"
                    name="endDatetime"
                    type="datetime-local"
                    defaultValue={selectedRange?.end?.slice(0, 16) ?? ''}
                    required
                  />
                </AppField>
              </div>

              <AppField label="Observações" htmlFor="notes">
                <AppTextarea id="notes" name="notes" rows={2} />
              </AppField>

              <label className={styles.checkRow} htmlFor="repeatWeekly">
                <input
                  type="checkbox"
                  id="repeatWeekly"
                  name="repeatWeekly"
                  value="true"
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                />
                Repetir semanalmente
              </label>

              {repeatWeekly && (
                <div className={styles.recurrenceBox}>
                  <AppField label="Modo de recorrência" htmlFor="recurrenceMode">
                    <AppSelect id="recurrenceMode" name="recurrenceMode" defaultValue="count">
                      <option value="count">Número de semanas</option>
                      <option value="until">Até uma data</option>
                    </AppSelect>
                  </AppField>
                  <div className={`${appStyles.formRow} ${appStyles.formRow2}`}>
                    <AppField label="Nº de semanas" htmlFor="recurrenceCount">
                      <AppInput
                        id="recurrenceCount"
                        name="recurrenceCount"
                        type="number"
                        min="1"
                        max="52"
                        defaultValue="4"
                      />
                    </AppField>
                    <AppField label="Até" htmlFor="recurrenceUntil">
                      <AppInput id="recurrenceUntil" name="recurrenceUntil" type="date" />
                    </AppField>
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.linkInline}
                  onClick={closeModals}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <AppSubmit pendingLabel="Criando…">Criar aula</AppSubmit>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe de evento */}
      {eventModal && (
        <div className={styles.backdrop} onClick={closeModals}>
          <div
            className={`${styles.modal} ${styles.modalSmall}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{eventModal.student_name}</h2>
                <p className={styles.modalSubtitle}>
                  {new Date(eventModal.start).toLocaleString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button onClick={closeModals} className={styles.modalClose} aria-label="Fechar">
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <strong>{STATUS_LABEL[eventModal.status] ?? eventModal.status}</strong>
              </p>
              {eventModal.room && (
                <p className={styles.detailRow}>
                  <span className={styles.detailLabel}>Sala:</span>
                  <strong>{eventModal.room}</strong>
                </p>
              )}
              {eventModal.notes && (
                <p className={styles.detailRow}>
                  <span className={styles.detailLabel}>Notas:</span>
                  <span>{eventModal.notes}</span>
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <a href={`/lessons/${eventModal.id}/planner`} className={styles.linkInline}>
                Abrir planejador →
              </a>
              {canManage && eventModal.status !== 'canceled' && (
                <form action={cancelLesson}>
                  <input type="hidden" name="lessonId" value={eventModal.id} />
                  <button
                    type="submit"
                    onClick={() => closeModals()}
                    className={styles.linkDanger}
                  >
                    Cancelar aula
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
