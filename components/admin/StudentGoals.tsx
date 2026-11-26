import { IconPlus } from '@/components/ds/icons'
import { RemoveIconButton } from '@/components/ds/RemoveIconButton'
import { GoalToggle } from '@/components/students/GoalToggle'
import styles from '@/components/students/student-profile.module.css'
import { addGoal, deleteGoal } from '@/lib/actions/student-detail'
import { cn } from '@/lib/cn'

interface Goal {
  id: string
  text: string
  completed: boolean
}

export function StudentGoals({ studentId, goals }: { studentId: string; goals: Goal[] }) {
  const done = goals.filter((g) => g.completed).length
  return (
    <section className={styles.panel} aria-labelledby="goals-title">
      <div className={styles.panelHead}>
        <h2 id="goals-title" className={styles.panelTitle}>Metas</h2>
        {goals.length > 0 && <p className={styles.panelHint}>{done} de {goals.length} concluídas</p>}
      </div>

      {goals.length === 0 ? (
        <p className={styles.empty}>Nenhuma meta ainda. Combine uma com o aluno e anote aqui.</p>
      ) : (
        <ul className={styles.goals}>
          {goals.map((g) => (
            <li key={g.id} className={styles.goal}>
              <GoalToggle
                goalId={g.id}
                studentId={studentId}
                completed={g.completed}
                labelWhenDone={`Marcar “${g.text}” como pendente`}
                labelWhenPending={`Concluir “${g.text}”`}
                className={styles.check}
              />
              <span className={cn(styles.goalText, g.completed && styles.goalDone)}>{g.text}</span>
              <RemoveIconButton
                action={deleteGoal}
                hidden={{ goalId: g.id, studentId }}
                label={`Remover a meta “${g.text}”`}
                className={styles.remove}
              />
            </li>
          ))}
        </ul>
      )}

      <form action={addGoal} className={styles.addRow}>
        <input type="hidden" name="studentId" value={studentId} />
        <input name="text" placeholder="Nova meta, ex.: tocar a música X a 90 BPM" aria-label="Nova meta" required />
        <button type="submit" className={styles.addButton} aria-label="Adicionar meta" title="Adicionar meta">
          <IconPlus />
        </button>
      </form>
    </section>
  )
}
