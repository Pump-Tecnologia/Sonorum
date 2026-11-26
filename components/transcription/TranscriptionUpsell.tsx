import { PageHeader } from '@/components/app/PageHeader'
import { LockedFeatureCard } from '@/components/billing/LockedFeatureCard'
import type { TranscriptionAccess } from '@/lib/auth/plan'

// Estado "bloqueado" da feature: a escola vê do que se trata e um CTA de upgrade.
// reason distingue quem nunca teve (not_premium) de quem deixou vencer (expired).
export function TranscriptionUpsell({ reason }: { reason: Exclude<TranscriptionAccess, 'ok'> }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent(
    reason === 'expired'
      ? 'Olá! Quero renovar meu plano no Sonorum para voltar a usar a transcrição de cifra por IA.'
      : 'Olá! Quero fazer upgrade para o plano Premium do Sonorum e liberar a transcrição de cifra por IA.',
  )
  const waLink = number ? `https://wa.me/${number}?text=${message}` : '#'

  return (
    <>
      <PageHeader
        title="Transcrição de cifra por IA"
      />
      <LockedFeatureCard
        title={reason === 'expired' ? 'Seu plano venceu' : 'Disponível no plano Premium'}
        description="Envie um áudio e a IA gera um rascunho de cifra com os acordes. O professor revisa, ajusta e publica na biblioteca, economizando tempo a cada música nova."
        benefits={['Áudio vira cifra em segundos', 'Revisão do professor antes de publicar', 'Vira recurso para usar nas aulas']}
        planRequirement="Exclusivo do plano Premium"
        upgradeUrl={waLink}
        ctaLabel={reason === 'expired' ? 'Renovar pelo WhatsApp' : 'Falar no WhatsApp'}
        isExpired={reason === 'expired'}
      />
    </>
  )
}
