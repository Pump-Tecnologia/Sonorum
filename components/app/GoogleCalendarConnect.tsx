import { disconnectGoogleCalendar } from '@/lib/actions/calendar'
import { SubmitButton } from '@/components/ds/Button'
import { InfoButton } from '@/components/ds/InfoButton'
import { StatusPill } from '@/components/ds/StatusPill'
import { Card } from '@/components/ui/Card'

// Card de conexão com o Google Calendar (no perfil). Enquanto a integração não
// estiver configurada (sem credenciais), mostra "em breve".
export function GoogleCalendarConnect({ enabled, connected }: { enabled: boolean; connected: boolean }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h2 className="sn-card-title">Google Agenda</h2>
          {enabled && !connected && (
            <InfoButton label="Sobre o Google Agenda">
              Suas aulas aparecem no Google Agenda, inclusive no celular. Usamos a conexão só para criar e atualizar
              suas aulas. <a href="https://sonorum.com.br/privacidade" className="underline underline-offset-2">Política de privacidade</a>
            </InfoButton>
          )}
        </div>

        {!enabled ? (
          <StatusPill tone="neutral">Em breve</StatusPill>
        ) : connected ? (
          <div className="flex items-center gap-2">
            <StatusPill tone="success">Conectado</StatusPill>
            <form action={disconnectGoogleCalendar}>
              <SubmitButton variant="ghost" size="sm" pendingLabel="Desconectando…">Desconectar</SubmitButton>
            </form>
          </div>
        ) : (
          <a href="/api/google/connect" className="sn-btn sn-btn-primary">Conectar</a>
        )}
      </div>
    </Card>
  )
}
