export const CATEGORIES = ['Aquecimento', 'Técnica', 'Teoria', 'Repertório', 'Tarefa de Casa'] as const
export const INST_CATEGORIES = ['Cordas', 'Sopros', 'Teclas', 'Percussão', 'Voz', 'Geral'] as const
export const DIFFICULTIES = ['Iniciante', 'Intermediário', 'Avançado'] as const
export const CONTENT_TYPES = ['Texto', 'PDF', 'Link Vídeo', 'Cifra/Tablatura'] as const

export type Category = (typeof CATEGORIES)[number]
export type InstCategory = (typeof INST_CATEGORIES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]
export type ContentType = (typeof CONTENT_TYPES)[number]
