/** Identificador que o Next anexa aos erros do servidor, para cruzar com os logs. */
export function errorDigest(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('digest' in error)) return undefined
  return typeof error.digest === 'string' && error.digest ? error.digest : undefined
}
