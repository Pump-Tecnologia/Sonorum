import type { Role } from '@/lib/constants/roles'

export interface NavItem {
  label: string
  href: string
}

// Navegação da sidebar por papel. Espelha as áreas do app Laravel.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  superadmin: [
    { label: 'Escolas', href: '/superadmin' },
    { label: 'Nova escola', href: '/superadmin/schools/new' },
  ],
  // NOTA: a nav cresce conforme as fases são migradas. Mantida só com rotas
  // que já existem para não gerar 404.
  admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Agenda', href: '/schedule' },
    { label: 'Professores', href: '/admin/teachers' },
    { label: 'Alunos', href: '/admin/students' },
    { label: 'Configurações', href: '/admin/settings' },
  ],
  teacher: [
    { label: 'Dashboard', href: '/teacher' },
    { label: 'Agenda', href: '/schedule' },
  ],
  student: [
    { label: 'Dashboard', href: '/student' },
    { label: 'Minha agenda', href: '/student/schedule' },
    { label: 'Materiais', href: '/student/materials' },
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  teacher: 'Professor',
  student: 'Aluno',
}
