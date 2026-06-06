import type { CalendarProvider } from '@/lib/calendar/types'

// Provider de desenvolvimento: não fala com nenhuma agenda externa (no-op).
// É o default quando o Google não está configurado — mantém o fluxo inerte.
export function mockCalendarProvider(): CalendarProvider {
  return {
    name: 'mock',
    async upsertEvent() {
      return { ok: true, externalEventId: null }
    },
    async deleteEvent() {
      return { ok: true }
    },
  }
}
