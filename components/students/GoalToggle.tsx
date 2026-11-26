'use client'

import { useFormStatus } from 'react-dom'

import { IconCheck } from '@/components/ds/icons'
import { toggleGoal } from '@/lib/actions/student-detail'

interface GoalToggleProps {
  goalId: string
  studentId: string
  completed: boolean
  /** Nomes acessíveis para cada estado. */
  labelWhenDone: string
  labelWhenPending: string
  className: string
}

// Marca ou desmarca uma meta. Enquanto salva, o check já mostra o novo estado e
// fica travado: um clique duplo não marca e desmarca em seguida.
export function GoalToggle({ goalId, studentId, completed, ...button }: GoalToggleProps) {
  return (
    <form action={toggleGoal}>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="completed" value={String(completed)} />
      <ToggleButton completed={completed} {...button} />
    </form>
  )
}

function ToggleButton({ completed, labelWhenDone, labelWhenPending, className }: Omit<GoalToggleProps, 'goalId' | 'studentId'>) {
  const { pending } = useFormStatus()
  const shown = pending ? !completed : completed
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-pressed={shown}
      aria-label={completed ? labelWhenDone : labelWhenPending}
    >
      {shown && <IconCheck />}
    </button>
  )
}
