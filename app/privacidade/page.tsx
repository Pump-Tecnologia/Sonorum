import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Sonorum',
  description: 'Como o Sonorum coleta, usa e protege os dados, incluindo a integração com o Google Calendar.',
}

const UPDATED = '6 de junho de 2026'
const CONTACT = 'contato@sonorum.com.br'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink-muted">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-ink-muted hover:text-brand-600">← Voltar ao início</Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-ink-muted">Última atualização: {UPDATED}</p>

      <div className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
        <p>
          O Sonorum é uma plataforma de gestão para escolas de música (agenda de aulas, alunos,
          professores, planos e cobranças). Esta política explica quais dados tratamos, com que
          finalidade, como os protegemos e quais são os seus direitos. Tratamos dados pessoais de
          acordo com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
        </p>
      </div>

      <Section title="1. Dados que coletamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-ink">Conta e perfil</strong>: nome, e-mail, telefone e papel (administrador, professor, aluno/responsável).</li>
          <li><strong className="text-ink">Operação da escola</strong>: aulas, presenças, planos, matrículas, relatórios de aula e cobranças.</li>
          <li><strong className="text-ink">Pagamentos</strong>: dados de cobrança processados por gateways (ex.: Mercado Pago) e chave PIX informada pela escola. Não armazenamos dados completos de cartão.</li>
          <li><strong className="text-ink">Uso</strong>: registros técnicos mínimos para funcionamento e segurança do serviço.</li>
        </ul>
      </Section>

      <Section title="2. Como usamos os dados">
        <p>
          Usamos os dados para operar a plataforma: agendar e gerenciar aulas, enviar notificações
          (e-mail e WhatsApp) sobre aulas, cobranças e relatórios, processar pagamentos e gerar
          indicadores de gestão para a escola. Não vendemos seus dados.
        </p>
      </Section>

      <Section title="3. Integração com o Google Calendar">
        <p>
          A conexão com o Google Calendar é <strong className="text-ink">opcional</strong> e iniciada
          por você. Ao conectar, solicitamos o escopo{' '}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.85em]">https://www.googleapis.com/auth/calendar.events</code>{' '}
          com a única finalidade de <strong className="text-ink">criar, atualizar e remover, na sua
          agenda, os eventos correspondentes às suas aulas no Sonorum</strong>.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Não lemos, listamos nem analisamos os eventos já existentes na sua agenda.</li>
          <li>Guardamos apenas um <em>token de atualização</em> (refresh token) de forma <strong className="text-ink">criptografada</strong>, usado exclusivamente para manter a sincronização das aulas.</li>
          <li>Você pode <strong className="text-ink">desconectar a qualquer momento</strong> no seu perfil, ou revogar o acesso em{' '}
            <a href="https://myaccount.google.com/permissions" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
          </li>
        </ul>
        <p className="rounded-xl border border-hairline bg-surface-muted/40 p-4 text-sm">
          <strong className="text-ink">Uso limitado (Google API Services User Data Policy):</strong> o uso
          das informações recebidas das APIs do Google pelo Sonorum adere à{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">Política de Dados do Usuário dos Serviços de API do Google</a>,
          incluindo os requisitos de <strong className="text-ink">Uso Limitado</strong>. Não transferimos
          esses dados a terceiros, exceto quando necessário para prestar o serviço a você, por exigência
          legal, ou como parte de uma fusão/aquisição; não usamos esses dados para publicidade; e nenhum
          ser humano lê esses dados, salvo seu consentimento explícito, por motivo de segurança, para
          cumprir a lei, ou de forma agregada/anonimizada para operação interna.
        </p>
      </Section>

      <Section title="4. Compartilhamento">
        <p>
          Compartilhamos dados apenas com provedores necessários ao funcionamento do serviço — por
          exemplo, hospedagem e banco de dados (Supabase/Vercel), envio de e-mail (Resend) e gateway de
          pagamento (Mercado Pago) — e somente na medida necessária. Cada escola é responsável pelos
          dados dos seus próprios alunos e professores dentro da plataforma.
        </p>
      </Section>

      <Section title="5. Segurança">
        <p>
          Adotamos medidas técnicas para proteger os dados, incluindo conexões via HTTPS, controle de
          acesso por papel e <strong className="text-ink">criptografia</strong> de credenciais sensíveis,
          como o token do Google. Ainda assim, nenhum sistema é 100% imune; em caso de incidente
          relevante, agimos para mitigar e comunicar conforme a lei.
        </p>
      </Section>

      <Section title="6. Retenção">
        <p>
          Mantemos os dados enquanto a conta estiver ativa e pelo período necessário às finalidades
          aqui descritas e a obrigações legais. Ao desconectar o Google Calendar, o token é revogado e
          deixamos de sincronizar suas aulas.
        </p>
      </Section>

      <Section title="7. Seus direitos (LGPD)">
        <p>
          Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados, além de revogar
          consentimentos. Para exercer esses direitos, fale conosco pelo contato abaixo.
        </p>
      </Section>

      <Section title="8. Contato">
        <p>
          Dúvidas sobre privacidade ou exercício de direitos:{' '}
          <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>.
        </p>
      </Section>

      <Section title="9. Atualizações">
        <p>
          Podemos atualizar esta política periodicamente. A data da última revisão está indicada no topo
          desta página.
        </p>
      </Section>
    </main>
  )
}
