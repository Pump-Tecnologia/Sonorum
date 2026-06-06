import { disconnectGoogleCalendar } from '@/lib/actions/calendar'
import { Card } from '@/components/ui/Card'

// Card de conexão com o Google Calendar (no perfil). Enquanto a integração não
// estiver configurada (sem credenciais), mostra "em breve".
export function GoogleCalendarConnect({ enabled, connected }: { enabled: boolean; connected: boolean }) {
  return (
    <Card>
      <h2 className="mb-2 text-base font-semibold text-ink">Google Calendar</h2>

      {!enabled ? (
        <p className="text-sm text-ink-muted">
          Em breve: sincronize suas aulas com o Google Calendar. A integração está em configuração.
        </p>
      ) : connected ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Conectado. Suas aulas aparecem automaticamente no seu Google Calendar.
          </p>
          <form action={disconnectGoogleCalendar}>
            <button
              type="submit"
              className="rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
            >
              Desconectar
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Conecte sua conta para ver suas aulas no Google Calendar (e no celular).
          </p>
          <a
            href="/api/google/connect"
            className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Conectar Google Calendar
          </a>
        </div>
      )}
    </Card>
  )
}
