export const CATEGORIES = ['Aquecimento', 'Técnica', 'Teoria', 'Repertório', 'Tarefa de Casa'] as const
export const INST_CATEGORIES = ['Cordas', 'Sopros', 'Teclas', 'Percussão', 'Voz', 'Geral'] as const
export const DIFFICULTIES = ['Iniciante', 'Intermediário', 'Avançado'] as const
export const CONTENT_TYPES = ['Texto', 'PDF', 'Link Vídeo', 'Cifra/Tablatura'] as const

export type Category = (typeof CATEGORIES)[number]
export type InstCategory = (typeof INST_CATEGORIES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]
export type ContentType = (typeof CONTENT_TYPES)[number]

// Instrumentos por categoria — fonte única para os selects dependentes.
export const INSTRUMENTS_BY_CATEGORY: Record<InstCategory, readonly string[]> = {
  Cordas: ['Violão', 'Guitarra', 'Baixo', 'Contrabaixo', 'Violino', 'Viola', 'Violoncelo', 'Cavaquinho', 'Ukulele', 'Bandolim', 'Harpa'],
  Sopros: ['Flauta Transversal', 'Flauta Doce', 'Clarinete', 'Saxofone', 'Trompete', 'Trombone', 'Trompa', 'Tuba', 'Oboé', 'Fagote', 'Gaita'],
  Teclas: ['Piano', 'Teclado', 'Órgão', 'Acordeão', 'Sintetizador'],
  Percussão: ['Bateria', 'Cajón', 'Pandeiro', 'Caixa', 'Congas', 'Bongô', 'Timbau', 'Djembe', 'Xilofone', 'Marimba', 'Vibrafone'],
  Voz: ['Canto', 'Canto Lírico', 'Canto Popular', 'Técnica Vocal'],
  Geral: ['Teoria Musical', 'Percepção Musical', 'Solfejo', 'Harmonia', 'Musicalização'],
}

export function instrumentsForCategory(category: string | null | undefined): readonly string[] {
  return INSTRUMENTS_BY_CATEGORY[category as InstCategory] ?? []
}
