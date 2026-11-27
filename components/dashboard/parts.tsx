import Link from 'next/link'

import { Avatar } from '@/components/ds/Avatar'
import { IconArrowRight, IconChevronRight } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import { StatusPill } from '@/components/ds/StatusPill'
import styles from '@/components/dashboard/dashboard.module.css'
import type { InstrumentTone } from '@/lib/constants/instrument-tone'
import { lessonStatus } from '@/lib/constants/lessons'
import { dateInBR } from '@/lib/timezone'
import { cn } from '@/lib/cn'

/** Data no alto e saudação grande, com as ações à direita. */
export function DashHeader({ kicker, title, info, actions }: { kicker?: string; title: string; info?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className={styles.header}>
      <div>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          {info && <InfoButton label={`Sobre ${title.toLowerCase()}`}>{info}</InfoButton>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}

interface StatTileProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  /** Cor do texto de apoio: alta (verde) ou baixa (vermelho). */
  trend?: 'up' | 'down'
  href?: string
  /** Valor em reais: fica numa linha só e encolhe a fonte quando falta espaço. */
  money?: boolean
}

/** Número grande e fino sobre vidro. Com `href`, o cartão inteiro vira link. */
export function StatTile({ label, value, hint, trend, href, money }: StatTileProps) {
  const body = (
    <>
      <p className={styles.statLabel}>{label}{href && <IconArrowRight />}</p>
      <p className={cn(styles.statValue, money && styles.statMoney)}>{value}</p>
      {hint && <p className={cn(styles.statHint, trend && styles[trend])}>{hint}</p>}
    </>
  )
  return href
    ? <Link href={href} className={cn(styles.stat, money && styles.statFit)}>{body}</Link>
    : <div className={cn(styles.stat, money && styles.statFit)}>{body}</div>
}

interface PanelProps {
  title: string
  id: string
  /** Link no canto ("Ver agenda"). */
  link?: { href: string; label: string }
  /** Texto de apoio do painel, dentro do botão "i". */
  info?: React.ReactNode
  badge?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Panel({ title, id, link, info, badge, className, children }: PanelProps) {
  return (
    <section className={cn(styles.panel, className)} aria-labelledby={id}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitleRow}>
          <h2 id={id} className={styles.panelTitle}>{title}</h2>
          {info && <InfoButton label={`Sobre ${title.toLowerCase()}`}>{info}</InfoButton>}
        </div>
        {badge}
        {link && <Link href={link.href} className={styles.panelLink}>{link.label} <IconArrowRight /></Link>}
      </div>
      {children}
    </section>
  )
}

interface LessonRowProps {
  href?: string
  time: string
  name: string
  meta?: string
  tone: InstrumentTone
  status: string
  live?: boolean
}

/** Uma aula do dia: hora, aluno na cor do instrumento e status. */
export function LessonRow({ href, time, name, meta, tone, status, live }: LessonRowProps) {
  const st = lessonStatus(status)
  const content = (
    <>
      <span className={styles.rowTime}>{time}</span>
      <Avatar name={name} tone={tone} className={styles.avatar} />
      <span className={styles.rowMain}>
        <span className={styles.rowName}>{name}</span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </span>
      <span className={styles.rowEnd}>
        <StatusPill tone={st.tone}>{live ? 'Agora' : st.label}</StatusPill>
        {href && <IconChevronRight className={styles.chevron} />}
      </span>
    </>
  )
  const className = cn(styles.row, live && styles.rowLive)
  return <li>{href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>}</li>
}

/** Linha genérica com link: ponto de cor, texto e detalhe à direita. */
export function RowLink({ href, label, detail, end, tone }: { href: string; label: React.ReactNode; detail?: React.ReactNode; end?: React.ReactNode; tone?: 'warning' | 'danger' }) {
  return (
    <li>
      <Link href={href} className={styles.row}>
        {tone && <span className={cn(styles.dot, tone === 'danger' && styles.dotDanger)} aria-hidden="true" />}
        <span className={styles.rowMain}>
          <span className={styles.rowName}>{label}</span>
          {detail && <span className={styles.rowMeta}>{detail}</span>}
        </span>
        <span className={styles.rowEnd}>
          {end}
          <IconChevronRight className={styles.chevron} />
        </span>
      </Link>
    </li>
  )
}

/** Barra horizontal com rótulo e valor (instrumentos, metas da semana). */
export function Bar({ label, value, total, display, tone = 'outro' }: { label: string; value: number; total: number; display?: React.ReactNode; tone?: InstrumentTone | 'mint' }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <li>
      <div className={styles.barHead}>
        <span>{label}</span>
        <strong>{display ?? value}</strong>
      </div>
      <div className={styles.track} role="presentation">
        <span className={styles.fill} data-tone={tone} style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Dia e mês em bloco ("23 nov"), no fuso de Brasília. */
export function DateBlock({ iso }: { iso: string }) {
  const [, month, day] = dateInBR(new Date(iso)).split('-').map(Number)
  return (
    <span className={styles.dateBlock} aria-label={`${day} de ${MONTHS_SHORT[month - 1]}`}>
      <strong>{day}</strong>
      <span>{MONTHS_SHORT[month - 1]}</span>
    </span>
  )
}
