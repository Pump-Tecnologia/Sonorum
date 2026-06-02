'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useActionState, useEffect, useRef, useState } from 'react'
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core'

import { AppButton } from '@/components/app/AppButton'
import { AppField, AppInput, AppSelect, AppTextarea } from '@/components/app/AppField'
import { AppSubmit } from '@/components/app/AppSubmit'
import appStyles from '@/components/app/app.module.css'
import styles from '@/components/schedule/schedule.module.css'
import { Badge } from '@/components/ui/Badge'
import { lessonStatus } from '@/lib/constants/lessons'
import { RECURRENCE_PRESETS } from '@/lib/constants/recurrence'
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
  // Cancelamento em duas etapas (sem window.confirm): 1º clique arma, 2º executa.
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [state, action] = useActionState(createLesson, initial)
  // Ref pro FullCalendar — `refetchEvents()` preserva view (mês/semana/lista)
  // e data corrente. Antes era `key++`, que remontava tudo e mandava o usuário
  // de volta pra semana atual.
  const calendarRef = useRef<FullCalendar | null>(null)
  function refetch() { calendarRef.current?.getApi().refetchEvents() }

  function handleDateSelect(info: DateSelectArg) {
    setSelectedRange({ start: info.startStr, end: info.endStr })
    setModalOpen(true)
  }

  function handleEventClick(info: EventClickArg) {
    const ep = info.event.extendedProps
    setConfirmingCancel(false)
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
    setConfirmingCancel(false)
  }

  // Reage ao sucesso do create: fecha modal + refetch. Antes era um bloco
  // condicional no corpo do componente (setState durante render = warning/loop).
  useEffect(() => {
    if (state.ok) {
      closeModals()
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok])

  async function handleCancelLesson() {
    if (!eventModal) return
    setCanceling(true)
    try {
      const fd = new FormData()
      fd.set('lessonId', eventModal.id)
      await cancelLesson(fd)
      closeModals()
      refetch()
    } finally {
      setCanceling(false)
    }
  }

  const canManage = ['admin', 'teacher'].includes(role)
  const detailStatus = eventModal ? lessonStatus(eventModal.status) : null

  return (
    <div className={styles.wrap}>
      {canManage && (
        <div className={styles.toolbar}>
          <AppButton onClick={() => setModalOpen(true)}>+ Nova aula</AppButton>
        </div>
      )}

      <div className={styles.calendar}>
        <FullCalendar
          ref={calendarRef}
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

              <AppField label="Recorrência" htmlFor="recurrence">
                <AppSelect id="recurrence" name="recurrence" defaultValue="none">
                  {(Object.entries(RECURRENCE_PRESETS) as Array<[string, { label: string }]>).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </AppSelect>
              </AppField>

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
      {eventModal && detailStatus && (
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
                <Badge tone={detailStatus.tone}>{detailStatus.label}</Badge>
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
                confirmingCancel ? (
                  <span className={styles.confirmGroup}>
                    <button
                      type="button"
                      onClick={handleCancelLesson}
                      disabled={canceling}
                      className={styles.linkDanger}
                    >
                      {canceling ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={canceling}
                      className={styles.linkInline}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      Voltar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className={styles.linkDanger}
                  >
                    Cancelar aula
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
