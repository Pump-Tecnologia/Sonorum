import Link from 'next/link'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Props {
  // Plano tem o envio automático por WhatsApp oficial (Premium).
  whatsappOfficial: boolean
  // Canal Cloud API configurado pelo Sonorum (credenciais presentes).
  whatsappActive: boolean
}

// Mostra como as notificações (aulas, cobranças, relatórios) saem por plano:
// Premium → WhatsApp oficial automático; demais → e-mail opt-in por aluno.
export function NotificationChannelCard({ whatsappOfficial, whatsappActive }: Props) {
  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold text-ink">Notificações</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Como aulas, cobranças e relatórios são enviados aos seus alunos.
      </p>

      {whatsappOfficial ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-hairline bg-surface-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">WhatsApp oficial</p>
              <Badge tone={whatsappActive ? 'success' : 'warning'}>
                {whatsappActive ? 'Ativo' : 'Em ativação'}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              Envio automático pelo número oficial do Sonorum — sem precisar clicar.
            </p>
          </div>
          <p className="text-xs text-ink-muted">
            O e-mail continua disponível como canal opcional, ativável na conta de cada aluno.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-hairline bg-surface-muted/30 p-3">
            <p className="text-sm font-medium text-ink">E-mail (opcional por aluno)</p>
            <p className="text-xs text-ink-muted">
              As notificações chegam por e-mail aos alunos que ativarem o recebimento na conta
              (em Alunos → editar → “Receber notificações por e-mail”).
            </p>
          </div>
          <p className="text-xs text-ink-muted">
            Envio automático por <strong>WhatsApp oficial</strong> está disponível no{' '}
            <Link href="/upgrade" className="font-medium text-brand-600 hover:underline">plano Premium</Link>.
          </p>
        </div>
      )}
    </Card>
  )
}
