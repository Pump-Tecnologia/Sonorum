'use client'

import { useState } from 'react'

import { Field, Select } from '@/components/ui/Field'
import { INST_CATEGORIES, INSTRUMENTS_BY_CATEGORY, instrumentsForCategory } from '@/lib/constants/resources'

interface InstrumentFieldsProps {
  defaultCategory?: string | null
  defaultInstrument?: string | null
  categoryError?: string
  instrumentError?: string
  categoryName?: string
  instrumentName?: string
  instrumentLabel?: string
}

// Categoria + instrumento como selects dependentes: o instrumento mostra só os
// da categoria escolhida. Preserva valor antigo (fora da lista) como opção extra.
export function InstrumentFields({
  defaultCategory,
  defaultInstrument,
  categoryError,
  instrumentError,
  categoryName = 'instrumentCategory',
  instrumentName = 'instrument',
  instrumentLabel = 'Instrumento',
}: InstrumentFieldsProps) {
  const [category, setCategory] = useState(defaultCategory ?? '')
  const [instrument, setInstrument] = useState(defaultInstrument ?? '')
  const options = instrumentsForCategory(category)
  const extra = instrument && !options.includes(instrument) ? instrument : null

  return (
    <>
      <Field label="Categoria do instrumento" htmlFor={categoryName} error={categoryError}>
        <Select
          id={categoryName}
          name={categoryName}
          value={category}
          onChange={(e) => {
            const next = e.target.value
            setCategory(next)
            if (!instrumentsForCategory(next).includes(instrument)) setInstrument('')
          }}
        >
          <option value="">—</option>
          {INST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>

      <Field label={instrumentLabel} htmlFor={instrumentName} error={instrumentError}>
        <Select
          id={instrumentName}
          name={instrumentName}
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          disabled={!category}
        >
          <option value="">{category ? 'Selecione…' : 'Escolha a categoria primeiro'}</option>
          {extra && <option value={extra}>{extra}</option>}
          {options.map((i) => <option key={i} value={i}>{i}</option>)}
        </Select>
      </Field>
    </>
  )
}

interface InstrumentSelectProps {
  name?: string
  label?: string
  defaultValue?: string | null
  error?: string
  optional?: boolean
}

// Select único de instrumento, agrupado por categoria (p/ formulários sem
// campo de categoria, ex.: transcrição).
export function InstrumentSelect({
  name = 'instrument',
  label = 'Instrumento',
  defaultValue,
  error,
  optional,
}: InstrumentSelectProps) {
  const current = defaultValue ?? ''
  const known = INST_CATEGORIES.some((c) => INSTRUMENTS_BY_CATEGORY[c].includes(current))

  return (
    <Field label={label} htmlFor={name} error={error}>
      <Select id={name} name={name} defaultValue={current}>
        <option value="">{optional ? '— (opcional)' : 'Selecione…'}</option>
        {current && !known && <option value={current}>{current}</option>}
        {INST_CATEGORIES.map((c) => (
          <optgroup key={c} label={c}>
            {INSTRUMENTS_BY_CATEGORY[c].map((i) => <option key={i} value={i}>{i}</option>)}
          </optgroup>
        ))}
      </Select>
    </Field>
  )
}
