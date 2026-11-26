'use client'

import styles from '@/components/resources/resources.module.css'

export type PreviewKind = 'pdf' | 'image'

/** Endereço de incorporação para links do YouTube; null para outros sites. */
export function youtubeEmbed(link: string | null | undefined): string | null {
  if (!link) return null
  try {
    const url = new URL(link)
    const host = url.hostname.replace(/^www\.|^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.slice(1)
    else if (host === 'youtube.com') id = url.searchParams.get('v') ?? (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : null)
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch {
    return null
  }
}

/**
 * Prévia ao lado do formulário: o arquivo (PDF ou imagem), o vídeo do link,
 * o texto/cifra, ou um aviso de que ainda não há o que mostrar.
 */
export function ResourcePreview({ file, link, body }: { file: { url: string; kind: PreviewKind } | null; link: string; body: string }) {
  const video = youtubeEmbed(link)

  return (
    <aside className={styles.preview} aria-label="Prévia do recurso">
      <p className={styles.previewTitle}>Como o aluno vai ver</p>
      {file?.kind === 'pdf' ? (
        <iframe src={file.url} title="Prévia do PDF" className={styles.previewFrame} />
      ) : file?.kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob) ou URL assinada
        <img src={file.url} alt="Prévia do arquivo" className={styles.previewImage} />
      ) : video ? (
        <iframe
          src={video}
          title="Prévia do vídeo"
          className={styles.previewVideo}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : body.trim() ? (
        <p className={`${styles.readingBody} ${styles.mono}`}>{body}</p>
      ) : (
        <p className={styles.previewEmpty}>Envie um PDF ou uma imagem, cole um link do YouTube ou escreva o texto, para ver a prévia aqui.</p>
      )}
    </aside>
  )
}
