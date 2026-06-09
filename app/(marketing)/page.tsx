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
    </>
  )
}
