// Domain A — cobrança automática das mensalidades dos ALUNOS via Asaas.
//
// Modelo: cada escola é uma SUBCONTA Asaas. A cobrança do aluno é criada NA
// subconta da escola (a escola é originadora → absorve a taxa Asaas); o Sonorum
// pega comissão opcional via `split` para a sua walletId. Distinto de
// lib/payments/asaas.ts, que cuida do billing SaaS (escola → Sonorum).
//
// Este módulo NÃO é chamado em produção ainda — é a base para as peças 4–6.

function apiBase(): string {
  return process.env.ASAAS_ENV === 'sandbox'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function call<T>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Asaas ${method} ${path} falhou (${res.status}): ${detail.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

// ── Política de taxa / gross-up ──────────────────────────────────────────────
// A Asaas não devolve a taxa antes de criar a cobrança, então estimamos por
// config (env), com defaults APROXIMADOS — confirme no seu contrato Asaas.

export type AsaasMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'

export interface FeeConfig {
  pixFixed: number
  boletoFixed: number
  cardPercent: number // fração (0.0349 = 3,49%)
  cardFixed: number
}

function num(envVar: string | undefined, fallback: number): number {
  const v = Number(envVar)
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

// Defaults aproximados — ajuste por env conforme o contrato/volume.
export function feeConfig(): FeeConfig {
  return {
    pixFixed: num(process.env.ASAAS_FEE_PIX, 1.99),
    boletoFixed: num(process.env.ASAAS_FEE_BOLETO, 1.99),
    cardPercent: num(process.env.ASAAS_FEE_CARD_PCT, 0.0349),
    cardFixed: num(process.env.ASAAS_FEE_CARD_FIXED, 0.49),
  }
}

// Valor a cobrar para que a escola receba ~`base` quando ela repassa a taxa.
// Sem repasse, a escola absorve e o valor é o próprio `base`.
export function grossUpForFee(
  base: number,
  method: AsaasMethod,
  passFee: boolean,
  cfg: FeeConfig = feeConfig(),
): number {
  if (!passFee) return round2(base)
  switch (method) {
    case 'PIX':
      return round2(base + cfg.pixFixed)
    case 'BOLETO':
      return round2(base + cfg.boletoFixed)
    case 'CREDIT_CARD':
      // Gross-up correto para taxa percentual (evita "taxa sobre taxa").
      return round2((base + cfg.cardFixed) / (1 - cfg.cardPercent))
    case 'UNDEFINED':
      // Sem método definido não dá pra calcular o repasse com precisão.
      throw new Error('Repasse de taxa exige um método específico (PIX, BOLETO ou CREDIT_CARD).')
  }
}

// Estimativa da taxa absoluta (para exibir na tela de pagamento).
export function estimateAsaasFee(
  base: number,
  method: AsaasMethod,
  cfg: FeeConfig = feeConfig(),
): number {
  if (method === 'UNDEFINED') return 0
  return round2(grossUpForFee(base, method, true, cfg) - base)
}

// ── Subconta da escola ───────────────────────────────────────────────────────

export interface CreateSubaccountInput {
  name: string
  email: string
  loginEmail: string
  cpfCnpj: string
  mobilePhone: string
  companyType: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION'
  incomeValue: number // faturamento/renda mensal (obrigatório, regulatório)
  address: string
  addressNumber: string
  province: string
  postalCode: string
  webhookUrl?: string // webhook único p/ todas as subcontas (baixa automática)
}

export interface SubaccountResult {
  accountId: string
  walletId: string
  apiKey: string // SENSÍVEL — cifrar com lib/security/crypto antes de gravar
}

interface AsaasAccountResponse {
  id: string
  walletId: string
  apiKey: string
}

// Cria a subconta na Asaas usando a chave da CONTA-MÃE (ASAAS_API_KEY).
export async function createAsaasSubaccount(input: CreateSubaccountInput): Promise<SubaccountResult> {
  const masterKey = process.env.ASAAS_API_KEY
  if (!masterKey) throw new Error('ASAAS_API_KEY (conta-mãe) não configurada.')

  const body: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    loginEmail: input.loginEmail,
    cpfCnpj: input.cpfCnpj,
    mobilePhone: input.mobilePhone,
    companyType: input.companyType,
    incomeValue: input.incomeValue,
    address: input.address,
    addressNumber: input.addressNumber,
    province: input.province,
    postalCode: input.postalCode,
  }
  if (input.webhookUrl) {
    body.webhooks = [
      {
        url: input.webhookUrl,
        email: input.email,
        enabled: true,
        interrupted: false,
        events: ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED'],
      },
    ]
  }

  const acc = await call<AsaasAccountResponse>(masterKey, 'POST', '/accounts', body)
  return { accountId: acc.id, walletId: acc.walletId, apiKey: acc.apiKey }
}

// ── Cobrança do aluno (na subconta da escola) ────────────────────────────────

export interface SplitEntry {
  walletId: string
  percentualValue?: number
  fixedValue?: number
}

export interface StudentChargeInput {
  subaccountApiKey: string // apiKey da subconta da escola (já decifrado)
  externalReference: string // nosso charges.id (p/ casar no webhook)
  customerName: string
  customerCpfCnpj: string // CPF do aluno/responsável (Asaas exige p/ boleto/pix)
  customerEmail?: string
  customerExternalRef: string // nosso users.id do aluno
  baseAmount: number // valor "limpo" da mensalidade
  dueDate: string // YYYY-MM-DD
  description: string
  method: AsaasMethod
  passFee: boolean // repassa a taxa ao aluno (gross-up)
  split?: SplitEntry[] // comissão Sonorum (vazio = sem comissão)
}

export interface StudentChargeResult {
  chargeId: string
  status: string
  value: number
  invoiceUrl: string | null
}

interface AsaasCustomerResponse {
  id: string
}
interface AsaasChargeResponse {
  id: string
  status: string
  value: number | null
  invoiceUrl: string | null
}

// Find-or-create do cliente (aluno) DENTRO da subconta da escola.
async function ensureCustomer(apiKey: string, input: StudentChargeInput): Promise<string> {
  const found = await call<{ data: AsaasCustomerResponse[] }>(
    apiKey,
    'GET',
    `/customers?externalReference=${encodeURIComponent(input.customerExternalRef)}&limit=1`,
  ).catch(() => null)
  if (found?.data?.[0]?.id) return found.data[0].id

  const created = await call<AsaasCustomerResponse>(apiKey, 'POST', '/customers', {
    name: input.customerName,
    cpfCnpj: input.customerCpfCnpj,
    email: input.customerEmail,
    externalReference: input.customerExternalRef,
  })
  return created.id
}

// Cria a cobrança do aluno na subconta da escola, com gross-up e split.
export async function createStudentCharge(input: StudentChargeInput): Promise<StudentChargeResult> {
  const value = grossUpForFee(input.baseAmount, input.method, input.passFee)
  const customer = await ensureCustomer(input.subaccountApiKey, input)

  const body: Record<string, unknown> = {
    customer,
    billingType: input.method,
    value,
    dueDate: input.dueDate,
    description: input.description,
    externalReference: input.externalReference,
  }
  if (input.split && input.split.length > 0) body.split = input.split

  const charge = await call<AsaasChargeResponse>(input.subaccountApiKey, 'POST', '/payments', body)
  return {
    chargeId: charge.id,
    status: charge.status,
    value: charge.value ?? value,
    invoiceUrl: charge.invoiceUrl,
  }
}
