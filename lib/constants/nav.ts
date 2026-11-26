import type { Role } from '@/lib/constants/roles'
import { TRANSCRIPTION_ENABLED } from '@/lib/constants/transcription'

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

// Item da transcrição por IA: só aparece com a flag ligada.
const TRANSCRIPTION_NAV: NavItem[] = TRANSCRIPTION_ENABLED
  ? [{ label: 'Transcrição IA', href: '/resources/transcribe', icon: 'sparkles' }]
  : []

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
    { label: 'Início', href: '/admin', icon: 'home' },
    { label: 'Agenda', href: '/schedule', icon: 'calendar' },
    { label: 'Professores', href: '/admin/teachers', icon: 'teacher' },
    { label: 'Alunos', href: '/admin/students', icon: 'users' },
    { label: 'Recursos', href: '/resources', icon: 'folder' },
    { label: 'Modelos de aula', href: '/modelos', icon: 'book' },
    ...TRANSCRIPTION_NAV,
    { label: 'Planos', href: '/plans', icon: 'tag' },
    { label: 'Financeiro', href: '/financial', icon: 'wallet' },
    { label: 'Relatórios', href: '/admin/reports', icon: 'chart' },
    { label: 'Configurações', href: '/admin/settings', icon: 'settings' },
  ],
  teacher: [
    { label: 'Início', href: '/teacher', icon: 'home' },
    { label: 'Agenda', href: '/schedule', icon: 'calendar' },
    { label: 'Recursos', href: '/resources', icon: 'folder' },
    { label: 'Modelos de aula', href: '/modelos', icon: 'book' },
    ...TRANSCRIPTION_NAV,
  ],
  student: [
    { label: 'Início', href: '/student', icon: 'home' },
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
