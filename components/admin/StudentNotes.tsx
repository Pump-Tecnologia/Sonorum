import { SubmitButton } from '@/components/ds/Button'
import { IconTrash } from '@/components/ds/icons'
import styles from '@/components/students/student-profile.module.css'
import { addNote, deleteNote } from '@/lib/actions/student-detail'

interface Note {
  id: string
  content: string
  date: string
}

const noteDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

export function StudentNotes({ studentId, notes }: { studentId: string; notes: Note[] }) {
  return (
    <section className={styles.panel} aria-labelledby="notes-title">
      <div className={styles.panelHead}>
        <h2 id="notes-title" className={styles.panelTitle}>Anotações</h2>
        <p className={styles.panelHint}>Só a equipe da escola vê</p>
      </div>

      <form action={addNote} className={styles.noteForm}>
        <input type="hidden" name="studentId" value={studentId} />
        <textarea name="content" placeholder="Algo para lembrar sobre o aluno: combinados, dificuldades, conquistas…" aria-label="Nova anotação" required />
        <SubmitButton variant="soft" size="sm" pendingLabel="Salvando…">Salvar anotação</SubmitButton>
      </form>

      {notes.length === 0 ? (
        <p className={`${styles.empty} ${styles.emptyAfterForm}`}>Nenhuma anotação ainda.</p>
      ) : (
        <ul className={styles.notes}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <p className={styles.noteDate}>{noteDate(n.date)}</p>
              <p className={styles.noteText}>{n.content}</p>
              <form action={deleteNote}>
                <input type="hidden" name="noteId" value={n.id} />
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" className={styles.remove} aria-label="Remover anotação" title="Remover anotação">
                  <IconTrash />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
