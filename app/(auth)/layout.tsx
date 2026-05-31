import Image from 'next/image'
import Link from 'next/link'

import styles from '@/components/auth/auth.module.css'

const LOGO_VAZADO = '/brand/logo-vazado.png'

// Layout de autenticação: painel de marca à esquerda (fundo ink),
// formulário à direita (canvas claro). Em mobile, só o formulário aparece
// com uma brand reduzida no topo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      {/* Painel de marca — escondido em mobile/tablet */}
      <aside className={styles.brandPanel}>
        <Link href="/" className={styles.brandHeader} aria-label="Sonorum">
          <Image
            src={LOGO_VAZADO}
            alt=""
            width={36}
            height={36}
            priority
            className={styles.brandMark}
          />
          <span className={styles.brandWord}>Sonorum</span>
        </Link>

        <div className={styles.brandPitch}>
          <p className={styles.brandPitchTitle}>
            A regência da sua escola de música, <em>num só lugar.</em>
          </p>
          <p className={styles.brandPitchSub}>
            Agenda, alunos, professores, materiais e financeiro — afinados.
          </p>
        </div>

        <p className={styles.brandFoot}>© Sonorum</p>
      </aside>

      {/* Painel do formulário */}
      <main className={styles.formPanel}>
        <div className={styles.formInner}>
          <Link href="/" className={styles.brandMobile} aria-label="Sonorum">
            <Image
              src={LOGO_VAZADO}
              alt=""
              width={32}
              height={32}
              className={styles.brandMobileMark}
            />
            <span className={styles.brandMobileWord}>Sonorum</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
