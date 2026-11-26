import { redirect } from 'next/navigation'

export const metadata = { title: 'Assinar plano' }

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  redirect(plan ? `/upgrade?plan=${plan}` : '/upgrade')
}
