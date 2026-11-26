import Link from 'next/link'

import { InfoButton } from '@/components/ds/InfoButton'
import { StatusPill } from '@/components/ds/StatusPill'
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
      <div className="mb-4 flex items-center gap-1">
        <h2 className="sn-card-title">Notificações</h2>
        <InfoButton label="Sobre as notificações" align="end">
          Como aulas, cobranças e relatórios chegam aos alunos.{' '}
          {whatsappOfficial
            ? 'O e-mail continua disponível como canal opcional, ligado na conta de cada aluno.'
            : 'O e-mail é ligado aluno por aluno, na edição do aluno, em “Receber notificações por e-mail”.'}
        </InfoButton>
      </div>

      {whatsappOfficial ? (
        <div className="sn-subpanel flex items-center justify-between gap-2">
          <div>
            <p className="m-0 text-[15px] font-medium text-(--sn-ink)">WhatsApp oficial</p>
            <p className="mt-0.5 mb-0 text-sm text-(--sn-text-muted)">Envio automático pelo número do Sonorum</p>
          </div>
          <StatusPill tone={whatsappActive ? 'success' : 'warning'}>{whatsappActive ? 'Ativo' : 'Em ativação'}</StatusPill>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="sn-subpanel">
            <p className="m-0 text-[15px] font-medium text-(--sn-ink)">E-mail</p>
            <p className="mt-0.5 mb-0 text-sm text-(--sn-text-muted)">Para os alunos que ligarem o recebimento</p>
          </div>
          <p className="m-0 flex flex-wrap items-center justify-between gap-2 text-sm text-(--sn-text-muted)">
            WhatsApp oficial automático no Premium
            <Link href="/upgrade" className="sn-btn sn-btn-sm sn-btn-secondary">Ver planos</Link>
          </p>
        </div>
      )}
    </Card>
  )
}
