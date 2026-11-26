// Identidade visual dos recursos pedagógicos: cada tópico (categoria) tem
// ícone e tom próprios; cada tipo de conteúdo tem ícone e o texto do botão.
// Usado na biblioteca do professor e nos materiais do aluno.
import type { StatusTone } from '@/lib/constants/lessons'
import { CATEGORIES } from '@/lib/constants/resources'

type IconProps = { className?: string }

function Base({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  )
}

const IconWarmup = (p: IconProps) => <Base {...p}><path d="M12 20.5c3.6 0 6-2.4 6-5.6 0-3.4-2.6-5.2-3.6-8.4-1.6 1.4-2.2 3-2.2 4.4-1.2-.8-1.8-2.2-1.8-3.6C8 9 6 11.6 6 14.9c0 3.2 2.4 5.6 6 5.6z" /></Base>
const IconTechnique = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" /></Base>
const IconTheory = (p: IconProps) => <Base {...p}><path d="M4.5 5.5c2.6-1 5.2-1 7.5.6 2.3-1.6 4.9-1.6 7.5-.6v13c-2.6-1-5.2-1-7.5.6-2.3-1.6-4.9-1.6-7.5-.6z" /><path d="M12 6.1v13" /></Base>
const IconRepertoire = (p: IconProps) => <Base {...p}><path d="M9 18.5V6l10-2v12.5" /><circle cx="6.5" cy="18.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></Base>
const IconHomework = (p: IconProps) => <Base {...p}><rect x="5" y="4" width="14" height="17" rx="2.4" /><path d="M9 3v2.4h6V3" /><path d="m8.6 12.5 2 2 4-4" /></Base>

const IconText = (p: IconProps) => <Base {...p}><path d="M6 3.5h9l3 3v14H6z" /><path d="M9 11h6M9 14.5h6M9 18h3" /></Base>
const IconPdf = (p: IconProps) => <Base {...p}><path d="M6 3.5h9l3 3v14H6z" /><path d="M14.5 3.5V7H18" /><path d="M9 16.5v-4h1.3a1.3 1.3 0 0 1 0 2.6H9" /></Base>
const IconVideo = (p: IconProps) => <Base {...p}><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" /></Base>
const IconChords = (p: IconProps) => <Base {...p}><path d="M4 7h16M4 11h16M4 15h16" /><circle cx="9" cy="11" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.4" fill="currentColor" stroke="none" /></Base>

export type TopicTone = 'warm' | 'blue' | 'violet' | 'sand' | 'teal'

interface TopicMeta {
  /** Frase curta que explica o tópico, mostrada sob o nome. */
  hint: string
  tone: TopicTone
  Icon: (p: IconProps) => React.ReactElement
}

const TOPICS: Record<string, TopicMeta> = {
  Aquecimento: { hint: 'Para começar a aula com o corpo e o ouvido prontos.', tone: 'warm', Icon: IconWarmup },
  Técnica: { hint: 'Exercícios para mãos, voz e precisão.', tone: 'blue', Icon: IconTechnique },
  Teoria: { hint: 'O porquê da música, explicado sem complicar.', tone: 'violet', Icon: IconTheory },
  Repertório: { hint: 'As músicas que o aluno vai tocar.', tone: 'sand', Icon: IconRepertoire },
  'Tarefa de Casa': { hint: 'O que praticar até a próxima aula.', tone: 'teal', Icon: IconHomework },
}

const FALLBACK_TOPIC: TopicMeta = { hint: '', tone: 'teal', Icon: IconText }

export function topicMeta(category: string): TopicMeta {
  return TOPICS[category] ?? FALLBACK_TOPIC
}

/** Tópicos na ordem da aula; categorias desconhecidas vão para o fim. */
export function topicOrder(categories: Iterable<string>): string[] {
  // Materializa antes: um iterador (ex.: Map.keys()) só pode ser lido uma vez.
  const present = new Set(categories)
  const known = CATEGORIES.filter((c) => present.has(c)) as string[]
  const extra = [...present].filter((c) => !(CATEGORIES as readonly string[]).includes(c))
  return [...known, ...extra]
}

