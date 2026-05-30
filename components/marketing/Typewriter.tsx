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
// Respeita prefers-reduced-motion (mostra a 1ª palavra estática).
export function Typewriter({
  words,
  typeSpeed = 70,
  deleteSpeed = 35,
  holdMs = 1800,
  startDelayMs = 400,
}: TypewriterProps) {
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'typing' | 'holding' | 'deleting'>('idle')

  // Detecta preferência por menos movimento — em tempo de render evita flash.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Pequeno delay inicial pra dar respiro depois do mount
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
        setWordIdx((i) => (i + 1) % words.length)
        const t = setTimeout(() => setPhase('typing'), 200)
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
