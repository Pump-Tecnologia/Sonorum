'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useActionState, useState } from 'react'
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core'

import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
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
}

export function ScheduleCalendar({
  students,
  teachers,
  role,
  userId,
}: {
  students: Person[]
  teachers: Person[]
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

  return (
    <div>
      {/* Botão para abrir modal sem arrastar */}
      {['admin', 'teacher'].includes(role) && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setModalOpen(true)}>+ Nova aula</Button>
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-surface p-4">
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
          height="auto"
          selectable={['admin', 'teacher'].includes(role)}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events="/api/lessons"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
        />
      </div>

      {/* Modal criar aula */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Nova aula</h2>
              <button onClick={closeModals} className="text-ink-muted hover:text-ink">✕</button>
            </div>

            {state.error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
            )}

            <form action={action} className="space-y-4">
              <Field label="Aluno" htmlFor="studentId" error={state.fieldErrors?.studentId}>
                <Select id="studentId" name="studentId" required>
                  <option value="">Selecione…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>

              {role === 'admin' && teachers.length > 0 && (
                <Field label="Professor (opcional)" htmlFor="teacherId">
                  <Select id="teacherId" name="teacherId">
                    <option value="">Nenhum</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {role === 'teacher' && (
                <input type="hidden" name="teacherId" value={userId} />
              )}

              <Field label="Título" htmlFor="title" error={state.fieldErrors?.title}>
                <Input id="title" name="title" required defaultValue="Aula" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Início" htmlFor="startDatetime" error={state.fieldErrors?.startDatetime}>
                  <Input
                    id="startDatetime"
                    name="startDatetime"
                    type="datetime-local"
                    defaultValue={selectedRange?.start?.slice(0, 16) ?? ''}
                    required
                  />
                </Field>
                <Field label="Fim" htmlFor="endDatetime" error={state.fieldErrors?.endDatetime}>
                  <Input
                    id="endDatetime"
                    name="endDatetime"
                    type="datetime-local"
                    defaultValue={selectedRange?.end?.slice(0, 16) ?? ''}
                    required
                  />
                </Field>
              </div>

              <Field label="Observações" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} />
              </Field>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repeatWeekly"
                  name="repeatWeekly"
                  value="true"
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                  className="h-4 w-4 rounded border-hairline"
                />
                <label htmlFor="repeatWeekly" className="text-sm text-ink">Repetir semanalmente</label>
              </div>

              {repeatWeekly && (
                <div className="space-y-3 rounded-xl border border-hairline p-4">
                  <Field label="Modo de recorrência" htmlFor="recurrenceMode">
                    <Select id="recurrenceMode" name="recurrenceMode" defaultValue="count">
                      <option value="count">Número de semanas</option>
                      <option value="until">Até uma data</option>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nº de semanas" htmlFor="recurrenceCount">
                      <Input id="recurrenceCount" name="recurrenceCount" type="number" min="1" max="52" defaultValue="4" />
                    </Field>
                    <Field label="Até" htmlFor="recurrenceUntil">
                      <Input id="recurrenceUntil" name="recurrenceUntil" type="date" />
                    </Field>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={closeModals}>Cancelar</Button>
                <Button type="submit">Criar aula</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe de evento */}
      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{eventModal.student_name}</h2>
                <p className="text-sm text-ink-muted">
                  {new Date(eventModal.start).toLocaleString('pt-BR', {
                    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button onClick={closeModals} className="text-ink-muted hover:text-ink">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-ink-muted">Status: </span>
                <span className="font-semibold capitalize">{eventModal.status}</span>
              </p>
              {eventModal.notes && (
                <p>
                  <span className="font-medium text-ink-muted">Notas: </span>
                  {eventModal.notes}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-between">
              <a
                href={`/lessons/${eventModal.id}/planner`}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Abrir planejador →
              </a>
              {['admin', 'teacher'].includes(role) && eventModal.status !== 'canceled' && (
                <form action={cancelLesson}>
                  <input type="hidden" name="lessonId" value={eventModal.id} />
                  <button
                    type="submit"
                    onClick={() => closeModals()}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
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
