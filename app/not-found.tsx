import { LinkButton } from '@/components/ds/Button'
import { StatusScreen } from '@/components/app/StatusScreen'

export const metadata = { title: 'Página não encontrada' }

// 404 de todo o app: endereço que não existe e notFound() das telas.
export default function NotFound() {
  return (
    <StatusScreen
      fullPage
      code="Erro 404"
      title="Esta página não existe"
      message="O endereço pode ter mudado ou estar digitado errado."
      actions={<LinkButton href="/dashboard">Voltar ao início</LinkButton>}
    />
  )
}
