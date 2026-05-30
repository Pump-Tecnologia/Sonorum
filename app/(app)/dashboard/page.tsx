import { redirect } from 'next/navigation'

import { homeForRole } from '@/lib/constants/roles'
import { getCurrentUser } from '@/lib/auth/session'

// Hub: redireciona para a home do papel. O middleware já faz isso na borda;
// este é o fallback server-side (acesso direto, JS desabilitado, etc.).
export default async function DashboardRedirect() {
  const user = await getCurrentUser()
  redirect(user ? homeForRole(user.role) : '/login')
}
