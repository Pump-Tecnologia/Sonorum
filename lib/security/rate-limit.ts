import 'server-only'

import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/server'

type Bucket = { count: number; resetAt: number }
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

// Fallback local apenas para desenvolvimento sem Supabase configurado.
const localBuckets = new Map<string, Bucket>()
const MAX_LOCAL_BUCKETS = 10_000

function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
    for (const [bucketKey, bucket] of localBuckets) {
      if (bucket.resetAt <= now) localBuckets.delete(bucketKey)
    }
  }

  const bucket = localBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  bucket.count += 1
  return bucket.count > limit
    ? { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
    : { ok: true }
}

/**
 * Limita chamadas em todas as instâncias da aplicação usando o Postgres.
 * A chave enviada ao banco é um HMAC para não persistir IP, e-mail ou user id.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)) }
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return localRateLimit(key, limit, windowMs)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)) }
  }

  const keyHash = createHmac('sha256', secret).update(key).digest('hex')
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_ms: windowMs,
    })
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      throw error ?? new Error('Resposta inválida do limitador compartilhado.')
    }

    const result = data as { allowed?: unknown; retry_after_sec?: unknown }
    if (result.allowed === true) return { ok: true }
    const retryAfterSec = Number(result.retry_after_sec)
    return { ok: false, retryAfterSec: Number.isFinite(retryAfterSec) ? Math.max(1, retryAfterSec) : 1 }
  } catch (error) {
    // Não enfraquece a proteção em produção se o Postgres/RPC estiver indisponível.
    if (process.env.NODE_ENV !== 'production') return localRateLimit(key, limit, windowMs)
    console.error('[rate-limit] backend indisponível', error)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)) }
  }
}

// IP do cliente atrás do proxy da Vercel (server actions e route handlers).
export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return forwarded || h.get('x-real-ip') || 'unknown'
}

export const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde um pouco e tente novamente.'
