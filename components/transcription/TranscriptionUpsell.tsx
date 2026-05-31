import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { TranscriptionAccess } from '@/lib/auth/plan'

// Estado "bloqueado" da feature: a escola vê do que se trata e um CTA de upgrade.
// reason distingue quem nunca teve (not_premium) de quem deixou vencer (expired).
export function TranscriptionUpsell({ reason }: { reason: Exclude<TranscriptionAccess, 'ok'> }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent(
    reason === 'expired'
      ? 'Olá! Quero renovar meu plano Premium no Sonorum para voltar a usar a transcrição de cifra por IA.'
      : 'Olá! Quero fazer upgrade para o plano Premium do Sonorum e liberar a transcrição de cifra por IA.',
  )
  const waLink = number ? `https://wa.me/${number}?text=${message}` : '#'

  return (
    <>
      <PageHeader
        title="Transcrição de cifra por IA"
        subtitle="Exclusivo do plano Premium"
      />
      <Card className="max-w-2xl border-brand-200 bg-brand-50/40">
        <h2 className="text-lg font-semibold text-ink">
          {reason === 'expired' ? 'Seu plano Premium venceu' : 'Disponível no plano Premium'}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Envie um áudio e a IA gera um rascunho de cifra (acordes) automaticamente. Seu professor
          revisa, ajusta e publica na biblioteca — economizando tempo a cada nova música.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-ink-muted">
          <li>✓ Áudio → cifra em segundos</li>
          <li>✓ Revisão do professor antes de publicar</li>
          <li>✓ Vira recurso reutilizável nas aulas</li>
        </ul>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
          <Button>{reason === 'expired' ? 'Renovar Premium no WhatsApp' : 'Fazer upgrade no WhatsApp'}</Button>
        </a>
      </Card>
    </>
  )
}
