import { PageHeader } from '@/components/app/PageHeader'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { LinkButton, SubmitButton } from '@/components/ds/Button'
import { IconArrowRight, IconPlus } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import { StatusPill } from '@/components/ds/StatusPill'
import { Card } from '@/components/ui/Card'
import { TranscriptionUpsell } from '@/components/transcription/TranscriptionUpsell'
import { deleteTranscription, retryTranscription } from '@/lib/actions/transcription'
import { transcriptionAccess } from '@/lib/auth/plan'
import { STATUS_LABEL, STATUS_TONE, type TranscriptionStatus } from '@/lib/constants/transcription'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Transcrições por IA' }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function TranscriptionQueuePage() {
  const access = await transcriptionAccess()
  if (access !== 'ok') return <TranscriptionUpsell reason={access} />

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
        info="Áudios enviados para virar cifra. Revise os rascunhos e publique na biblioteca."
        action={<LinkButton href="/resources/transcribe/new"><IconPlus /> Transcrever áudio</LinkButton>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 px-2">
        <StatusPill tone="warning">Em desenvolvimento</StatusPill>
        <InfoButton label="Sobre a transcrição">
          A transcrição por IA ainda está sendo finalizada. Os resultados podem sair imprecisos ou ficar indisponíveis enquanto ajustamos o recurso.
        </InfoButton>
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="m-0 text-[15px] text-(--sn-text-muted)">Nenhuma transcrição ainda.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((j) => {
            const status = j.status as TranscriptionStatus
            return (
              <Card key={j.id} className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="m-0 text-[15px] font-medium text-(--sn-ink)">{j.title}</p>
                    <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>
                  </div>
                  <p className="mt-0.5 mb-0 text-[13px] text-(--sn-text-muted)">
                    {j.instrument ? `${j.instrument}, enviado em ` : 'Enviado em '}{fmtDate(j.created_at)}
                    {status === 'failed' && j.error ? `. ${j.error}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {status === 'pending_review' && (
                    <LinkButton href={`/resources/transcribe/${j.id}`} variant="soft" size="sm">Revisar <IconArrowRight /></LinkButton>
                  )}
                  {status === 'failed' && (
                    <form action={retryTranscription}>
                      <input type="hidden" name="jobId" value={j.id} />
                      <SubmitButton variant="soft" size="sm" pendingLabel="Enviando…">Tentar de novo</SubmitButton>
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
