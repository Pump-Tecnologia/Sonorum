import Link from 'next/link'

export const metadata = {
  title: 'Termos de Serviço — Sonorum',
  description: 'Termos e condições de uso da plataforma Sonorum.',
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

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-ink-muted hover:text-brand-600">← Voltar ao início</Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">Termos de Serviço</h1>
      <p className="mt-2 text-sm text-ink-muted">Última atualização: {UPDATED}</p>

      <div className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
        <p>
          Estes Termos regem o uso do Sonorum, uma plataforma de gestão para escolas de música
          (agenda de aulas, alunos, professores, planos, cobranças e integrações). Ao criar uma conta
          ou usar a plataforma, você concorda com estes Termos.
        </p>
      </div>

      <Section title="1. A plataforma">
        <p>
          O Sonorum oferece ferramentas para escolas de música organizarem aulas, cadastrarem alunos e
          professores, gerenciarem planos e cobranças, enviarem notificações e, opcionalmente, integrarem
          serviços de terceiros. Podemos evoluir, alterar ou descontinuar funcionalidades ao longo do tempo.
        </p>
      </Section>

      <Section title="2. Contas e responsabilidades">
        <p>
          Você é responsável por manter a confidencialidade das suas credenciais e por toda atividade na
          sua conta. Cada escola (administrador) é responsável pelos dados que cadastra e pelos usuários
          que cria (professores, alunos e responsáveis), inclusive por obter as autorizações necessárias
          para tratar esses dados na plataforma.
        </p>
      </Section>

      <Section title="3. Uso aceitável">
        <p>Você concorda em não usar o Sonorum para:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>atividades ilegais ou que violem direitos de terceiros;</li>
          <li>enviar conteúdo ofensivo, fraudulento ou não autorizado;</li>
          <li>comprometer a segurança, integridade ou disponibilidade do serviço.</li>
        </ul>
      </Section>

      <Section title="4. Pagamentos">
        <p>
          Os planos pagos da plataforma são cobrados conforme apresentado no momento da contratação. As
          cobranças que a escola faz aos seus alunos (PIX ou cartão, conforme o caso) ocorrem entre a
          escola e o aluno: <strong className="text-ink">o pagamento é recebido diretamente pela escola</strong>,
          por meio da chave PIX ou gateway que ela configurar — o Sonorum não intermedia esses valores.
          A escola é responsável por suas obrigações fiscais e contratuais com os alunos.
        </p>
      </Section>

      <Section title="5. Integrações de terceiros">
        <p>
          Funcionalidades opcionais podem se conectar a serviços de terceiros (por exemplo, Google
          Calendar e gateways de pagamento). O uso dessas integrações está sujeito também aos termos e
          políticas desses serviços. O tratamento de dados nessas integrações segue a nossa{' '}
          <Link href="/privacidade" className="text-brand-600 hover:underline">Política de Privacidade</Link>.
        </p>
      </Section>

      <Section title="6. Propriedade intelectual">
        <p>
          O software, a marca e os conteúdos do Sonorum pertencem ao Sonorum. Os dados inseridos pela
          escola continuam sendo dela. Não é permitido copiar, revender ou fazer engenharia reversa da
          plataforma sem autorização.
        </p>
      </Section>

      <Section title="7. Limitação de responsabilidade">
        <p>
          O serviço é fornecido "no estado em que se encontra". Empenhamo-nos para mantê-lo disponível e
          seguro, mas não garantimos operação ininterrupta ou livre de erros. Na máxima extensão
          permitida em lei, o Sonorum não se responsabiliza por danos indiretos ou lucros cessantes
          decorrentes do uso da plataforma.
        </p>
      </Section>

      <Section title="8. Encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar contas que
          violem estes Termos. Após o encerramento, os dados são tratados conforme a Política de
          Privacidade e as obrigações legais aplicáveis.
        </p>
      </Section>

      <Section title="9. Alterações e legislação">
        <p>
          Podemos atualizar estes Termos periodicamente; a data da última revisão consta no topo. Estes
          Termos são regidos pelas leis da República Federativa do Brasil.
        </p>
      </Section>

      <Section title="10. Contato">
        <p>
          Dúvidas sobre estes Termos:{' '}
          <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>.
        </p>
      </Section>
    </main>
  )
}
