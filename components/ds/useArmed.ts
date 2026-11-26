'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Tempo para a pergunta de confirmação sumir sozinha se ninguém agir.
export const DISARM_MS = 4000

/** Estado "armado" da confirmação em duas etapas: o 1º clique arma, some sozinho após DISARM_MS. */
export function useArmed(timeoutMs: number = DISARM_MS) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const arm = useCallback(() => {
    clear()
    setArmed(true)
    timer.current = setTimeout(() => setArmed(false), timeoutMs)
  }, [clear, timeoutMs])

  /** Mantém a pergunta aberta (ex.: durante o envio), sem o desarme automático. */
  const hold = clear

  const disarm = useCallback(() => {
    clear()
    setArmed(false)
  }, [clear])

  useEffect(() => clear, [clear])

  return { armed, arm, disarm, hold }
}
