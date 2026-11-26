'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import styles from '@/components/app/app.module.css'
import { IconArrowRight, IconClose } from '@/components/ds/icons'
import { markAttendance } from '@/lib/actions/lessons'

interface UpcomingLesson {
  id: string
  title: string
  studentName: string
  start: string
  end: string
  status: string
}

const POLL_MS = 30_000

// Lembrete global (professor): quando uma aula está a ≤5 min ou em andamento,
// mostra um aviso flutuante com atalho para PREPARAR a aula (abre a tela) ou
// marcar falta. Não aparece na própria tela da aula.
export function UpcomingLessonReminder() {
  const pathname = usePathname()
  const [lesson, setLesson] = useState<UpcomingLesson | null>(null)
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch('/api/upcoming-lesson', { cache: 'no-store' })
        const data = (await res.json()) as { lesson: UpcomingLesson | null }
        if (active) setLesson(data.lesson)
      } catch {
        /* silencioso — lembrete é best-effort */
      }
    }
    void load()
    const poll = setInterval(load, POLL_MS)
    const initialTick = setTimeout(() => setNow(Date.now()), 0)
    const tick = setInterval(() => setNow(Date.now()), 20_000)
    return () => {
      active = false
      clearInterval(poll)
      clearTimeout(initialTick)
      clearInterval(tick)
    }
  }, [])

  if (!lesson || now === null || dismissedId === lesson.id) return null
  if (pathname === `/lessons/${lesson.id}/planner`) return null

  const minsToStart = Math.round((new Date(lesson.start).getTime() - now) / 60000)
  const inProgress = lesson.status === 'in_progress'
  if (!inProgress && minsToStart > 5) return null

  const when = inProgress
    ? 'Em andamento'
    : minsToStart <= 0
      ? 'Começa agora'
      : `Começa em ${minsToStart} min`

  function markMissed() {
    if (!lesson) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('lessonId', lesson.id)
      fd.set('status', 'missed')
      await markAttendance(fd)
      setDismissedId(lesson.id)
    })
  }

  return (
    <aside className={styles.reminder} aria-label="Aula começando">
      <div className={styles.reminderHead}>
        <div className={styles.reminderWho}>
          <p className={styles.reminderWhen}><span className={styles.reminderDot} aria-hidden="true" /> {when}</p>
          <p className={styles.reminderName}>{lesson.studentName || lesson.title}</p>
          {lesson.studentName && <p className={styles.reminderTitle}>{lesson.title}</p>}
        </div>
        <button type="button" onClick={() => setDismissedId(lesson.id)} aria-label="Dispensar lembrete" className={styles.reminderClose}>
          <IconClose />
        </button>
      </div>
      <div className={styles.reminderActions}>
        <Link href={`/lessons/${lesson.id}/planner#aula`} className={styles.reminderOpen}>
          Abrir aula <IconArrowRight />
        </Link>
        <button type="button" onClick={markMissed} disabled={pending} className={styles.reminderMissed}>
          {pending ? 'Registrando…' : 'Aluno faltou'}
        </button>
      </div>
    </aside>
  )
}
