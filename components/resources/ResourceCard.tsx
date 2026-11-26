import Link from 'next/link'

import { DeleteButton } from '@/components/admin/DeleteButton'
import { RestoreButton } from '@/components/admin/RestoreButton'
import { IconArrowRight, IconPlus } from '@/components/ds/icons'
import { InfoButton } from '@/components/ds/InfoButton'
import { MoreMenu } from '@/components/ds/MoreMenu'
import dsStyles from '@/components/ds/ds.module.css'
import { areaMeta, contentMeta, coverFor, difficultyLevel, topicMeta, type Cover } from '@/components/resources/resource-meta'
import styles from '@/components/resources/resources.module.css'
import { deleteResource, restoreResource } from '@/lib/actions/resources'
import { cn } from '@/lib/cn'

export interface ResourceItem {
  id: string
  title: string
  description: string | null
  category: string
  difficulty: string
  content_type: string
  instrument: string | null
  instrument_category: string | null
  content_link: string | null
  file_path: string | null
  body?: string | null
  template_id?: string | null
  customized?: boolean | null
}

type Mode = 'teacher' | 'student'

/** Para onde o botão principal leva: arquivo enviado, senão o link externo. */
function openTarget(r: ResourceItem, fileUrl: string | null): string | null {
  return fileUrl ?? r.content_link ?? null
}

/** Capa do recurso: imagem (arquivo ou foto padrão) ou a arte da área do instrumento. */
export function CoverImage({ cover, className }: { cover: Cover; className?: string }) {
  if (cover.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage, varia por acesso
    return <span className={cn(styles.cover, className)}><img src={cover.src} alt="" loading="lazy" /></span>
  }
  const area = areaMeta(cover.area)
  return (
    <span className={cn(styles.cover, styles.coverArt, styles.tone, className)} data-tone={area.tone} aria-hidden="true">
      <svg className={styles.coverStaff} viewBox="0 0 320 120" preserveAspectRatio="none"><path d="M0 30h320M0 48h320M0 66h320M0 84h320M0 102h320" /></svg>
      <area.Icon />
    </span>
  )
}

function Level({ difficulty }: { difficulty: string }) {
  return (
    <span className={styles.level}>
      <span className={styles.bars} data-level={difficultyLevel(difficulty)} aria-hidden="true"><i /><i /><i /></span>
      {difficulty}
    </span>
  )
}

function TeacherMenu({ r }: { r: ResourceItem }) {
  return (
    <MoreMenu label={`Mais ações para ${r.title}`}>
      {r.template_id && (
        <RestoreButton
          action={restoreResource}
          hidden={{ resourceId: r.id }}
          label="Voltar à versão do catálogo"
          confirmText="Voltar este recurso à versão do catálogo? Suas edições serão perdidas."
          buttonClassName={dsStyles.menuItem}
        />
      )}
      <DeleteButton
        action={deleteResource}
        hidden={{ resourceId: r.id }}
        label="Excluir recurso"
        confirmText={`Excluir o recurso "${r.title}"?`}
        buttonClassName={`${dsStyles.menuItem} ${dsStyles.menuItemDanger}`}
      />
    </MoreMenu>
  )
}