interface ContentMeta {
  Icon: (p: IconProps) => React.ReactElement
  /** Texto do botão que abre o conteúdo. */
  openLabel: string
}

const CONTENT: Record<string, ContentMeta> = {
  Texto: { Icon: IconText, openLabel: 'Ler' },
  PDF: { Icon: IconPdf, openLabel: 'Abrir PDF' },
  'Link Vídeo': { Icon: IconVideo, openLabel: 'Ver vídeo' },
  'Cifra/Tablatura': { Icon: IconChords, openLabel: 'Ver cifra' },
}

export function contentMeta(type: string): ContentMeta {
  return CONTENT[type] ?? { Icon: IconText, openLabel: 'Abrir' }
}

export const DIFFICULTY_TONE: Record<string, StatusTone> = {
  Iniciante: 'success',
  Intermediário: 'warning',
  Avançado: 'brand',
}

/** "Iniciante" → 1 barra, "Intermediário" → 2, "Avançado" → 3. */
export function difficultyLevel(difficulty: string): number {
  return difficulty === 'Avançado' ? 3 : difficulty === 'Intermediário' ? 2 : 1
}

// ── Área de instrumento: a aba principal da biblioteca e a capa padrão ─────────

const IconStrings = (p: IconProps) => <Base {...p}><path d="M14.5 3.5 20.5 9.5" /><path d="m16 8-6.2 6.2" /><circle cx="7.6" cy="16.4" r="4.1" /><circle cx="7.6" cy="16.4" r="1.2" /><path d="M18 3l3 3" /></Base>
const IconWinds = (p: IconProps) => <Base {...p}><path d="M2.5 12.5h11" /><path d="M13.5 9.5v6l7.5 3.5V6z" /><path d="M5.5 12.5V9.5h6v3" /><path d="M7.5 9.5V8M9.5 9.5V8" /></Base>
const IconKeys = (p: IconProps) => <Base {...p}><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="M8 5v14M13 5v14M18 5v14" /><path d="M6.5 5v7h3V5M15.5 5v7h3V5" fill="currentColor" stroke="none" /></Base>
const IconDrum = (p: IconProps) => <Base {...p}><ellipse cx="12" cy="9" rx="8" ry="3" /><path d="M4 9v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9" /><path d="m6 4 5 4.5M18 4l-5 4.5" /></Base>
const IconMic = (p: IconProps) => <Base {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21M8.5 21h7" /></Base>
const IconNotes = (p: IconProps) => <Base {...p}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /><path d="M9 10l10-2" /></Base>

export type AreaTone = 'sand' | 'teal' | 'blue' | 'violet' | 'pink' | 'green'

interface AreaMeta {
  /** Nome da aba (a categoria "Geral" aparece como teoria e percepção). */
  label: string
  tone: AreaTone
  Icon: (p: IconProps) => React.ReactElement
}

const AREAS: Record<string, AreaMeta> = {
  Cordas: { label: 'Cordas', tone: 'sand', Icon: IconStrings },
  Sopros: { label: 'Sopros', tone: 'teal', Icon: IconWinds },
  Teclas: { label: 'Teclas', tone: 'blue', Icon: IconKeys },
  Percussão: { label: 'Percussão', tone: 'violet', Icon: IconDrum },
  Voz: { label: 'Voz', tone: 'pink', Icon: IconMic },
  Geral: { label: 'Teoria e percepção', tone: 'green', Icon: IconNotes },
}

export function areaMeta(category: string | null | undefined): AreaMeta {
  return AREAS[category ?? ''] ?? AREAS.Geral
}

// ── Capa do recurso ─────────────────────────────────────────────────────────
// O próprio arquivo, quando é imagem (partitura fotografada, por exemplo);
// senão, a arte da área do instrumento (gradiente no tom da área + ícone).

const IMAGE_FILE = /\.(png|jpe?g|webp)$/i

export type Cover = { kind: 'image'; src: string } | { kind: 'art'; area: string }

export function coverFor(r: { instrument_category: string | null }, file?: { path: string | null; url: string | null }): Cover {
  if (file?.path && file.url && IMAGE_FILE.test(file.path)) return { kind: 'image', src: file.url }
  return { kind: 'art', area: r.instrument_category ?? 'Geral' }
}
