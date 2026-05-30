import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { addGoal, deleteGoal, toggleGoal } from '@/lib/actions/student-detail'

interface Goal {
  id: string
  text: string
  completed: boolean
}

export function StudentGoals({ studentId, goals }: { studentId: string; goals: Goal[] }) {
  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-ink">Metas</h2>

      <ul className="space-y-2">
        {goals.length === 0 && <li className="text-sm text-ink-muted">Nenhuma meta ainda.</li>}
        {goals.map((g) => (
          <li key={g.id} className="flex items-center gap-3">
            <form action={toggleGoal}>
              <input type="hidden" name="goalId" value={g.id} />
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="completed" value={String(g.completed)} />
              <button
                type="submit"
                aria-label={g.completed ? 'Marcar como pendente' : 'Concluir meta'}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border text-xs',
                  g.completed
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-hairline hover:border-brand-400',
                )}
              >
                {g.completed ? '✓' : ''}
              </button>
            </form>
            <span className={cn('flex-1 text-sm', g.completed ? 'text-ink-muted line-through' : 'text-ink')}>
              {g.text}
            </span>
            <form action={deleteGoal}>
              <input type="hidden" name="goalId" value={g.id} />
              <input type="hidden" name="studentId" value={studentId} />
              <button type="submit" aria-label="Remover meta" className="text-xs text-ink-muted hover:text-red-600">
                remover
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addGoal} className="mt-4 flex gap-2">
        <input type="hidden" name="studentId" value={studentId} />
        <Input name="text" placeholder="Nova meta…" required />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Adicionar
        </button>
      </form>
    </Card>
  )
}
