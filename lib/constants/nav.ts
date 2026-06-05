import type { Role } from '@/lib/constants/roles'

// Nome do ícone (mapeado em components/app/NavIcon.tsx).
export type NavIconName =
  | 'home'
  | 'calendar'
  | 'teacher'
  | 'users'
  | 'receipt'
  | 'folder'
  | 'sparkles'
  | 'tag'
  | 'wallet'
  | 'chart'
  | 'settings'
  | 'grid'
  | 'book'
  | 'plus'
  | 'progress'

export interface NavItem {
  label: string
  href: string
  icon: NavIconName
}

// Navegação da sidebar por papel. Espelha as áreas do app Laravel.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  superadmin: [
    { label: 'Visão geral', href: '/superadmin', icon: 'grid' },
    { label: 'Biblioteca', href: '/superadmin/biblioteca', icon: 'book' },
    { label: 'Nova escola', href: '/superadmin/schools/new', icon: 'plus' },
  ],
  // NOTA: a nav cresce conforme as fases são migradas. Mantida só com rotas
  // que já existem para não gerar 404.
  admin: [
    { label: 'Dashboard', href: '/admin', icon: 'home' },
    { label: 'Agenda', href: '/schedule', icon: 'calendar' },
    { label: 'Professores', href: '/admin/teachers', icon: 'teacher' },
    { label: 'Alunos', href: '/admin/students', icon: 'users' },
    { label: 'Cobranças', href: '/cobrancas', icon: 'receipt' },
    { label: 'Recursos', href: '/resources', icon: 'folder' },
    { label: 'Transcrição IA', href: '/resources/transcribe', icon: 'sparkles' },
    { label: 'Planos', href: '/plans', icon: 'tag' },
    { label: 'Financeiro', href: '/financial', icon: 'wallet' },
    { label: 'Relatórios', href: '/admin/reports', icon: 'chart' },
    { label: 'Configurações', href: '/admin/settings', icon: 'settings' },
  ],
  teacher: [
    { label: 'Dashboard', href: '/teacher', icon: 'home' },
    { label: 'Agenda', href: '/schedule', icon: 'calendar' },
    { label: 'Recursos', href: '/resources', icon: 'folder' },
    { label: 'Transcrição IA', href: '/resources/transcribe', icon: 'sparkles' },
  ],
  student: [
    { label: 'Dashboard', href: '/student', icon: 'home' },
    { label: 'Minha agenda', href: '/student/schedule', icon: 'calendar' },
    { label: 'Meu progresso', href: '/student/progress', icon: 'progress' },
    { label: 'Materiais', href: '/student/materials', icon: 'folder' },
    { label: 'Mensalidades', href: '/student/mensalidades', icon: 'receipt' },
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  teacher: 'Professor',
  student: 'Aluno',
}
