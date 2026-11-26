import { SubmitButton } from '@/components/ds/Button'
import { RemoveIconButton } from '@/components/ds/RemoveIconButton'
import styles from '@/components/students/student-profile.module.css'
import { addNote, deleteNote } from '@/lib/actions/student-detail'

interface Note {
  id: string
  content: string
  date: string
}

// A coluna é DATE ("2026-11-19"): sem hora, o JS lê como meia-noite UTC e a data
// recua um dia no fuso de Brasília. Meio-dia evita a virada.
const noteDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

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
              <RemoveIconButton
                action={deleteNote}
                hidden={{ noteId: n.id, studentId }}
                label="Remover anotação"
                className={styles.remove}
                formClassName={styles.noteActions}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
