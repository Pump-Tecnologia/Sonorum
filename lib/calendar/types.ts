// Abstração de calendário (Sonorum → agenda externa). Provider plugável:
// mock (default, no-op) | google (Cloud, por env). Mão única: o Sonorum é a
// fonte da verdade; o calendário externo é espelho.

export interface CalendarEventInput {
  title: string
  description?: string | null
  startISO: string
  endISO: string
  location?: string | null
}

export interface CalendarUpsertResult {
  ok: boolean
  externalEventId?: string | null
  error?: string
}

export interface CalendarDeleteResult {
  ok: boolean
  error?: string
}

export interface CalendarProvider {
  readonly name: 'mock' | 'google'
  // Cria ou atualiza (se externalEventId vier) o evento na agenda do usuário.
  upsertEvent(
    refreshToken: string,
    calendarId: string,
    event: CalendarEventInput,
    externalEventId?: string | null,
  ): Promise<CalendarUpsertResult>
  deleteEvent(refreshToken: string, calendarId: string, externalEventId: string): Promise<CalendarDeleteResult>
}
