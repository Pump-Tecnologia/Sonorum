import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Field'
import { addNote, deleteNote } from '@/lib/actions/student-detail'

interface Note {
  id: string
  content: string
  date: string
}

export function StudentNotes({ studentId, notes }: { studentId: string; notes: Note[] }) {
  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-ink">Anotações</h2>

      <form action={addNote} className="space-y-2">
        <input type="hidden" name="studentId" value={studentId} />
        <Textarea name="content" placeholder="Registrar uma anotação sobre o aluno…" required />
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Salvar anotação
        </button>
      </form>

      <ul className="mt-5 space-y-3">
        {notes.length === 0 && <li className="text-sm text-ink-muted">Nenhuma anotação ainda.</li>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-hairline bg-surface-muted/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 whitespace-pre-wrap text-sm text-ink">{n.content}</p>
              <form action={deleteNote}>
                <input type="hidden" name="noteId" value={n.id} />
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" aria-label="Remover anotação" className="text-xs text-ink-muted hover:text-red-600">
                  remover
                </button>
              </form>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {new Date(n.date).toLocaleDateString('pt-BR')}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
