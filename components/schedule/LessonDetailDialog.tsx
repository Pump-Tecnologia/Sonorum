'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button, LinkButton } from '@/components/ds/Button'
import { Dialog, DialogFooter } from '@/components/ds/Dialog'
import { IconArrowRight, IconClock, IconDoor, IconNote } from '@/components/ds/icons'
import { StatusPill } from '@/components/ds/StatusPill'
import styles from '@/components/schedule/schedule.module.css'
import { lessonStatus } from '@/lib/constants/lessons'
import { cancelLesson } from '@/lib/actions/lessons'

export interface SelectedLesson {
  id: string
  title: string
  start: string
  end: string
  status: string
  notes: string
  studentName: string
  studentId: string
  room: string
}

const TZ = 'America/Sao_Paulo'

function formatWhen(start: string, end: string): string {
  const day = new Date(start).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
  const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time(start)}${end ? ` às ${time(end)}` : ''}`
}

interface LessonDetailDialogProps {
  lesson: SelectedLesson
  canManage: boolean
  isAdmin: boolean
  onClose: () => void
  onChanged: () => void
}

export function LessonDetailDialog({ lesson, canManage, isAdmin, onClose, onChanged }: LessonDetailDialogProps) {
  // Cancelamento em duas etapas (sem window.confirm): 1º clique arma, 2º executa.
  const [confirming, setConfirming] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')

  const status = lessonStatus(lesson.status)
  const title = isAdmin && lesson.studentId
    ? <Link href={`/admin/students/${lesson.studentId}`} className={styles.titleLink}>{lesson.studentName}</Link>
    : lesson.studentName

  async function handleCancel() {
    setCanceling(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('lessonId', lesson.id)
      await cancelLesson(fd)
      onChanged()
    } catch {
      setError('Não foi possível cancelar a aula agora. Tente de novo em instantes.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={title} subtitle={lesson.title} size="sm">
      <StatusPill tone={status.tone}>{status.label}</StatusPill>

      <dl className={styles.details}>
        <div>
          <dt><IconClock /><span className={styles.srOnly}>Quando</span></dt>
          <dd className={styles.capitalize}>{formatWhen(lesson.start, lesson.end)}</dd>
        </div>
        {lesson.room && (
          <div>
            <dt><IconDoor /><span className={styles.srOnly}>Sala</span></dt>
            <dd>{lesson.room}</dd>
          </div>
        )}
        {lesson.notes && (
          <div>
            <dt><IconNote /><span className={styles.srOnly}>Observações</span></dt>
            <dd>{lesson.notes}</dd>
          </div>
        )}
      </dl>

      {error && <p className={styles.inlineError} role="alert">{error}</p>}

      <DialogFooter>
        {canManage && lesson.status !== 'canceled' && (
          confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={canceling}>Voltar</Button>
              <Button variant="danger" onClick={handleCancel} disabled={canceling} aria-busy={canceling}>
                {canceling ? 'Cancelando…' : 'Confirmar cancelamento'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" className={styles.cancelTrigger} onClick={() => setConfirming(true)}>Cancelar aula</Button>
          )
        )}
        {!confirming && (
          <LinkButton href={`/lessons/${lesson.id}/planner`}>
            Abrir aula <IconArrowRight />
          </LinkButton>
        )}
      </DialogFooter>
    </Dialog>
  )
}
