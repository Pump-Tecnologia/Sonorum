'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import styles from '@/components/marketing/marketing.module.css'

interface TypewriterProps {
  words: string[]
  typeSpeed?: number   // ms por caractere digitado
  deleteSpeed?: number // ms por caractere apagado
  holdMs?: number      // pausa com a palavra completa antes de apagar
  startDelayMs?: number
}

// Lê prefers-reduced-motion sem efeito colateral.
// useSyncExternalStore evita hydration mismatch e o lint do React 19.
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false, // server snapshot
  )
}

// Efeito máquina de escrever que cicla por vários finais.
// Respeita prefers-reduced-motion (mostra a 1ª palavra estática).
export function Typewriter({
  words,
  typeSpeed = 70,
  deleteSpeed = 35,
  holdMs = 1800,
  startDelayMs = 400,
}: TypewriterProps) {
  const reducedMotion = useReducedMotion()
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'typing' | 'holding' | 'deleting'>('idle')

  // Delay inicial após mount
  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setPhase('typing'), startDelayMs)
    return () => clearTimeout(t)
  }, [reducedMotion, startDelayMs])

  useEffect(() => {
    if (reducedMotion || phase === 'idle') return
    const current = words[wordIdx]

    if (phase === 'typing') {
      if (text === current) {
        const t = setTimeout(() => setPhase('holding'), 0)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed)
      return () => clearTimeout(t)
    }

    if (phase === 'holding') {
      const t = setTimeout(() => setPhase('deleting'), holdMs)
      return () => clearTimeout(t)
    }

    if (phase === 'deleting') {
      if (text === '') {
        // Combina avanço de palavra + nova fase num único callback assíncrono
        // (React 19 faz batch dos dois setStates).
        const t = setTimeout(() => {
          setWordIdx((i) => (i + 1) % words.length)
          setPhase('typing')
        }, 200)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setText(current.slice(0, text.length - 1)), deleteSpeed)
      return () => clearTimeout(t)
    }
  }, [phase, text, wordIdx, words, typeSpeed, deleteSpeed, holdMs, reducedMotion])

  // Sem motion: renderiza estático a primeira palavra (acessível e crawlable).
  if (reducedMotion) {
    return <em className={styles.heroH1Em}>{words[0]}</em>
  }

  return (
    <em className={styles.heroH1Em} aria-live="polite" aria-atomic="true">
      <span>{text}</span>
      <span className={styles.typewriterCursor} aria-hidden="true" />
    </em>
  )
}