export function ResourceCard({ r, fileUrl, mode, index }: { r: ResourceItem; fileUrl: string | null; mode: Mode; index: number }) {
  const topic = topicMeta(r.category)
  const content = contentMeta(r.content_type)
  const area = areaMeta(r.instrument_category)
  const target = openTarget(r, fileUrl)
  const readable = mode === 'student' && !target && r.body
  const cover = coverFor(r, { path: r.file_path, url: fileUrl })

  return (
    <li className={styles.card} style={{ '--i': index } as React.CSSProperties}>
      <div className={styles.cardCover}>
        <CoverImage cover={cover} />
        <span className={styles.coverPill}>{r.instrument || area.label}</span>
        {mode === 'teacher' && r.template_id && (
          <span className={cn(styles.coverPill, styles.coverPillEnd)}>{r.customized ? 'Catálogo, editado' : 'Catálogo'}</span>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={cn(styles.topicTag, styles.tone)} data-tone={topic.tone}><topic.Icon />{r.category}</span>
          <Level difficulty={r.difficulty} />
        </div>
        <h3 className={styles.cardTitle}>{r.title}</h3>
        {r.description && <p className={styles.cardDesc}>{r.description}</p>}
        <span className={styles.type}><content.Icon />{r.content_type}</span>

        {readable ? (
          <details className={styles.reading}>
            <summary className={styles.open}>{content.openLabel} <IconArrowRight /></summary>
            <p className={cn(styles.readingBody, r.content_type === 'Cifra/Tablatura' && styles.mono)}>{r.body}</p>
          </details>
        ) : (
          <div className={styles.cardFoot}>
            {target && (
              <a href={target} target="_blank" rel="noopener noreferrer" className={styles.open}>
                {content.openLabel} <IconArrowRight />
              </a>
            )}
            {mode === 'teacher' && (
              <>
                <Link href={`/resources/${r.id}/edit`} className={styles.edit}>Editar</Link>
                <span className={styles.footEnd}><TeacherMenu r={r} /></span>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

/** Primeiro cartão da prateleira da escola: criar um recurso novo. */
export function NewResourceTile({ index }: { index: number }) {
  return (
    <li className={styles.newTile} style={{ '--i': index } as React.CSSProperties}>
      <Link href="/resources/new" className={styles.newTileLink}>
        <span className={styles.newTilePlus}><IconPlus /></span>
        <span className={styles.newTileTitle}>Novo recurso</span>
        <span className={styles.newTileHint}>PDF, vídeo, cifra ou texto para usar nas aulas</span>
      </Link>
    </li>
  )
}

export function ResourceRow({ r, fileUrl }: { r: ResourceItem; fileUrl: string | null }) {
  const topic = topicMeta(r.category)
  const content = contentMeta(r.content_type)
  const area = areaMeta(r.instrument_category)
  const target = openTarget(r, fileUrl)
  const cover = coverFor(r, { path: r.file_path, url: fileUrl })

  return (
    <li className={styles.row}>
      <CoverImage cover={cover} className={styles.rowThumb} />
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>{r.title}</span>
        <span className={styles.rowSub}>{r.description || r.instrument || area.label}</span>
      </div>
      <span className={cn(styles.topicTag, styles.tone)} data-tone={topic.tone}><topic.Icon />{r.category}</span>
      <Level difficulty={r.difficulty} />
      <div className={styles.rowActions}>
        {target && (
          <a href={target} target="_blank" rel="noopener noreferrer" className={styles.open}>
            {content.openLabel} <IconArrowRight />
          </a>
        )}
        <Link href={`/resources/${r.id}/edit`} className={styles.edit}>Editar</Link>
        <TeacherMenu r={r} />
      </div>
    </li>
  )
}

/** Prateleira da biblioteca ("Criados pela escola", "Do catálogo do Sonorum"). */
export function Shelf({
  id,
  title,
  hint,
  count,
  children,
}: {
  id: string
  title: string
  hint: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className={styles.topic} aria-labelledby={id}>
      <header className={styles.topicHead}>
        <div className={styles.topicText}>
          <div className={styles.topicNameRow}>
            <h2 id={id} className={styles.topicName}>{title}</h2>
            <InfoButton label={`Sobre ${title.toLowerCase()}`}>{hint}</InfoButton>
          </div>
        </div>
        <span className={styles.topicCount}>{count} {count === 1 ? 'recurso' : 'recursos'}</span>
      </header>
      <ul className={styles.cards}>{children}</ul>
    </section>
  )
}

/** Seção por tópico da aula (usada nos materiais do aluno). */
export function TopicSection({
  category,
  count,
  unit = ['recurso', 'recursos'],
  children,
}: {
  category: string
  count: number
  /** Singular e plural da contagem, ex.: ['material', 'materiais']. */
  unit?: [string, string]
  children: React.ReactNode
}) {
  const topic = topicMeta(category)
  const id = `topic-${category.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section className={cn(styles.topic, styles.tone)} data-tone={topic.tone} aria-labelledby={id}>
      <header className={styles.topicHead}>
        <span className={styles.topicIcon}><topic.Icon /></span>
        <div className={styles.topicText}>
          <div className={styles.topicNameRow}>
            <h2 id={id} className={styles.topicName}>{category}</h2>
            {topic.hint && <InfoButton label={`Sobre ${category.toLowerCase()}`}>{topic.hint}</InfoButton>}
          </div>
        </div>
        <span className={styles.topicCount}>{count} {count === 1 ? unit[0] : unit[1]}</span>
      </header>
      <ul className={styles.cards}>{children}</ul>
    </section>
  )
}
