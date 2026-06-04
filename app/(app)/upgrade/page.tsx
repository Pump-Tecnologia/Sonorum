import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { getPlanContext } from '@/lib/auth/plan'
import { getCurrentUser } from '@/lib/auth/session'
import { PLAN_FEATURES } from '@/lib/constants/plans'
import { formatBRL } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Fazer upgrade' }

const PRO = PLAN_FEATURES.professional

export default async function UpgradePage() {
  const { planType, expirationDate } = await getPlanContext()
  const me = await getCurrentUser()

  // Preço negociado da assinatura do SaaS (definido pelo superadmin por escola).
  let monthlyPrice = 0
  if (me?.schoolId) {
    const supabase = await createClient()
    const { data: school } = await supabase.from('schools').select('monthly_price').eq('id', me.schoolId).maybeSingle()
    monthlyPrice = Number(school?.monthly_price ?? 0)
  }
  const hasSubscription = planType !== 'free' && monthlyPrice > 0

  const number = process.env.NEXT_PUBLIC_WHATSAPP_SALES_NUMBER ?? ''
  const message = encodeURIComponent(
    'Olá! Quero fazer upgrade do meu plano no Sonorum para liberar alunos ilimitados, financeiro e relatórios.',
  )
  const waLink = number ? `https://wa.me/${number}?text=${message}` : '#'

  const today = new Date().toISOString().slice(0, 10)
  const expired = expirationDate != null && expirationDate < today

  return (
    <>
      <PageHeader
        title={hasSubscription ? 'Sua assinatura' : 'Desbloqueie todo o Sonorum'}
        subtitle={`Você está no plano ${planType === 'free' ? 'Essencial (grátis)' : planType}`}
      />

      {/* Assinatura ativa — pagar / renovar */}
      {hasSubscription && (
        <Card className={`mb-6 ${expired ? 'border-red-200 bg-red-50/40' : 'border-brand-200 bg-brand-50/40'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Plano {planType}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {formatBRL(monthlyPrice)}<span className="text-xs">/mês</span>
                {expirationDate && (
                  <>
                    {' · '}
                    {expired ? (
                      <span className="font-semibold text-red-600">
                        venceu em {new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <>válido até {new Date(expirationDate + 'T12:00:00').toLocaleDateString('pt-BR')}</>
                    )}
                  </>
                )}
              </p>
            </div>
            <CheckoutButton label={expired ? 'Reativar assinatura' : 'Pagar / renovar'} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand-200 bg-brand-50/40">
          <h2 className="text-lg font-semibold text-ink">Plano {PRO.label}</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>✓ Alunos ilimitados</li>
            <li>✓ Professores ilimitados</li>
            <li>✓ Financeiro (planos, matrículas e cobranças)</li>
            <li>✓ Relatórios completos</li>
          </ul>
          {!hasSubscription && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
              <Button>Falar com vendas no WhatsApp</Button>
            </a>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-ink">Plano Essencial</h2>
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
