'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ds/Button'
import { Input, Select } from '@/components/ds/Field'
import { IconArrowRight } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import styles from '@/components/schedule/planner.module.css'
import { applyTemplateToLesson, saveLessonAsTemplate } from '@/lib/actions/lesson-templates'

export interface TemplateOption {
  id: string
  name: string
  instrument_category: string | null
  instrument: string | null
}

// Barra de modelos no topo do "Planejar": aplicar um modelo (pré-preenche o
// plano) ou salvar o plano atual como modelo. Aplicar SUBSTITUI o texto do
// plano. Como os campos do editor são não-controlados (defaultValue),
// recarregamos a página para repopular — router.refresh() não atualizaria os
// inputs já montados. Por isso a confirmação explícita antes de aplicar.
export function LessonTemplateBar({
  lessonId,
  templates,
  instrumentCategory,
  instrument,
}: {
  lessonId: string
  templates: TemplateOption[]
  instrumentCategory: string | null
  instrument: string | null
}) {
  const [selected, setSelected] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [applying, startApply] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [savingOpen, setSavingOpen] = useState(false)
  const [name, setName] = useState(instrument ? `Aula de ${instrument}` : '')
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  // Modelos do instrumento/categoria do aluno primeiro.
  const sorted = [...templates].sort((a, b) => {
    const am = a.instrument_category === instrumentCategory ? 0 : 1
    const bm = b.instrument_category === instrumentCategory ? 0 : 1
    return am - bm || a.name.localeCompare(b.name)
  })

  function apply() {
    setError(null)
    startApply(async () => {
      const res = await applyTemplateToLesson({ lessonId, templateId: selected })
      if (res.ok) window.location.reload()
      else {
        setError(res.error ?? 'Não foi possível aplicar.')
        setConfirming(false)
      }
    })
  }

  function save() {
    setError(null)
    setSaved(false)
    startSave(async () => {
      const res = await saveLessonAsTemplate({ lessonId, name })
      if (res.ok) {
        setSaved(true)
        setSavingOpen(false)
      } else setError(res.error ?? 'Não foi possível salvar.')
    })
  }

  return (
    <div className={styles.toolbar} role="group" aria-label="Modelos de aula">
      {savingOpen ? (
        <div className={styles.toolbarGroup}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do modelo"
            aria-label="Nome do modelo"
            className={styles.pillControl}
            autoFocus
          />
          <Button size="sm" onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Salvando…' : 'Salvar modelo'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSavingOpen(false)}>Cancelar</Button>
        </div>
      ) : (
        <div className={styles.toolbarGroup}>
          {templates.length > 0 ? (
            <Select
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setConfirming(false) }}
              aria-label="Modelo de aula"
              className={styles.pillControl}
            >
              <option value="">Usar um modelo</option>
              {sorted.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.instrument ? ` (${t.instrument})` : t.instrument_category ? ` (${t.instrument_category})` : ''}
                </option>
              ))}
            </Select>
          ) : (
            <p className={styles.toolbarNote}>Nenhum modelo ainda</p>
          )}

          {selected && !confirming && (
            <Button size="sm" variant="soft" onClick={() => setConfirming(true)} disabled={applying}>Aplicar</Button>
          )}
          {selected && confirming && (
            <span className={styles.confirm} role="alert">
              Isso troca o plano atual pelo do modelo.
              <Button size="sm" onClick={apply} disabled={applying}>{applying ? 'Aplicando…' : 'Trocar'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            </span>
          )}
          {!confirming && (
            <Button size="sm" variant="ghost" onClick={() => { setSavingOpen(true); setSaved(false) }}>
              Salvar como modelo
            </Button>
          )}
          {saved && <p className={`${styles.toolbarNote} ${styles.ok}`} role="status">Modelo salvo</p>}
          {error && <p className={`${styles.toolbarNote} ${styles.bad}`} role="alert">{error}</p>}
        </div>
      )}

      <div className={styles.toolbarEnd}>
        <InfoButton label="Como funcionam os modelos" align="end">
          Aplicar um modelo troca o que está escrito no plano. Salvar como modelo guarda o planejamento
          que já está salvo (objetivos, seções e campos), então salve o plano antes.
        </InfoButton>
        <Link href="/modelos" className={styles.toolbarLink}>Modelos <IconArrowRight /></Link>
      </div>
    </div>
  )
}
