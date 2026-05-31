import Link from 'next/link'

import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deleteTranscription, retryTranscription } from '@/lib/actions/transcription'
import { STATUS_LABEL, STATUS_TONE, type TranscriptionStatus } from '@/lib/constants/transcription'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Transcrições por IA' }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function TranscriptionQueuePage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('transcription_jobs')
    .select('id, title, instrument, status, error, created_at')
    .order('created_at', { ascending: false })

  const list = jobs ?? []

  return (
    <>
      <PageHeader
        title="Transcrições por IA"
        subtitle="Áudios enviados para virar cifra. Revise os rascunhos e publique na biblioteca."
        action={
          <Link href="/resources/transcribe/new">
            <Button>Transcrever áudio</Button>
          </Link>
        }
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Nenhuma transcrição ainda. Envie um áudio para gerar uma cifra automaticamente.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((j) => {
            const status = j.status as TranscriptionStatus
            return (
              <Card key={j.id} className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{j.title}</p>
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {j.instrument ? `${j.instrument} · ` : ''}{fmtDate(j.created_at)}
                    {status === 'failed' && j.error ? ` · ${j.error}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {status === 'pending_review' && (
                    <Link
                      href={`/resources/transcribe/${j.id}`}
                      className="text-sm font-semibold text-brand-600 hover:underline"
                    >
                      Revisar →
                    </Link>
                  )}
                  {status === 'failed' && (
                    <form action={retryTranscription}>
                      <input type="hidden" name="jobId" value={j.id} />
                      <button type="submit" className="text-sm font-semibold text-brand-600 hover:underline">
                        Tentar de novo
                      </button>
                    </form>
                  )}
                  <DeleteButton
                    action={deleteTranscription}
                    hidden={{ jobId: j.id }}
                    label="Excluir"
                    confirmText={`Excluir a transcrição "${j.title}"?`}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
