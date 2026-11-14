import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Role } from '@/lib/constants/roles'

export interface ImpersonationState {
  actorId: string
  actorRole: Extract<Role, 'admin' | 'superadmin'>
  actorSchoolId: string | null
  targetId: string
  expiresAt: number
}

function secret(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to sign impersonation state.')
  return value
}

function signature(payload: string): Buffer {
  return createHmac('sha256', secret()).update(payload).digest()
}

export function signImpersonationState(state: ImpersonationState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
  const mac = signature(payload).toString('base64url')
  return `${payload}.${mac}`
}

export function verifyImpersonationState(value: string | undefined): ImpersonationState | null {
  if (!value) return null
  const [payload, encodedMac, extra] = value.split('.')
  if (!payload || !encodedMac || extra !== undefined) return null

  try {
    const expected = signature(payload)
    const received = Buffer.from(encodedMac, 'base64url')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<ImpersonationState>
    if (
      typeof state.actorId !== 'string' ||
      (state.actorRole !== 'admin' && state.actorRole !== 'superadmin') ||
      !(state.actorSchoolId === null || typeof state.actorSchoolId === 'string') ||
      typeof state.targetId !== 'string' ||
      typeof state.expiresAt !== 'number' ||
      state.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null

    return state as ImpersonationState
  } catch {
    return null
  }
}
