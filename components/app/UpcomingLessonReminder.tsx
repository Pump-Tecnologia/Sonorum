'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

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
  const [, forceTick] = useState(0)
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
    const tick = setInterval(() => forceTick((n) => n + 1), 20_000)
    return () => {
      active = false
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [])

  if (!lesson || dismissedId === lesson.id) return null
  if (pathname === `/lessons/${lesson.id}/planner`) return null

  const minsToStart = Math.round((new Date(lesson.start).getTime() - Date.now()) / 60000)
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
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-accent-300 bg-surface p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-600" />
            {when}
          </span>
          <p className="mt-1 truncate text-sm font-semibold text-ink">{lesson.studentName || lesson.title}</p>
          <p className="truncate text-xs text-ink-muted">{lesson.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissedId(lesson.id)}
          aria-label="Dispensar lembrete"
          className="shrink-0 text-ink-muted hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/lessons/${lesson.id}/planner`}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
        >
          Preparar aula →
        </Link>
        <button
          type="button"
          onClick={markMissed}
          disabled={pending}
          className="rounded-xl border border-red-200 bg-surface px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Aluno faltou
        </button>
      </div>
    </div>
  )
}
