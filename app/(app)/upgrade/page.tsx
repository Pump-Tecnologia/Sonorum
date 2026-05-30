import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getPlanContext } from '@/lib/auth/plan'
import { PLAN_FEATURES } from '@/lib/constants/plans'

export const metadata = { title: 'Fazer upgrade' }

const PRO = PLAN_FEATURES.professional

export default async function UpgradePage() {
  const { planType } = await getPlanContext()
  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent(
    'Olá! Quero fazer upgrade do meu plano no Sonorum para liberar alunos ilimitados, financeiro e relatórios.',
  )
  const waLink = number ? `https://wa.me/${number}?text=${message}` : '#'

  return (
    <>
      <PageHeader
        title="Desbloqueie todo o Sonorum"
        subtitle={`Você está no plano ${planType === 'free' ? 'Essencial (grátis)' : planType}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand-200 bg-brand-50/40">
          <h2 className="text-lg font-semibold text-ink">Plano {PRO.label}</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>✓ Alunos ilimitados</li>
            <li>✓ Professores ilimitados</li>
            <li>✓ Financeiro (planos, matrículas e cobranças)</li>
            <li>✓ Relatórios completos</li>
          </ul>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
            <Button>Falar com vendas no WhatsApp</Button>
          </a>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-ink">Plano Essencial (atual)</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>• Até {PLAN_FEATURES.free.studentLimit} alunos</li>
            <li>• Até {PLAN_FEATURES.free.teacherLimit} professor</li>
            <li>• Agenda e materiais</li>
            <li className="text-ink-muted/70">— Financeiro indisponível</li>
            <li className="text-ink-muted/70">— Relatórios indisponíveis</li>
          </ul>
        </Card>
      </div>
    </>
  )
}
