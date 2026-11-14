import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { homeForRole } from '@/lib/constants/roles'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (user?.role !== 'superadmin') redirect(homeForRole(user?.role))

  return children
}
