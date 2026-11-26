'use client'

import { useState } from 'react'

import { Field as DsField, Select as DsSelect } from '@/components/ds/Field'
import { IconClose } from '@/components/ds/icons'
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
  /** Usa os campos do padrão novo (components/ds). */
  ds?: boolean
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
  ds = false,
}: InstrumentFieldsProps) {
  const F = ds ? DsField : Field
  const S = ds ? DsSelect : Select
  const [category, setCategory] = useState(defaultCategory ?? '')
  const [instrument, setInstrument] = useState(defaultInstrument ?? '')
  const options = instrumentsForCategory(category)
  const extra = instrument && !options.includes(instrument) ? instrument : null

  return (
    <>
      <F label="Categoria do instrumento" htmlFor={categoryName} error={categoryError}>
        <S
          id={categoryName}
          name={categoryName}
          value={category}
          onChange={(e) => {
            const next = e.target.value
            setCategory(next)
            if (!instrumentsForCategory(next).includes(instrument)) setInstrument('')
          }}
        >
          <option value="">Selecione…</option>
          {INST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </S>
      </F>

      <F label={instrumentLabel} htmlFor={instrumentName} error={instrumentError}>
        <S
          id={instrumentName}
          name={instrumentName}
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          disabled={!category}
        >
          <option value="">{category ? 'Selecione…' : 'Escolha a categoria primeiro'}</option>
          {extra && <option value={extra}>{extra}</option>}
          {options.map((i) => <option key={i} value={i}>{i}</option>)}
        </S>
      </F>
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

// Seleção de VÁRIOS instrumentos (ex.: professor) seguindo o padrão de
// categoria → instrumento. Escolhe categoria + instrumento e adiciona à lista
// (chips). O valor vai num input escondido separado por vírgula.
export function MultiInstrumentField({
  name = 'instruments',
  defaultValues = [],
  label = 'Instrumentos',
}: {
  name?: string
  defaultValues?: string[]
  label?: string
}) {
  const [list, setList] = useState<string[]>(defaultValues)
  const [category, setCategory] = useState('')
  const [instrument, setInstrument] = useState('')
  const options = instrumentsForCategory(category)

  function add() {
    const value = instrument.trim()
    if (!value) return
    if (!list.includes(value)) setList([...list, value])
    setInstrument('')
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={list.join(', ')} />

      <Field label={label} htmlFor={`${name}-cat`}>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-stretch">
          <Select
            id={`${name}-cat`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setInstrument('')
            }}
            aria-label="Categoria do instrumento"
          >
            <option value="">Categoria…</option>
            {INST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>

          <Select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            disabled={!category}
            aria-label="Instrumento"
          >
            <option value="">{category ? 'Instrumento…' : 'Escolha a categoria'}</option>
            {options.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>

          <button
            type="button"
            onClick={add}
            disabled={!instrument}
            className="sn-btn sn-btn-secondary shrink-0"
          >
            Adicionar
          </button>
        </div>
      </Field>

      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {list.map((i) => (
            <span key={i} className="sn-badge sn-badge-brand pr-1.5 text-sm">
              {i}
              <button
                type="button"
                onClick={() => setList(list.filter((x) => x !== i))}
                aria-label={`Remover ${i}`}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-(--sn-mint-hover)"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
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
        <option value="">{optional ? 'Nenhum' : 'Selecione…'}</option>
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
