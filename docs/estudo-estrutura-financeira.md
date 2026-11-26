# Sonorum: estrutura de cobrança, concorrência e viabilidade financeira

Data: 16/11/2026. Estudo de apoio à decisão, não é parecer contábil nem jurídico. Tudo o que está marcado como **premissa** é estimativa minha; tudo o que está marcado como **não verificado** precisa de confirmação antes de virar número firme.

---

## 1. BaaS no Asaas: avaliação técnica

### O que é

O Asaas hoje tem dois formatos de subconta ([docs](https://docs.asaas.com/docs/creating-baas-subaccounts)):

| | Não-BaaS | BaaS |
|---|---|---|
| Quem recebe e-mail do Asaas | O titular (a escola) | Ninguém. O Asaas não se comunica com o cliente final |
| Onde a escola envia documentos | Na interface do Asaas | Dentro do Sonorum (API, `onboardingUrl`) |
| Acesso da escola ao painel Asaas | Sim | Não, só o que o Sonorum expõe |
| Marca | Asaas | Asaas precisa aparecer como "Instituição Prestadora" em todo ponto de contato |
| Pré-requisito | Nenhum | Formato combinado antes com o gerente de contas. Criar subconta pela API sem isso gera subconta fora da estrutura BaaS |

O modelo "white label" antigo foi substituído pelo BaaS (Resoluções Conjuntas 16 e 17 do Banco Central). **Não existe mais white label puro.** O mais próximo de "ar de plataforma própria" é o BaaS, e mesmo nele a marca do Asaas precisa aparecer.

### Impacto no Sonorum

Ficam a cargo do Sonorum, no BaaS:
1. Tela de onboarding de documentos da escola (KYC) dentro do app, com o texto de responsabilidade do Asaas.
2. Receitas, comprovantes, contratos e telas de cobrança com a identificação do Asaas, seguindo o playbook de compliance que o suporte fornece.
3. Todas as comunicações de cobrança (o Asaas não envia nada ao aluno). O `notify()` já cobre e-mail e WhatsApp.
4. Webhooks de status da conta (`ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED` etc.), além do webhook de pagamento que já existe em `app/api/webhooks/asaas`.
5. Papel de "empresa Tomadora": a conta-mãe assume obrigações regulatórias perante o Asaas pelas subcontas.

O que já existe no código: `createAsaasSubaccount` e `createStudentCharge` em `lib/payments/asaas-billing.ts`, com chave de API cifrada por escola. Falta tudo do item 1 e o ajuste de identificação do item 2.

### Recomendação técnica

- **Ir de BaaS.** Entrega a experiência dentro do Sonorum (sem a escola cair num painel Asaas), que é a razão de ter subcontas. O custo é desenvolver o onboarding de documentos e cumprir os textos de marca.
- **Não-BaaS só serve como atalho** para validar com poucas escolas, porque obriga cada escola a criar senha e enviar documentos no Asaas.
- Depois do período de avaliação (seção 2), a chave de API só continua gerenciável se a operação for BaaS ou se as subcontas forem filiais com o mesmo prefixo de CNPJ da conta-mãe. Como escola e professor autônomo têm CNPJ/CPF próprio, na prática isso significa **BaaS**.

### Perguntas para o gerente de contas Asaas (levar por escrito)

1. O Sonorum entra como BaaS? Qual o processo e o prazo de aprovação do formato?
2. Qual a tarifa de criação de subconta? E existe mensalidade por subconta ativa?
3. Subconta de professor autônomo pessoa física (CPF) é aceita no BaaS? O formato `companyType` do código só prevê MEI, LIMITED, INDIVIDUAL e ASSOCIATION.
4. Qual a faixa de comissão por split permitida (os termos só aceitam "remuneração legítima")? Cobrar R$ 1,50 fixos por cobrança paga é aceito?
5. A aprovação regulatória pode ser pedida antes de estourar o período de avaliação? Em quanto tempo sai?
6. Qual a taxa de Pix, boleto e cartão para contrato de plataforma, e como ela muda com volume?

---

## 2. O período de avaliação de 60 dias

Limites, valendo para a conta-mãe a partir da primeira subconta criada em produção ([docs](https://docs.asaas.com/docs/creating-subaccounts)):

- até **10 subcontas** de titulares diferentes;
- até **R$ 2.000** emitidos em cobranças por subconta;
- até **60 dias corridos**.

Quando qualquer um dos três é atingido, ficam bloqueadas novas subcontas e **novas cobranças, assinaturas e links de pagamento**, até a revisão regulatória terminar.

Você tem razão de que 10 subcontas em 60 dias é improvável sem tráfego pago. O limite que costuma morder primeiro é outro: **R$ 2.000 de cobranças por subconta**. Uma escola com 35 alunos a R$ 200 emite R$ 7.000 só no primeiro mês e estoura o teto sozinha em poucos dias. Um professor autônomo com 10 alunos a R$ 200 emite R$ 2.000 e também encosta.

Consequências:
- Peça a aprovação regulatória **logo na primeira subconta**, não no fim do prazo. O Asaas permite pedir durante o período.
- Não coloque a primeira escola grande no ar antes da aprovação. Use uma escola ou professor pequeno como piloto.
- Isso é mais um motivo para a conta-mãe já ser o CNPJ definitivo. Trocar de conta-mãe reinicia tudo.

---

## 3. CNAE

Fontes são só blogs contábeis (nenhuma é IBGE/Receita), então tudo isso precisa passar pelo contador.

| CNAE | O que cobre | Serve para o Sonorum? |
|---|---|---|
| **6203-1/00** Desenvolvimento e licenciamento de programas de computador **não customizáveis** | Software padrão, igual para todos os clientes | **Principal recomendado.** Casa com SaaS: todas as escolas usam o mesmo produto |
| **6311-9/00** Tratamento de dados, provedores de serviços de aplicação e hospedagem | Hospedagem e processamento | **Secundário**, para cobrir a parte de infraestrutura da aplicação |
| 6202-3/00 Desenvolvimento e licenciamento de programas **customizáveis** | Software adaptado por cliente | Só se cada cliente receber módulos/configurações próprias |
| 6201-5/01 Desenvolvimento de programas sob encomenda | Projeto feito para um cliente | É o que a Pump faz hoje. Não é o caso do Sonorum |

Pontos de atenção:
- **Plano "Sob medida"** (enterprise, com `feature_overrides` por escola) é uma customização de configuração, não de código. Tende a continuar em 6203-1/00, mas vale perguntar ao contador se o 6202-3/00 também deve entrar como secundário.
- **MEI não pode** ter 6203-1/00 nem 6311-9/00. Confirma que o CNPJ precisa ser ME no Simples (ou outro porte).
- O anexo do Simples (III ou V) depende do CNAE e do **Fator R** (folha ÷ receita bruta de 12 meses ≥ 28% leva ao Anexo III). As fontes divergem sobre onde SaaS cai. Alíquota inicial: Anexo III 6%, Anexo V 15,5% ([comparação](https://agilize.com.br/artigos/?p=543)).
- Pergunte ao contador: com o CNAE 6203-1/00, vale pro-labore para atingir 28% de Fator R? (O pro-labore tem INSS.)

---

## 4. Concorrência

| Concorrente | Preço mensal | Observações |
|---|---|---|
| [Emusys](https://emusys.com.br/planos/) | R$ 189 (até 25 alunos), R$ 255 (26–50), R$ 305 (51–100), R$ 369 (101–150) até R$ 659 (500) | Preço por faixa de alunos ativos pagantes. Implantação única R$ 289. Sem fidelidade. Tudo incluído, **mas cobrança é por uso**: boleto por boleto pago, Pix dinâmico, recorrência no cartão, nota fiscal (pacote de 100), assinatura digital (R$ 2,90 por contrato), WhatsApp/SMS por mensagem. Valores só na demonstração. Sem plano para professor autônomo |
| [WebMúsica](https://sistemawebmusica.com.br/sistema-escola-musica-pequena) | A partir de R$ 69 (até 25 alunos) | Usuários ilimitados. Fontes do próprio fornecedor divergem (R$ 69 e R$ 79) |
| [Quality](https://sistemaquality.com.br/sistema-para-escola-de-musica/) | R$ 99 (Básico) e R$ 199 (Completo), mais cobrança por aluno | Preço varia com número de alunos |
| [GECEM (Mestresoft)](https://www.mestresoft.com/pt-br/gecem) | R$ 60, plano único | Gestão escolar genérica |
| [StudioFlow](https://www.studioflow.solutions/) | R$ 699, plano único | Escolas e estúdios de várias atividades |

Não encontrei preço de Sponte nem de plataforma específica para professor autônomo de música. **Os preços são anunciados pelos próprios fornecedores e não validei funcionalidades.**

### Leitura

1. **O mercado se divide em dois grupos.** Barato e genérico (R$ 60 a R$ 99) e completo por faixa de alunos (Emusys, de R$ 189 a mais de R$ 650).
2. **Seu preço fixo por conta é um diferencial concreto contra o Emusys.** Uma escola com 80 alunos paga R$ 305 lá. No Sonorum paga R$ 200, sem trocar de faixa conforme cresce. Quanto maior a escola, maior a vantagem.
3. **Cobrança por uso é o padrão do mercado.** O Emusys cobra por boleto/Pix pago separado da assinatura. Cobrar o recurso à parte, como você pensou, não é um risco de posicionamento. O que o diferenciaria é ser mais barato por cobrança.
4. **Professor autônomo é um nicho pouco atendido.** Nenhum concorrente achado tem plano claro para ele. R$ 100 para esse público compete com o ticket de escola pequena de alguns concorrentes, então vale validar disposição a pagar antes de travar o preço.
5. **O Sonorum já anuncia hoje** `Solo` R$ 49,90, `Solo Pro` R$ 99,90, `Profissional` R$ 99 e `Premium` R$ 199 (`lib/constants/plans.ts`). O seu "R$ 200 escola / R$ 100 autônomo" equivale ao Premium e ao Solo Pro. Se Profissional e Solo continuarem existindo, a receita média por conta fica **abaixo** da usada no modelo base, e a sensibilidade na seção 6 mostra o efeito.

---

## 5. Custos já conhecidos

Câmbio **premissa**: US$ 1 = R$ 5,50.

| Item | Valor | Status |
|---|---|---|
| Supabase Pro | US$ 25/mês (R$ 138) | Fontes divergem se é por organização ou projeto |
| Vercel Pro | US$ 20/mês por assento (R$ 110) | Um assento |
| Resend | US$ 20/mês (R$ 110) | Valor de blog, **não verificado**, conferir no site |
| Apple Developer | US$ 99/ano (R$ 45/mês) | Conta de organização exige D-U-N-S |
| Google Play | US$ 25 único | Não entra no mensal |
| Domínio e extras | R$ 15/mês | **Premissa** |
| Contador | R$ 300/mês | **Premissa**, pedir orçamento |
| **Total fixo** | **≈ R$ 718/mês** | |

Variáveis:

| Item | Valor | Status |
|---|---|---|
| Asaas, Pix/boleto | R$ 1,99 por cobrança (promo de R$ 0,99 por 3 meses; outra captura mostrou R$ 1,08) | Tabela varia por contrato |
| Asaas, cartão à vista | R$ 0,49 + 2,99% (promo 1,99% por 3 meses) | Vale também para assinatura |
| Cobrança da mensalidade do Sonorum | R$ 3,78 em média para R$ 200 e R$ 2,59 para R$ 100 (60% Pix, 40% cartão) | **Premissa** de mix |
| WhatsApp (Meta), mensagem utilitária no Brasil | ≈ R$ 0,08 | **Não verificado**, fontes de terceiros divergem (R$ 0,04 a R$ 0,08), e há possível mudança em out/2026 |
| Transcrição por IA (Klangio) | R$ 10 por professor solo com IA/mês | **Premissa**. Não achei preço do Klangio |
| Taxa de criação de subconta | desconhecida | Depende do contrato. Ficou **fora** do modelo |
| Imposto (Simples) | 6% (Anexo III) ou 15,5% (Anexo V) | Alíquota inicial; sobe com o faturamento. Ver nota na seção 6 |

**Não estão no modelo:** o seu tempo (desenvolvimento e suporte), nota fiscal, taxa de abertura de CNPJ, contabilidade de abertura, tráfego pago, comissão de lojas de app sobre assinatura dentro do app (se algum dia vender pela loja; vender só pela web evita isso, confirmar nas regras da Apple e do Google).

---

## 6. Modelo financeiro

### Premissas

- "100 usuários" interpretado como **100 contas pagantes** (escolas + professores autônomos), não alunos. Se a meta for outra, muda tudo.
- Mix de contas na meta: 40 escolas e 60 autônomos.
- Preço: escola R$ 200, autônomo R$ 100.
- Alunos pela plataforma de cobrança: 35 por escola e 10 por autônomo; 85% deles pagam pelo Sonorum.
- **Cobrança de alunos como recurso pago: R$ 1,50 por cobrança paga**, via split. A escola absorve a taxa do Asaas (originadora na subconta). Para a escola, o custo total fica em ≈ R$ 3,49 por mensalidade de R$ 200 (1,7%), próximo do cartão. Adesão ao recurso: 20% / 40% / 60% das contas, conforme o cenário.
- Churn, tempo de implantação e suporte **não modelados**.

### Resultado no mês 6 (receita e lucro mensais em regime)

| Cenário | Contas | Receita | Lucro, Anexo III | Lucro, Anexo V |
|---|---|---|---|---|
| Pessimista | 50 (15 escolas, 35 autônomos) | R$ 6.723 | **R$ 5.154** | R$ 4.515 |
| **Meta** | **100** (40 escolas, 60 autônomos) | **R$ 15.020** | **R$ 12.458** | **R$ 11.032** |
| Otimista | 200 (80 escolas, 120 autônomos) | R$ 31.060 | R$ 26.594 | R$ 23.643 |

Composição da receita da meta: R$ 14.000 de assinaturas e R$ 1.020 de comissão da cobrança de alunos. **A comissão é só ~7% da receita.** A cobrança de alunos é um recurso de retenção e de diferenciação, não a fonte de lucro.

### Rampa dos 6 meses (meta de 100, crescimento linear, Anexo III)

| Mês | Contas | Receita | Lucro | Lucro acumulado |
|---|---|---|---|---|
| 1 | 17 | R$ 2.362 | R$ 1.345 | R$ 1.345 |
| 2 | 33 | R$ 4.780 | R$ 3.461 | R$ 4.806 |
| 3 | 50 | R$ 7.255 | R$ 5.631 | R$ 10.437 |
| 4 | 67 | R$ 9.787 | R$ 7.853 | R$ 18.290 |
| 5 | 83 | R$ 12.375 | R$ 10.129 | R$ 28.419 |
| 6 | 100 | R$ 15.020 | R$ 12.458 | **R$ 40.878** |

Cuidado: essa rampa supõe 17 contas novas **por mês** desde o primeiro mês, o que é a premissa mais agressiva do modelo.

### Ponto de equilíbrio (mix 40/60, adesão 40%)

| Meta de lucro mensal | Contas, Anexo III | Contas, Anexo V |
|---|---|---|
| Cobrir os custos (R$ 0) | 6 | 7 |
| R$ 3.000 | 29 | 32 |
| R$ 6.000 | 52 | 58 |
| R$ 10.000 | 82 | 92 |

### Sensibilidades

- **Preço menor (R$ 150 escola / R$ 75 autônomo, por exemplo se Profissional e Solo ficarem):** lucro da meta cai de R$ 12.458 para **R$ 9.210** (-26%).
- **Cobrança de alunos como taxa fixa em vez de por cobrança** (R$ 60 por escola e R$ 30 por autônomo, 40% de adesão): comissão sobe de R$ 1.020 para R$ 1.680, mas é menos justa para quem tem poucos alunos e mais difícil de explicar. Tarifa por uso fica mais alinhada com o mercado.
- **Faixa do Simples:** a meta de 100 contas fatura ≈ R$ 180 mil por ano, no limite da primeira faixa (R$ 180 mil). Acima disso a alíquota efetiva sobe, então o lucro do segundo semestre em diante é um pouco menor que o mostrado. Confirmar a tabela com o contador.

---

## 6.1 Reprecificação: quem paga a taxa e preço por faixa (proposta)

**Quem paga a taxa do Asaas.** Na subconta, a escola é a originadora e o Asaas desconta a taxa da subconta dela (repasse ao aluno opcional por `asaas_pass_fee`). O custo do Sonorum por mensalidade de aluno é só o aviso, ≈ R$ 0,24 (3 mensagens de WhatsApp a R$ 0,08, **não verificado**). Se o Sonorum absorvesse a taxa (≈ R$ 3,78 por mensalidade de R$ 200, mix 60% Pix e 40% cartão), o prejuízo começa em ≈ 50 alunos pagando pela plataforma na escola de R$ 200 e ≈ 25 no autônomo de R$ 100. **Não absorver.**

**Proposta:**
- Taxa do Sonorum de **R$ 1,50 por mensalidade paga** (margem ≈ R$ 1,26). Para a escola, ≈ R$ 3,49 ao todo numa mensalidade de R$ 200 (1,7%).
- Mensalidade do plano **por faixa de alunos ativos**, ≈ 20% abaixo do Emusys. Faixas e valores são proposta, sem validação de mercado.

| Alunos | Emusys | R$ 200 fixo | Proposta |
|---|---|---|---|
| até 25 (usei até 30) | R$ 189 | R$ 200 | R$ 149 |
| 26 a 50 (31 a 60) | R$ 255 | R$ 200 | R$ 199 |
| 51 a 100 (61 a 100) | R$ 305 | R$ 200 | R$ 259 |
| 101 a 150 (101 a 200) | R$ 369 | R$ 200 | R$ 329 |

- Autônomo: testar R$ 79 a R$ 99 (sem concorrente de referência).
- **Premissas:** escolas 50/30/15/5% por faixa, com 20/40/75/130 alunos em média (ticket médio R$ 189,50); autônomo com 10 alunos; 85% pagam pela plataforma; 40% das contas usam a cobrança; IA de R$ 10 por autônomo; custo fixo R$ 718.

**Resultado no mês 6 (mix 40% escolas e 60% autônomos):**

| Contas | Autônomo | Receita | Lucro, Anexo III | Lucro, Anexo V |
|---|---|---|---|---|
| 50 | R$ 99 | R$ 7.318 | R$ 5.622 | R$ 4.926 |
| **100** | **R$ 99** | **R$ 14.637** | **R$ 11.961** | **R$ 10.571** |
| 200 | R$ 99 | R$ 29.274 | R$ 24.641 | R$ 21.860 |
| 100 | R$ 79 | R$ 13.437 | R$ 10.848 | R$ 9.571 |

Na meta de 100 contas, R$ 13.520 são mensalidades e R$ 1.117 taxa de cobrança. Ponto de equilíbrio: 6 contas. Para R$ 6 mil de lucro por mês, 54 contas; para R$ 10 mil, 85 (autônomo a R$ 99, Anexo III). Com autônomo a R$ 79: 59 e 93.

**Leitura:** o ticket médio das faixas (R$ 189,50) é praticamente o do R$ 200 fixo, então a receita total não muda. O ganho é de posicionamento: mais barato que o Emusys para a escola pequena e proporcional para a grande, que gera mais aviso e suporte.

## 7. Conclusões

1. **O custo fixo é baixo (≈ R$ 718/mês).** O negócio se paga com 6 a 7 contas. A viabilidade não depende do financeiro de alunos, depende de **adquirir contas**.
2. **100 contas em 6 meses é suficiente com folga**, se vier. No cenário-base dá ≈ R$ 12 mil por mês de lucro em regime. O desafio é a aquisição, não o custo.
3. **Aquisição é o risco real, e não está no modelo.** Sem tráfego pago, 100 contas pagantes em 6 meses exigem funil. Como ordem de grandeza (**premissa**, não dado): se 3% das contas gratuitas viram pagantes, 100 pagantes pedem cerca de 3.300 cadastros gratuitos. Vale medir a conversão real do plano gratuito nas primeiras semanas e recalcular.
4. **"Precisa de mais do que 100?"** Depende do objetivo. Para cobrir custos, não. Para R$ 6 mil de lucro por mês bastam ≈ 52 a 58 contas, e para R$ 10 mil ≈ 82 a 92. Para sustentar também um suporte dedicado ou uma pessoa, passar de 150 a 200 contas é o ponto em que a operação deixa de depender só de você.
5. **A cobrança de alunos custa caro de construir para o que rende** (onboarding KYC, compliance de marca do BaaS, aprovação regulatória) e rende só ≈ 7% da receita. Ela se justifica por retenção e por fechar escolas maiores, e porque o mercado já a oferece. Considere lançar primeiro **só a assinatura do Sonorum** (fluxo A, sem subconta) e deixar a cobrança de alunos para quando houver escolas pedindo.
6. **CNPJ:** com o mesmo raciocínio, a decisão de CNPJ novo continua valendo, mas deixa de ser urgente se o fluxo B (subcontas) entrar só depois. O fluxo A pode rodar na conta Asaas da Pump no início, ao custo da marca "Pump" no favorecido. A conta-mãe das subcontas é que precisa nascer definitiva.

## Decisões em aberto para você

1. A meta de 100 é de **contas** ou de usuários finais?
2. Preço final: R$ 200 e R$ 100 únicos, ou mantém Profissional (R$ 99) e Solo (R$ 49,90) como no código?
3. Cobrança de alunos entra no lançamento ou depois?
4. CNPJ do Sonorum antes do fluxo B, ou lançar o fluxo A pela Pump?

## Fontes

- [Asaas: criação de subcontas](https://docs.asaas.com/docs/creating-subaccounts) e [BaaS](https://docs.asaas.com/docs/creating-baas-subaccounts)
- [Asaas: preços e taxas](https://www.asaas.com/precos-e-taxas)
- [Emusys: planos](https://emusys.com.br/planos/)
- [WebMúsica](https://sistemawebmusica.com.br/sistema-escola-musica-pequena), [Quality](https://sistemaquality.com.br/sistema-para-escola-de-musica/), [GECEM](https://www.mestresoft.com/pt-br/gecem), [StudioFlow](https://www.studioflow.solutions/)
- [CNAE para SaaS (ContaJá)](https://contaja.com.br/blog/cnae-saas/)
- [Anexos do Simples Nacional (Agilize)](https://agilize.com.br/artigos/?p=543)
