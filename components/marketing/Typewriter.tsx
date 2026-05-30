'use client'

import { useEffect, useState } from 'react'

import styles from '@/components/marketing/marketing.module.css'

interface TypewriterProps {
  words: string[]
  typeSpeed?: number   // ms por caractere digitado
  deleteSpeed?: number // ms por caractere apagado
  holdMs?: number      // pausa com a palavra completa antes de apagar
  startDelayMs?: number
}

// Efeito máquina de escrever que cicla por vários finais.
// Renderiza a 1ª palavra estática durante SSR/antes da hidratação para
// evitar mismatch — depois entra no loop animado.
export function Typewriter({
  words,
  typeSpeed = 70,
  deleteSpeed = 35,
  holdMs = 1800,
  startDelayMs = 400,
}: TypewriterProps) {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState(words[0])
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'typing' | 'holding' | 'deleting'>('idle')

  // Marca como hidratado e arranca o ciclo pela fase de hold da 1ª palavra
  useEffect(() => {
    setMounted(true)
    const t = setTimeout(() => setPhase('holding'), startDelayMs + holdMs)
    return () => clearTimeout(t)
  }, [startDelayMs, holdMs])

  useEffect(() => {
    if (!mounted || phase === 'idle') return
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
        // Avança palavra + nova fase no mesmo callback (React 19 faz batch).
        const t = setTimeout(() => {
          setWordIdx((i) => (i + 1) % words.length)
          setPhase('typing')
        }, 200)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setText(current.slice(0, text.length - 1)), deleteSpeed)
      return () => clearTimeout(t)
    }
  }, [phase, text, wordIdx, words, typeSpeed, deleteSpeed, holdMs, mounted])

  return (
    <em className={styles.heroH1Em} aria-live="polite" aria-atomic="true">
      <span>{text}</span>
      <span className={styles.typewriterCursor} aria-hidden="true" />
    </em>
  )
}
