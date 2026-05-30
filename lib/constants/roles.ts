// Papéis de usuário — espelham a coluna `role` em public.users.
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Rota inicial de cada papel após o login.
export const ROLE_HOME: Record<Role, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

// Prefixos de rota que cada papel pode acessar dentro da área autenticada.
export const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  superadmin: ['/superadmin', '/profile', '/resources'],
  admin: ['/admin', '/schedule', '/resources', '/financial', '/plans', '/lessons', '/profile', '/upgrade'],
  teacher: ['/teacher', '/schedule', '/resources', '/lessons', '/profile', '/upgrade'],
  student: ['/student', '/profile'],
}

export function homeForRole(role: string | null | undefined): string {
  if (role && role in ROLE_HOME) return ROLE_HOME[role as Role]
  return '/login'
}
