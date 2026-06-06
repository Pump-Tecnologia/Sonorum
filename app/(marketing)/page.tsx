import Link from 'next/link'

import { CTASection } from '@/components/marketing/CTASection'
import { Features } from '@/components/marketing/Features'
import { Hero } from '@/components/marketing/Hero'
import { Pricing } from '@/components/marketing/Pricing'
import { Ticker } from '@/components/marketing/Ticker'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Ticker />
      <Features />
      <Pricing />
      <CTASection />
      <footer className="border-t border-hairline px-5 py-8 text-center text-sm text-ink-muted">
        <p>
          © {new Date().getFullYear()} Sonorum ·{' '}
          <Link href="/privacidade" className="hover:text-brand-600 hover:underline">Política de Privacidade</Link>
          {' · '}
          <Link href="/termos" className="hover:text-brand-600 hover:underline">Termos de Serviço</Link>
        </p>
      </footer>
    </>
  )
}
