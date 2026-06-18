import { redirect } from 'next/navigation'

// Este app não tem landing ('/'): a marketing é um app separado (sonorum.com.br).
// O proxy já redireciona '/' para login/dashboard; isto é só um fallback caso o
// middleware seja contornado.
export default function RootPage() {
  redirect('/login')
}
