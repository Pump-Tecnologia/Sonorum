import type { Category, InstCategory } from '@/lib/constants/resources'

// ── Estrutura de plano por categoria de instrumento (blueprint) ───────────────
// Define QUAIS seções e QUAIS campos uma aula tem, conforme o instrumento do
// aluno. Fonte de verdade (fallback) em código; no futuro vira catálogo global
// (espelhando resource_templates -> pedagogical_resources). Os ids de seção são
// slugs estáveis: warmup/repertoire/homework/general reaproveitam os valores
// legados de lesson_pedagogical_resource.section, então aulas/recursos antigos
// continuam mapeando 1:1 (back-compat sem migration).

export interface BlueprintSection {
  id: string
  label: string
  hint?: string
  // Categoria de recurso pré-selecionada ao "criar da aula" nesta seção.
  defaultResourceCategory?: Category
}

export interface BlueprintField {
  key: string
  label: string
  placeholder?: string
}

export interface LessonBlueprint {
  key: string
  // Rótulo da categoria a que se aplica (p/ o badge de contexto).
  categoryLabel: string
  version: number
  sections: BlueprintSection[]
  // Campos específicos do instrumento. 'target_bpm' é especial: espelha na
  // coluna lesson_plans.target_bpm (relatório e "Dar aula" leem dela).
  fields: BlueprintField[]
}

const S = {
  warmup: { id: 'warmup', label: 'Aquecimento', defaultResourceCategory: 'Aquecimento' as Category },
  technique: { id: 'technique', label: 'Técnica', defaultResourceCategory: 'Técnica' as Category },
  repertoire: { id: 'repertoire', label: 'Repertório', defaultResourceCategory: 'Repertório' as Category },
  homework: { id: 'homework', label: 'Tarefa de casa', defaultResourceCategory: 'Tarefa de Casa' as Category },
}

const BPM: BlueprintField = { key: 'target_bpm', label: 'Meta de BPM', placeholder: 'ex.: 90 ou 80–120' }
const TOM: BlueprintField = { key: 'tom', label: 'Tonalidade / tom', placeholder: 'ex.: C maior' }

// Blueprint usado quando não há categoria definida (= comportamento legado).
export const DEFAULT_BLUEPRINT: LessonBlueprint = {
  key: '_default',
  categoryLabel: 'Aula',
  version: 1,
  sections: [S.warmup, S.repertoire, S.homework],
  fields: [BPM],
}

// Por categoria de instrumento (INST_CATEGORIES).
const BLUEPRINTS: Record<InstCategory, LessonBlueprint> = {
  Cordas: {
    key: 'cordas',
    categoryLabel: 'Cordas',
    version: 1,
    sections: [S.warmup, S.technique, S.repertoire, S.homework],
    fields: [{ key: 'afinacao', label: 'Afinação', placeholder: 'ex.: padrão, Drop D' }, { ...TOM, label: 'Cifra / tom' }, BPM],
  },
  Sopros: {
    key: 'sopros',
    categoryLabel: 'Sopros',
    version: 1,
    sections: [
      { ...S.warmup, label: 'Aquecimento', hint: 'Respiração / embocadura' },
      S.technique,
      S.repertoire,
      S.homework,
    ],
    fields: [TOM, BPM],
  },
  Teclas: {
    key: 'teclas',
    categoryLabel: 'Teclas',
    version: 1,
    sections: [S.warmup, S.technique, S.repertoire, S.homework],
    fields: [TOM, BPM],
  },
  Percussão: {
    key: 'percussao',
    categoryLabel: 'Percussão',
    version: 1,
    sections: [
      S.warmup,
      { id: 'rudiments', label: 'Rudimentos', defaultResourceCategory: 'Técnica' },
      { id: 'groove', label: 'Groove / levada', defaultResourceCategory: 'Repertório' },
      S.repertoire,
      S.homework,
    ],
    fields: [BPM],
  },
  Voz: {
    key: 'voz',
    categoryLabel: 'Voz',
    version: 1,
    sections: [
      { ...S.warmup, label: 'Aquecimento vocal' },
      { id: 'breathing', label: 'Técnica respiratória', defaultResourceCategory: 'Técnica' },
      S.repertoire,
      S.homework,
    ],
    fields: [{ key: 'tessitura', label: 'Tessitura', placeholder: 'ex.: C3–G4' }, TOM],
  },
  Geral: {
    key: 'geral',
    categoryLabel: 'Teoria / Musicalização',
    version: 1,
    sections: [
      { id: 'content', label: 'Conteúdo', defaultResourceCategory: 'Teoria' },
      { id: 'exercises', label: 'Exercícios', defaultResourceCategory: 'Técnica' },
      S.homework,
    ],
    fields: [],
  },
}

// Bloco "catch-all" sempre disponível para recursos avulsos / legados.
export const GENERAL_SECTION: BlueprintSection = { id: 'general', label: 'Outros materiais' }

// Resolve o blueprint: instrumento específico (futuro) → categoria → default.
export function resolveBlueprint(
  _instrument: string | null,
  instrumentCategory: string | null,
): LessonBlueprint {
  if (instrumentCategory && instrumentCategory in BLUEPRINTS) {
    return BLUEPRINTS[instrumentCategory as InstCategory]
  }
  return DEFAULT_BLUEPRINT
}
