import { IconCheck, IconPlus, IconTrash } from '@/components/ds/icons'
import styles from '@/components/students/student-profile.module.css'
import { addGoal, deleteGoal, toggleGoal } from '@/lib/actions/student-detail'
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
              <form action={toggleGoal}>
                <input type="hidden" name="goalId" value={g.id} />
                <input type="hidden" name="studentId" value={studentId} />
                <input type="hidden" name="completed" value={String(g.completed)} />
                <button
                  type="submit"
                  className={styles.check}
                  aria-pressed={g.completed}
                  aria-label={g.completed ? `Marcar “${g.text}” como pendente` : `Concluir “${g.text}”`}
                >
                  {g.completed && <IconCheck />}
                </button>
              </form>
              <span className={cn(styles.goalText, g.completed && styles.goalDone)}>{g.text}</span>
              <form action={deleteGoal}>
                <input type="hidden" name="goalId" value={g.id} />
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" className={styles.remove} aria-label={`Remover a meta “${g.text}”`} title="Remover meta">
                  <IconTrash />
                </button>
              </form>
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
