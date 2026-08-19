# Spec — Design Técnico: App de Finanças Pessoais (Familiar)

**Fase:** 2/3 — Design
**Status:** Rascunho para revisão
**Baseado em:** spec-01-requisitos.md
**Próxima fase:** Tasks (lista de tarefas de implementação)

---

## 1. Stack técnica

| Camada | Escolha | Observação |
|---|---|---|
| Framework | **Next.js 14+ (App Router)**, JavaScript | Full-stack num projeto só, como pedido. |
| ORM | **Prisma** | Combinação mais documentada com Postgres; schema declarativo facilita a fase de Tasks. |
| Banco de dados | **PostgreSQL (Vercel Postgres, via Neon)** | Ver justificativa abaixo. |
| Autenticação | **NextAuth.js** (Credentials provider) + bcrypt para hash de senha | Sessão via JWT ou banco; e-mail + senha, conforme requisito. |
| UI | Tailwind CSS + shadcn/ui | Componentes prontos (tabelas, formulários, selects) reduzem código a escrever. |
| Testes | **Vitest** | Ver justificativa abaixo. |
| Hospedagem | Vercel (hobby) | Conforme requisito. |

### Banco de dados: por que Postgres, e não SQLite local

Na fase de Requisitos, a sugestão inicial foi "SQLite via Prisma/Drizzle". Isso **não funciona em produção no Vercel**: funções serverless rodam em ambiente efêmero, sem sistema de arquivos persistente entre execuções — um arquivo `.db` local perderia todas as escritas a cada novo cold start ou instância concorrente.

**Escolha:** **Vercel Postgres** (roda sobre Neon). Motivos:
- Integração nativa com Vercel: banco criado direto pelo dashboard, variáveis de ambiente auto-configuradas.
- Usa driver HTTP-friendly para serverless — não sofre do problema clássico de esgotamento de conexões que Postgres "tradicional" teria nesse ambiente.
- É a combinação Next.js + Prisma + Postgres, a mais documentada do ecossistema — menos chance de tropeçar em peculiaridades pouco documentadas durante a implementação, alinhado com o pedido de manter a implementação simples/leve em tokens.
- Tipos mais robustos para valores monetários (`Decimal` nativo) e melhor suporte a agregações (usadas nos blocos da Visão geral).

### Testes: por que Vitest, e onde focar no MVP

**Escolha:** Vitest em vez de Jest — configuração praticamente zero em projeto JS/ESM (Jest exige mais ajuste para rodar bem com o App Router do Next.js), roda rápido, e a API é quase idêntica à do Jest, então não há curva de aprendizado extra.

**Escopo de testes no MVP:** o maior risco de bug silencioso deste app está nas **funções puras de cálculo de data** (seções 4 e 5) — `calcularFatura` e `gerarParcelas` — porque erram fácil e silenciosamente (rollover de mês/ano, dia de fechamento maior que o mês, etc.), e um erro ali distorce dado financeiro sem quebrar a aplicação visivelmente. São também as mais fáceis de testar, por serem funções puras sem I/O.

Sugestão de cobertura prioritária (a virar tarefas concretas na fase de Tasks):
- `calcularFatura`: casos das tabelas de exemplo das seções 4 e 5 (vencimento antes/depois do fechamento, rollover de ano, fechamento em dia inexistente no mês).
- `gerarParcelas`: número correto de parcelas geradas, progressão de 1 mês por parcela, e o caso de borda de fechamento dia 31 caindo em fevereiro.
- Testes de componente/E2E (ex: Playwright) ficam **fora do MVP** — dado o porte do projeto (uso familiar, poucos usuários), o retorno não compensa o esforço nesta fase. Pode ser revisitado depois.

### Gráficos: removidos do escopo

A Task 17 implementou um gráfico de gastos por categoria com **Recharts** (`GraficoGastosPorCategoria`, em `acompanhamento-client.jsx`). O spec-01 revisado (seção 3, item 7) remove o requisito de gráficos/análises visuais da Visão geral — o foco passa a ser acompanhamento operacional e consulta das movimentações consolidadas.

Consequência técnica: a dependência `recharts` e o componente `GraficoGastosPorCategoria` ficam **órfãos** e devem ser removidos do código em uma task de limpeza (ver seção 8.5). Não há mais linha de "Gráficos" na stack.

## 2. Arquitetura geral

```
app/
├── (auth)/
│   ├── login/page.jsx
│   └── cadastro/page.jsx
├── (protegido)/
│   ├── layout.jsx                  ← navegação principal persistente (seção 8.1):
│   │                                  menu lateral (desktop) / barra inferior (mobile)
│   │                                  + ação global "+ Nova transação"
│   ├── lancamento/page.jsx         ← 2. Lançamento de transações (+ parcelamento);
│   │                                  também o destino da ação "+ Nova transação"
│   ├── contas/page.jsx             ← 3. CRUD de Contas (criação em 2 etapas — seção 8.2.3)
│   ├── visao-geral/page.jsx        ← 4. Visão geral (resumo + 4 blocos) — seção 8.3
│   │                                  [renomeado de acompanhamento/, ver seção 8.5]
│   └── transacoes/page.jsx         ← 5. Tabela com filtros
├── api/
│   └── auth/[...nextauth]/route.js
components/
├── ui/                              ← shadcn/ui (já existente)
├── navegacao/
│   └── NavegacaoPrincipal.jsx       ← menu lateral + barra inferior + ação global,
│                                       variantes alternadas via breakpoints do Tailwind
│                                       (não por detecção de media query em JS)
└── visao-geral/
    ├── SeletorPeriodo.jsx           ← navegação de mês/ano (seção 8.3.1)
    ├── ResumoMensal.jsx             ← 3 indicadores (seção 8.3.2)
    ├── BlocoConsolidado.jsx         ← estrutura comum dos blocos Entradas/Saídas (seção 8.3.4/8.3.7)
    ├── BlocoInvestimentos.jsx       ← variante agrupada por conta de investimento (seção 8.3.14)
    └── DetalheDiario.jsx            ← Popover (desktop) / Sheet bottom (mobile) — seção 8.3.4
lib/
├── db.js                            ← client Prisma
├── fatura.js                        ← algoritmo de fechamento/vencimento (seção 4)
├── parcelamento.js                  ← geração das N parcelas (seção 5)
├── datas.js                         ← + formatarDataAgrupamento (seção 8.3.10)
├── moeda.js                         ← já atende formatação de 2 casas (seção 8.3.11)
└── actions/                         ← Server Actions (mutações)
    ├── transacoes.js
    └── contas.js
prisma/
└── schema.prisma
```

O grupo `(protegido)` passa a ter um `layout.jsx` próprio — até aqui inexistente no código (a proteção de rota é feita inteiramente pelo middleware, seção 9). Esse layout é o local natural para a navegação persistente (seção 8.1), já que o App Router garante que ele envolve todas as rotas do grupo sem precisar repetir o menu em cada página.

- **Server Components** para leitura de dados (páginas de dashboard e tabela).
- **Server Actions** para mutações (criar/editar/apagar transação e conta) — evita ter que montar rotas de API REST separadas para um app deste porte.
- **Middleware** do Next.js protegendo o grupo `(protegido)/*`, redirecionando para `/login` se não houver sessão.

## 3. Schema de dados (Prisma)

Decisões de modelagem tomadas aqui, resolvendo as pendências da fase de Requisitos:

- **Polimorfismo de Conta:** *single table* com coluna discriminadora `tipo` e campos específicos de cartão como nullable. Só há dois campos extras (fechamento/vencimento) e um único tipo (`CARTAO_CREDITO`) que os usa — criar tabelas separadas por tipo (class table inheritance) seria complexidade desnecessária para o MVP.
- **mês/ano de referência:** dois campos inteiros (`mesReferencia` 1–12, `anoReferencia`), não um campo de data único. Ficam mais simples de indexar e filtrar exatamente como a tela pede ("filtrar por mês/ano"), e exibir "por extenso" é só mapear o número pro nome do mês.

```prisma
enum TipoTransacao {
  ENTRADA
  SAIDA
}

enum TipoConta {
  CONTA_CORRENTE
  CARTAO_CREDITO
  CONTA_INVESTIMENTO
}

enum Categoria {
  MERCADO
  LAZER
  SAUDE
  TRANSPORTE
  MORADIA
  SALARIO
  OUTROS
}

model Usuario {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  senhaHash    String
  criadoEm     DateTime @default(now())

  contas       Conta[]
  transacoes   Transacao[]
}

model Conta {
  id             String   @id @default(cuid())
  usuarioId      String
  usuario        Usuario  @relation(fields: [usuarioId], references: [id])
  nome           String
  tipo           TipoConta

  // Específicos de CARTAO_CREDITO (null para os demais tipos)
  diaFechamento  Int?
  diaVencimento  Int?

  criadoEm       DateTime @default(now())

  transacoes           Transacao[] @relation("ContaPrincipal")
  transacoesInvestimento Transacao[] @relation("ContaInvestimento")
}

model Transacao {
  id                String        @id @default(cuid())
  usuarioId         String
  usuario           Usuario       @relation(fields: [usuarioId], references: [id])

  tipo              TipoTransacao
  valor             Decimal       // sempre positivo; sinal é dado pelo `tipo`
  descricao         String
  categoria         Categoria

  contaId           String
  conta             Conta         @relation("ContaPrincipal", fields: [contaId], references: [id])

  dataCompra        DateTime
  dataEfetiva       DateTime
  mesReferencia     Int           // 1-12
  anoReferencia     Int

  // Parcelamento (null quando não é compra parcelada)
  numeroParcela     Int?
  totalParcelas     Int?
  parcelamentoId    String?

  // Recorrência (null quando não é uma transação recorrente)
  numeroOcorrencia  Int?
  totalOcorrencias  Int?
  recorrenciaId     String?

  // Investimento
  ehInvestimento    Boolean       @default(false)
  contaInvestimentoId String?
  contaInvestimento  Conta?       @relation("ContaInvestimento", fields: [contaInvestimentoId], references: [id])

  criadoEm          DateTime      @default(now())

  @@index([usuarioId])
  @@index([contaId])
  @@index([mesReferencia, anoReferencia])
  @@index([parcelamentoId])
  @@index([recorrenciaId])
}
```

**Nota sobre `Categoria` como enum:** como a spec define lista fixa definida no código, um `enum` do Prisma é mais simples que uma tabela — não precisa de seed nem de FK. Se no futuro categorias passarem a ser editáveis pelo usuário (fora do MVP), migra-se para uma tabela própria.

## 4. Algoritmo de fechamento/vencimento da fatura

Resolve a pendência "algoritmo exato" da fase de Requisitos (seção 3.1).

**Entradas:** `dataCompra` (dia/mês/ano), `diaFechamento`, `diaVencimento` (da Conta tipo Cartão de crédito).
**Saídas:** `mesFechamento`/`anoFechamento` (mês em que a fatura fecha) e `mesReferencia`/`anoReferencia` (mês de vencimento — usado para filtrar/agrupar). Os dois primeiros são expostos porque a seção 5 (parcelamento) precisa deles para calcular a abertura da fatura seguinte com precisão.

```javascript
/**
 * @param {Date} dataCompra
 * @param {number} diaFechamento
 * @param {number} diaVencimento
 */
function calcularFatura(dataCompra, diaFechamento, diaVencimento) {
  const diaCompra = dataCompra.getDate();
  let mesFechamento = dataCompra.getMonth() + 1; // 1-12
  let anoFechamento = dataCompra.getFullYear();

  // 1. Em qual fatura (mês de fechamento) a compra entra?
  if (diaCompra > diaFechamento) {
    mesFechamento += 1;
    if (mesFechamento > 12) { mesFechamento = 1; anoFechamento += 1; }
  }
  // se diaCompra <= diaFechamento, a compra já entra na fatura que fecha no mês corrente

  // 2. O vencimento dessa fatura cai no mesmo mês do fechamento ou no seguinte?
  let mesReferencia = mesFechamento;
  let anoReferencia = anoFechamento;
  if (diaVencimento < diaFechamento) {
    // dia de vencimento "menor" só faz sentido cronologicamente no mês seguinte
    mesReferencia += 1;
    if (mesReferencia > 12) { mesReferencia = 1; anoReferencia += 1; }
  }

  return { mesFechamento, anoFechamento, mesReferencia, anoReferencia };
}
```

**Exemplos (cartão com fechamento dia 25, vencimento dia 5):**
| Data da compra | Fatura fecha em | Vencimento (mês/ano ref.) |
|---|---|---|
| 10/ago | ago (10 ≤ 25) | dia 5 < 25 → **set/2026** |
| 26/ago | set (26 > 25) | **out/2026** |
| 25/dez | dez (25 ≤ 25) | **jan/2027** (rollover de ano) |

**Exemplo (cartão com fechamento dia 10, vencimento dia 17 — vencimento no mesmo mês do fechamento):**
| Data da compra | Fatura fecha em | Vencimento (mês/ano ref.) |
|---|---|---|
| 5/ago | ago | dia 17 ≥ 10 → **ago/2026** |
| 15/ago | set | **set/2026** |

**Caso de borda — dia de fechamento maior que o número de dias do mês** (ex: fechamento dia 31, compra em fevereiro): como a comparação é numérica (`diaCompra > diaFechamento`) e fevereiro nunca tem dia 31, toda compra em fevereiro será automaticamente tratada como "antes do fechamento" — o que corresponde exatamente ao comportamento esperado (fechamento "no fim do mês"). Não é necessário tratamento especial.

## 5. Algoritmos de parcelamento e recorrência

### 5.1 Parcelamento

Resolve a seção 3.2 dos Requisitos.

A `data_efetiva` de cada parcela 2+ é a **data de abertura da fatura seguinte** = data de fechamento da fatura anterior + 1 dia. Isso exige duas funções auxiliares: uma para achar o último dia de um mês (para não estourar, ex: fechamento configurado no dia 31 num mês de 30 dias) e outra para montar a data de abertura a partir daí.

```javascript
function ultimoDiaDoMes(ano, mes) {
  // dia 0 do mês seguinte = último dia do mês atual
  return new Date(ano, mes, 0).getDate();
}

function dataAberturaProximaFatura(mesFechamento, anoFechamento, diaFechamento) {
  // Clampa o dia de fechamento ao último dia do mês (ex: "dia 31" em mês de 30 dias vira dia 30)
  const dia = Math.min(diaFechamento, ultimoDiaDoMes(anoFechamento, mesFechamento));
  const fechamento = new Date(anoFechamento, mesFechamento - 1, dia);

  const abertura = new Date(fechamento);
  abertura.setDate(abertura.getDate() + 1); // JS rola corretamente pro mês/ano seguinte quando necessário
  return abertura;
}

/**
 * @param {Date} dataCompra
 * @param {number} valorParcela
 * @param {number} n - quantidade de parcelas
 * @param {{ diaFechamento: number, diaVencimento: number }} cartao
 */
function gerarParcelas(dataCompra, valorParcela, n, cartao) {
  const parcelamentoId = cuid();
  const parcelas = [];

  // Parcela 1: data efetiva = data da compra
  let { mesFechamento, anoFechamento, mesReferencia, anoReferencia } =
    calcularFatura(dataCompra, cartao.diaFechamento, cartao.diaVencimento);

  parcelas.push({
    numeroParcela: 1, totalParcelas: n, parcelamentoId,
    dataCompra, dataEfetiva: dataCompra,
    mesReferencia, anoReferencia, valor: valorParcela,
  });

  // Parcelas 2..N: data efetiva = abertura da fatura seguinte à fatura da parcela anterior
  for (let i = 2; i <= n; i++) {
    const dataEfetiva = dataAberturaProximaFatura(mesFechamento, anoFechamento, cartao.diaFechamento);

    // Reaplica o mesmo cálculo de fatura sobre a nova data efetiva — sem regra própria,
    // a data efetiva é que "direciona" a parcela para a fatura correta.
    ({ mesFechamento, anoFechamento, mesReferencia, anoReferencia } =
      calcularFatura(dataEfetiva, cartao.diaFechamento, cartao.diaVencimento));

    parcelas.push({
      numeroParcela: i, totalParcelas: n, parcelamentoId,
      dataCompra, dataEfetiva,
      mesReferencia, anoReferencia, valor: valorParcela,
    });
  }

  return parcelas; // inserir todas em uma transaction do Prisma
}
```

**Exemplo (cartão fechamento dia 25, vencimento dia 5 — compra em 10/ago/2026, 3x):**
| Parcela | Data efetiva | Mês/ano de referência |
|---|---|---|
| 1 | 10/ago/2026 (= data da compra) | set/2026 |
| 2 | 26/ago/2026 (fechamento 25/ago + 1) | out/2026 |
| 3 | 26/set/2026 (fechamento 25/set + 1) | nov/2026 |

**Exemplo de caso de borda (cartão fechamento dia 31, vencimento dia 10 — compra em 15/jan/2026, 3x):**
| Parcela | Data efetiva | Mês/ano de referência |
|---|---|---|
| 1 | 15/jan/2026 | fev/2026 |
| 2 | 1/fev/2026 (fechamento clampado p/ 31/jan + 1) | mar/2026 |
| 3 | 1/mar/2026 (fechamento clampado p/ 28/fev, já que 2026 não é bissexto, + 1) | abr/2026 |

O clamping garante que "dia 31" em fevereiro vire corretamente "dia 28" (ou 29, se bissexto) sem gerar datas inválidas — e mesmo assim a progressão de mês de referência continua avançando exatamente 1 mês por parcela.

### 5.2 Recorrência

Resolve a seção 3.4 dos Requisitos. Mais simples que parcelamento: cada ocorrência é uma transação "real" no seu próprio dia do mês (não uma parcela derivada da fatura anterior), então `dataCompra` **varia** por ocorrência — sem distinção entre data da compra e data efetiva.

```javascript
function proximaDataMensal(dataBase, mesesAFrente) {
  const ano = dataBase.getFullYear();
  const mes = dataBase.getMonth() + 1;
  const dia = dataBase.getDate();

  let novoMes = mes + mesesAFrente;
  const novoAno = ano + Math.floor((novoMes - 1) / 12);
  novoMes = ((novoMes - 1) % 12) + 1;

  const diaClampado = Math.min(dia, ultimoDiaDoMes(novoAno, novoMes));
  return new Date(novoAno, novoMes - 1, diaClampado);
}

/**
 * @param {Date} dataCompra
 * @param {number} valor
 * @param {number} n - quantidade de meses/ocorrências
 * @param {{ tipo: string, diaFechamento?: number, diaVencimento?: number }} conta
 */
function gerarOcorrenciasRecorrencia(dataCompra, valor, n, conta) {
  const recorrenciaId = cuid();
  const ocorrencias = [];

  for (let i = 1; i <= n; i++) {
    const data = proximaDataMensal(dataCompra, i - 1);

    const { mesReferencia, anoReferencia } =
      conta.tipo === "CARTAO_CREDITO"
        ? calcularFatura(data, conta.diaFechamento, conta.diaVencimento)
        : { mesReferencia: data.getMonth() + 1, anoReferencia: data.getFullYear() };

    ocorrencias.push({
      numeroOcorrencia: i, totalOcorrencias: n, recorrenciaId,
      dataCompra: data, dataEfetiva: data,
      mesReferencia, anoReferencia, valor,
    });
  }

  return ocorrencias; // inserir todas em uma transaction do Prisma
}
```

`ultimoDiaDoMes` é reaproveitada da seção 5.1, sem duplicação.

**Exemplo (débito, lançada 31/jan/2026, N=3):** 31/jan (mês de referência jan/2026) → 28/fev (fev/2026, clamp por 2026 não ser bissexto) → 31/mar (mar/2026).

**Exemplo (crédito, fechamento dia 17 / vencimento dia 24, lançada 5/ago/2026, N=3):** cada ocorrência recalcula `calcularFatura` de forma independente (não em cadeia como no parcelamento, já que a data de cada ocorrência já é conhecida de antemão) — 5/ago → ago/2026, 5/set → set/2026, 5/out → out/2026.

**Edição e exclusão:** `editarTransacao`/`apagarTransacao` (`lib/actions/transacoes.js`) precisam tratar linhas com `recorrenciaId !== null` com a mesma restrição de campos editáveis (valor/descrição/categoria) e a mesma opção `propagarParaRestantes` (`WHERE recorrenciaId = X AND dataEfetiva >= selecionada`) já usadas para `parcelamentoId !== null` (seção 5.1). Uma transação nunca tem `parcelamentoId` e `recorrenciaId` preenchidos ao mesmo tempo.

**Validação por tipo:** `criarTransacaoRecorrente` (`lib/actions/transacoes.js`) passa a receber `tipo` (`ENTRADA` ou `SAIDA`) e usa `gerarOcorrenciasRecorrencia` sem alteração — a função já é agnóstica de tipo, só usa `conta`. A validação de entrada é:
- `tipo = SAIDA`: `conta.tipo` deve ser `CONTA_CORRENTE` ou `CARTAO_CREDITO` (regra já existente).
- `tipo = ENTRADA`: `conta.tipo` deve ser **apenas** `CONTA_CORRENTE`; rejeita se `ehInvestimento = true` (resgate recorrente fora do escopo).

## 6. Regras de consolidação (Visão geral)

Tradução direta da seção 3.1 dos Requisitos em queries. A ordem abaixo já reflete a ordem de exibição definida na seção 8.3.3 (Entradas → Investimentos → Saídas no débito → Saídas no crédito):

- **Entradas:** `WHERE tipo = ENTRADA AND mesReferencia = X AND anoReferencia = Y` → cada linha checa `ehInvestimento` para exibir a tag "Resgate de investimento".
- **Investimentos:** `WHERE tipo = SAIDA AND ehInvestimento = true AND mesReferencia = X AND anoReferencia = Y`, agrupado (`GROUP BY`) por `contaInvestimentoId`, somando `valor`.
- **Saídas no débito:** `WHERE tipo = SAIDA AND conta.tipo = CONTA_CORRENTE AND ehInvestimento = false AND mesReferencia = X AND anoReferencia = Y`.
- **Saídas no crédito:** `WHERE tipo = SAIDA AND conta.tipo = CARTAO_CREDITO AND mesReferencia = X AND anoReferencia = Y`, agrupado por `dataCompra`.

Essas quatro queries alimentam os quatro blocos da Visão geral (seção 8.3); a apresentação (agrupamento por dia, popover de detalhamento, estados vazios etc.) é especificada na seção 8.

Ocorrências de transação recorrente (entrada ou saída) são transações comuns (mesma `mesReferencia`/`anoReferencia` de qualquer outra) — nenhuma query de consolidação precisa mudar.

## 7. Telas e componentes principais

Todas as rotas abaixo (exceto autenticação) compartilham a navegação persistente definida na seção 8.1, renderizada pelo `layout.jsx` do grupo `(protegido)`.

| Rota | Descrição | Componentes-chave |
|---|---|---|
| `/login`, `/cadastro` | Autenticação | Form + NextAuth |
| `/contas` | CRUD de Contas | Criação em **duas etapas** (seção 8.2.3): 1) seleção do tipo; 2) formulário específico do tipo. Listagem única, agrupada visualmente por tipo (Contas correntes, Cartões de crédito, Contas de investimento) |
| `/lancamento` | Novo lançamento | Form com: tipo, conta (filtra campos seguintes conforme tipo de conta), valor, categoria, descrição, data, checkbox "É investimento" (+ select de conta de investimento), e se conta = cartão: checkbox "Parcelado" (+ nº parcelas, valor da parcela). Checkbox "Recorrente" (+ nº de meses): disponível para saída em Conta corrente ou Cartão de crédito, **e também para entrada em Conta corrente** (não para entrada em Cartão de crédito); mutuamente exclusivo com "Parcelado" (só existe p/ saída no crédito). Quando "Recorrente" + tipo Entrada, o checkbox "É investimento" fica indisponível (resgate recorrente fora do escopo — seção 5.2). **Também é o destino direto da ação global "+ Nova transação"** (seção 8.1) — sem tela intermediária |
| `/visao-geral` | Visão geral (renomeada de `/acompanhamento`, ver seção 8.5) | Cabeçalho (título + ação "+ Nova transação"), seletor de mês/ano, resumo de 3 indicadores, 4 blocos em sequência vertical (Entradas, Investimentos, Saídas no débito, Saídas no crédito) com agrupamento diário e detalhamento via Popover/Sheet. Sem gráfico. Detalhamento completo na seção 8.3 |
| `/transacoes` | Tabela | Tabela enxuta (5 colunas) com indicadores visuais compactos, barra de filtros acima (busca + Conta/Categoria/Mês-Ano), linha inteira clicável abrindo modal único de detalhe/edição/exclusão (seção 12) |

## 8. Arquitetura de UX/UI — Navegação e Interação

Esta seção consolida as decisões de UX/UI da navegação principal e da Visão geral. Em caso de conflito com a seção 7 ou com qualquer descrição anterior de navegação, organização visual ou interação, **as definições desta seção prevalecem**.

### 8.1 Navegação principal

A navegação autenticada tem três áreas: **Visão geral**, **Transações**, **Contas**. Não existe área principal própria para "Investimentos" no MVP — investimentos são um tipo de movimentação e um bloco dentro da Visão geral (seção 8.3.14). Uma ação global **"+ Nova transação"** fica acessível a partir de qualquer área e **navega direto para `/lancamento`** (rota já implementada na Task 15), sem etapa intermediária de escolha de tipo de transação.

Implementação sugerida: um único componente `components/navegacao/NavegacaoPrincipal.jsx`, renderizado pelo `layout.jsx` do grupo `(protegido)`, com as duas variantes (lateral/inferior) marcadas via classes responsivas do Tailwind (`hidden md:flex` / `flex md:hidden`) — evita detecção de breakpoint em JavaScript e funciona bem com Server Components.

#### 8.1.1 Desktop
Estrutura persistente em menu lateral, com os três destinos e a ação "+ Nova transação" em posição de destaque (ex.: botão de destaque no topo do menu).

#### 8.1.2 Mobile
Barra inferior fixa com acesso direto às três áreas. A interface não depende de menu hambúrguer para os três destinos principais.

#### 8.1.3 Menu do usuário

Um menu do usuário logado fica acessível a partir de qualquer área (spec-01 item 10). Mostra o nome do usuário autenticado (`session.user.name`) e uma ação "Sair".

**Implementação:** `useSession()` e `signOut()` de `next-auth/react`, direto no componente `NavegacaoPrincipal` (já client component) — o `SessionProvider` já está montado na raiz (`app/providers.jsx`), sem necessidade de buscar a sessão em `layout.jsx` nem prop-drilling. `signOut({ callbackUrl: "/login" })` cuida do redirecionamento pós-logoff.

Componente novo: `Button` (gatilho) + `DropdownMenu` do shadcn/ui (ainda não instalado no projeto — adicionar via `npx shadcn add dropdown-menu`), com um item de rótulo (nome/e-mail) e um item de ação "Sair".

**Desktop:** rodapé do `<aside>` (`mt-auto`, abaixo da navegação), mesmo padrão visual dos itens de navegação (ícone + texto).

**Mobile:** a barra inferior já está ocupada (3 destinos + "Nova"). O menu do usuário fica numa **barra superior fixa e enxuta** (`fixed top-0 inset-x-0 md:hidden`), só com esse menu, alinhado à direita. `layout.jsx` ganha padding-top no mobile (`pt-14 md:pt-0`) para compensar, simétrico ao `pb-16` já existente para a barra inferior.

### 8.2 Estrutura das áreas principais

#### 8.2.1 Visão geral (`/visao-geral`)
Tela principal de acompanhamento financeiro mensal. Ver detalhamento completo na seção 8.3.

#### 8.2.2 Transações (`/transacoes`)
Tela única de consulta e gestão: listagem, busca/filtros e ações de editar/apagar. Sem subpáginas por tipo de transação no MVP. Sem mudanças em relação à seção 7 já existente.

#### 8.2.3 Contas (`/contas`)
Tela única mostrando todas as contas simultaneamente, agrupadas visualmente por tipo: Contas correntes, Cartões de crédito, Contas de investimento.

**Criação de conta em duas etapas:**
1. O usuário escolhe o tipo de conta (Conta corrente, Cartão de crédito ou Conta de investimento).
2. O sistema apresenta o formulário específico daquele tipo.

> **Nota de impacto**: o `contas-client.jsx` atual (Tasks 9–10) implementa um formulário único, com `Select` de tipo e campos condicionais (`ehCartao`) — não o wizard de 2 etapas, e a listagem é uma tabela única (coluna "Tipo"), não agrupada visualmente. Essa tela precisa ser refeita; ver seção 8.5.

### 8.3 Detalhamento da Visão geral

Estrutura do topo: 1ª linha = título "Visão geral" + ação "+ Nova transação" (desktop: mesma linha, título à esquerda, ação em destaque). 2ª linha = navegação do período. Abaixo: os três indicadores do resumo mensal.

#### 8.3.1 Navegação do período
Ir para mês anterior/próximo; clicar no período exibido abre um seletor dedicado (ano atual, 12 meses em grade, mês selecionado destacado, navegação entre anos, atualiza a Visão geral ao selecionar). Desktop: `Popover` do shadcn/ui a partir do período. Mobile: `Sheet` com `side="bottom"` (bottom sheet) — ambos já disponíveis na stack, sem nova dependência.

**Swipe no mobile:** a navegação de mês (`mesAnterior`/`mesSeguinte`, que fazem `router.push("/visao-geral?mes=X&ano=Y")`) é extraída de `SeletorPeriodo` para um hook compartilhado `useNavegacaoPeriodo(mes, ano)` em `seletor-periodo.jsx`. Esse hook passa a ser reaproveitado tanto pelos botões de seta quanto por um listener de toque (`touchstart`/`touchend`) no container raiz de `VisaoGeralClient`: um arrasto horizontal maior que o deslocamento vertical e acima de 50px dispara `mesSeguinte()` (deslizar para a esquerda) ou `mesAnterior()` (deslizar para a direita). O gesto só é avaliado quando `window.innerWidth < 768` no momento do toque, preservando o desktop inalterado — sem necessidade de nenhuma biblioteca nova de gestos.

**Transição visual do swipe:** ao trocar de mês via swipe, o conteúdo abaixo do seletor de período (cards de resumo + os quatro blocos) é remontado com `key={`${mes}-${ano}`}`, disparando uma animação de entrada via `tailwindcss-animate` — a mesma biblioteca já usada em `Dialog`/`Sheet`, sem nova dependência: `animate-in fade-in slide-in-from-right-8 duration-200` para o próximo mês (swipe à esquerda), ou `slide-in-from-left-8` para o mês anterior (swipe à direita). A direção é guardada num `ref` interno a `VisaoGeralClient`, setado no handler de swipe antes de navegar. Como a troca de `searchParams` não desmonta `VisaoGeralClient` (mesmo a rota tendo `loading.jsx`, só as props são atualizadas), o `ref` sobrevive até o próximo render — sua leitura acontece diretamente durante a renderização, para computar a classe do `key` recém-trocado, e um `useEffect` dependente de `mes`/`ano` só limpa o `ref` depois, por higiene. Sem animação no carregamento inicial da página nem nas trocas de mês pelas setas ou pelo seletor de mês/ano — escopo restrito ao gesto de swipe. **Efeito colateral aceito:** como a remontagem reinicia o estado local de cada componente filho, as seções expandidas (Entradas/Investimentos/Saídas no débito/Saídas no crédito) voltam a ficar colapsadas a cada troca de mês via swipe.

#### 8.3.2 Resumo financeiro do mês
Três indicadores: **Entradas** (soma de todas as entradas do mês, incluindo resgates); **Saídas** (soma das Saídas no débito e das Saídas no crédito do mês de referência); **Disponível** (Entradas − Saídas no débito − Saídas no crédito − Investimentos). O bloco Investimentos entra na conta porque representa dinheiro comprometido (aportado) no mês, ainda que não seja um gasto por categoria — resgates não são subtraídos de novo aqui, pois já estão embutidos em Entradas. Cards apenas informativos no MVP (não são atalhos/links/expansores). No mobile: os três cards empilham em uma única coluna (uma card por linha, largura total) — evita corte de valores grandes ou negativos, já que nenhum card divide a largura com outro. A partir do breakpoint `md`, volta ao grid de 3 colunas lado a lado. Sem rolagem horizontal.

*(Os nomes dos indicadores são: Entradas, Saídas, Disponível — o antigo "Saldo" passa a se chamar "Disponível"; os outros dois nomes não mudam.)*

#### 8.3.3 Organização visual dos quatro blocos
Sequência vertical (inclusive no desktop), nesta ordem: **Entradas → Investimentos → Saídas no débito → Saídas no crédito**. Substitui qualquer organização em grid 2x2 mencionada anteriormente; prioriza espaço de leitura dos dados.

#### 8.3.4 Agrupamento diário e detalhamento por interação
Nos blocos Entradas, Saídas no débito e Saídas no crédito, as transações são agrupadas por dia. Na visualização principal, cada dia mostra apenas data + valor total do dia, em ordem cronológica crescente — as transações individuais não ficam permanentemente visíveis.

Detalhamento por interação:
- **Desktop**: hover sobre o agrupamento abre um `Popover` rico próximo à linha (sem alterar layout), com descrição, categoria, valor de cada transação e total do dia.
- **Mobile**: toque abre uma `Sheet` (bottom sheet) equivalente, preservando a Visão geral em segundo plano.

Sem informações de conta/cartão no detalhamento diário no MVP. Sem limite arbitrário de itens nem "Ver mais" — conteúdo excedente usa altura máxima + rolagem interna (`overflow-y-auto`) dentro do `Popover`/`Sheet`.

#### 8.3.5 Regra visual — Saídas no crédito
Continua filtrado pelo mês de referência da fatura (seção 6); agrupado pelo dia da compra original; uma compra de outro mês pode aparecer no período visualizado quando sua fatura pertence a esse mês de referência. A data original da compra deve ficar visível, para não parecer erro.

#### 8.3.6 Identidade visual dos blocos
Mesma estrutura/padrão de leitura nos quatro blocos, diferenciados por ícone próprio e cor de destaque discreta associada ao tipo — usada só em elementos pontuais (ícones/indicadores), não em fundos totalmente coloridos.

#### 8.3.7 Estrutura visual contínua
Os quatro blocos são seções abertas da página (não cards independentes), separadas por espaçamento vertical e divisores sutis — como um extrato contínuo. Cabeçalho de cada bloco: ícone + nome + valor total consolidado na mesma linha (ex.: "▪ ENTRADAS R$ 8.500,00"). No mobile: ícone+título à esquerda, valor total à direita, mesma linha.

#### 8.3.8 Estado de erro no carregamento
Erro contextual quando a Visão geral não conseguir carregar/atualizar: informa a falha claramente (sem confundir com "sem movimentações"), disponibiliza "Tentar novamente", mantém a estrutura identificável, e **permanece visível** enquanto os dados não estiverem disponíveis (não é uma notificação temporária isolada).

#### 8.3.9 Estado de carregamento
Skeleton loading (acesso inicial, troca de período, retorno à tela). A estrutura geral fica visível com placeholders neutros para período, indicadores, valores/conteúdo dos blocos e agrupamentos, preservando as dimensões do conteúdo definitivo. Sem spinner central como representação principal; dados do período anterior não devem parecer pertencer ao novo período. Realização sugerida: `<Skeleton>` do shadcn/ui combinado com `loading.jsx`/`Suspense` do App Router na rota `/visao-geral`.

#### 8.3.10 Formatação de datas (específica da Visão geral)
Formato compacto `DD MMM` (ex.: "05 AGO", "28 JUL"): dia sempre 2 dígitos, mês abreviado em 3 letras maiúsculas, sem ano. Aplicado aos agrupamentos diários e ao cabeçalho do detalhamento — **só nesta tela**; não altera `formatarDataCurta` (`lib/datas.js`), usada em `/transacoes`.

Nova função em `lib/datas.js` (adicionada, não substitui a existente):
```javascript
const MESES_ABREV = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

export function formatarDataAgrupamento(data) {
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  return `${dia} ${MESES_ABREV[d.getMonth()]}`;
}
```

#### 8.3.11 Formatação de valores monetários
Sempre 2 casas decimais (ex.: "R$ 8.500,00", "R$ 42,50"), centavos nunca ocultados mesmo quando zero. **Sem mudança necessária em `lib/moeda.js`**: `formatarReais`/`formatarCentavosParaReais` já usam `toLocaleString` com `style: "currency", currency: "BRL"`, que já formata com 2 casas decimais fixas por padrão — basta reaproveitá-las nos componentes da Visão geral.

#### 8.3.12 Mês sem movimentações / estados vazios dos blocos
Quando o período não tiver nenhuma movimentação em nenhum dos 4 blocos, a Visão geral mantém sua estrutura padrão (sem estado vazio geral adicional). Cada bloco permanece visível, mostrando R$ 0,00 e uma mensagem contextual (ex.: "Nenhuma entrada neste mês.", "Nenhuma saída no débito neste mês.", "Nenhuma saída no crédito neste mês.", "Nenhum investimento neste mês."). Blocos vazios não são ocultados.

#### 8.3.13 Destaque do dia atual
Quando o período visualizado é o mês atual e existe agrupamento na data atual, esse dia recebe destaque visual sutil (indicador pequeno ou ajuste discreto de tipografia) — sem virar card nem fundo dominante. Não exibido para outros períodos.

#### 8.3.14 Bloco de Investimentos
Visualização consolidada por Conta de investimento: total aportado no mês no cabeçalho do bloco; uma linha por Conta de investimento que recebeu aportes no período, com nome da conta e valor total aportado nela no mês (query da seção 6). Aportes individuais não ficam permanentemente visíveis. Resgates não aparecem aqui — continuam no bloco de Entradas.

#### 8.3.15 Tratamento de textos longos no detalhamento
Descrições no detalhamento diário ocupam uma única linha, truncadas com reticências quando excedem o espaço (ex.: "Supermercado Extra Contagem... R$ 420,00"). Categoria e valor mantêm posicionamento fixo. Sem quebra automática em múltiplas linhas (`truncate` do Tailwind resolve isso diretamente).

### 8.4 Mapeamento sugerido de componentes

| Componente | Local sugerido | Responsabilidade |
|---|---|---|
| `NavegacaoPrincipal` | `components/navegacao/NavegacaoPrincipal.jsx` | Menu lateral + barra inferior + ação "+ Nova transação" (seção 8.1) |
| `SeletorPeriodo` | `components/visao-geral/SeletorPeriodo.jsx` | Navegação de mês/ano + `Popover`/`Sheet` de seleção (8.3.1) |
| `ResumoMensal` | `components/visao-geral/ResumoMensal.jsx` | Os 3 indicadores (8.3.2) |
| `BlocoConsolidado` | `components/visao-geral/BlocoConsolidado.jsx` | Estrutura comum de Entradas/Saídas débito/Saídas crédito: cabeçalho + agrupamento diário (8.3.4, 8.3.6, 8.3.7), reaproveitado com props de ícone/cor/dados por tipo |
| `BlocoInvestimentos` | `components/visao-geral/BlocoInvestimentos.jsx` | Variante agrupada por conta de investimento, não por dia (8.3.14) |
| `DetalheDiario` | `components/visao-geral/DetalheDiario.jsx` | `Popover` (desktop) / `Sheet` bottom (mobile) de detalhamento (8.3.4) |
| `MenuUsuario` | `components/navegacao/menu-usuario.jsx` | Nome do usuário + ação "Sair" (`DropdownMenu`), usado dentro de `NavegacaoPrincipal` (8.1.3) |

### 8.5 Impacto em código já implementado (não coberto por este documento — gera novas tasks em spec-03)

- **Rename de rota**: `app/(protegido)/acompanhamento/` → `app/(protegido)/visao-geral/` (arquivos `page.jsx` e `acompanhamento-client.jsx`), incluindo qualquer link interno existente.
- **Remoção de código órfão**: dependência `recharts` (`package.json`) e o componente `GraficoGastosPorCategoria` (hoje em `acompanhamento-client.jsx`) — sem uso após a remoção do requisito de gráfico do spec-01.
- **Reescrita do fluxo de `/contas`**: `contas-client.jsx` (Tasks 9–10) precisa passar do formulário único com campos condicionais para o wizard de 2 etapas + listagem agrupada por tipo (seção 8.2.3).
- **Criação do `layout.jsx`** do grupo `(protegido)` — hoje inexistente — para hospedar a navegação persistente (seção 8.1).
- **Nenhuma rota nova** é necessária para a ação "+ Nova transação": ela deve apenas linkar/navegar para `/lancamento`, já implementada.

Esses cinco pontos devem virar tasks próprias no spec-03 antes ou durante o marco de deploy (Task 19), já que alteram rotas e removem código em produção.

## 9. Autenticação

- NextAuth Credentials Provider: valida email/senha (bcrypt) contra a tabela `Usuario`.
- Sessão JWT (mais simples que sessão em banco para este porte de app).
- Middleware protege todas as rotas exceto `/login` e `/cadastro`.
- **Sem filtro de dados por usuário** nas queries (exceto para saber "quem lançou") — todos os usuários autenticados veem o mesmo conjunto de dados, conforme decidido nos Requisitos.

## 10. Pendências resolvidas nesta fase

| Pendência (dos Requisitos) | Resolução |
|---|---|
| Algoritmo de mapeamento compra → fatura | Seção 4 acima |
| Representação de mês/ano de referência | Dois campos `Int` |
| Padrão de polimorfismo de Conta | Single table com campos nullable |
| Data efetiva das parcelas 2+ (abertura da fatura seguinte) | Fechamento real (com clamping de dia) + 1, não uma aproximação — seção 5 |
| Editar parcela propaga para as restantes? | Sim, por padrão só a parcela; opção de propagar para as restantes (simétrico à exclusão) |
| Arquitetura de navegação principal (áreas, menu lateral, barra inferior, ação global) | Seção 8.1 — shell em `layout.jsx`; ação "+ Nova transação" linka direto para `/lancamento`, sem etapas de pré-seleção |
| Fluxo de criação de Conta e organização da tela `/contas` | Seção 8.2.3 — wizard de 2 etapas (tipo → formulário específico) + listagem agrupada por tipo |
| Algoritmo de geração de ocorrências recorrentes | Seção 5.2 — `gerarOcorrenciasRecorrencia`, mais simples que parcelamento (data varia por ocorrência, sem cadeia de fatura) |

## 11. Pendências que continuam em aberto

- Se `Conta de investimento` ganhará atributos próprios em fases futuras.
- Formato do CSV de fatura (fase futura).
- Categorização automática (fase futura).
- Formatação de data `DD MMM` da Visão geral (§8.3.10, ex.: "05 AGO"): removida do escopo da Task 26 a pedido do usuário; a Visão geral continua usando `formatarDataCurta` (`DD/MM/AAAA`). Revisitar se/quando decidido.

## 12. Arquitetura de UX/UI — Transações

Resolve a seção 3.3 dos Requisitos. Em caso de conflito com a seção 7 ou qualquer descrição anterior da tela `/transacoes`, as definições desta seção prevalecem.

### 12.1 Tabela enxuta

5 colunas visíveis: Data efetiva, Descrição, Categoria, Conta, Valor. A coluna de data usa `dataEfetiva` (não `dataCompra`) e a tabela é ordenada por ela — é o campo que já determina `mesReferencia`/`anoReferencia` em toda a aplicação (cálculo de fatura, consolidação da Visão geral, filtro de Mês/Ano da seção 12.3); numa compra parcelada, `dataCompra` é idêntica em todas as parcelas, então não serve para distinguir quando cada uma ocorre. As demais informações hoje em colunas (Tipo, Data do lançamento, Mês de referência, Parcela, Recorrência, É investimento, Conta de investimento) migram para o modal de detalhe (seção 12.2). O rótulo "Data do lançamento" (não "Data da compra") é usado no modal por ser neutro para entrada, saída e investimento — o campo continua sendo `dataCompra` no schema.

**Indicadores visuais compactos** (sem coluna própria), junto à Descrição ou ao Valor:
- **Tipo**: sinal (+/-) prefixado ao Valor; Entrada em `text-emerald-600` (mesmo tom já usado no bloco Entradas da Visão geral), Saída na cor padrão do texto.
- **Parcela**: badge "X de Y" (mesmo estilo de tag usado para "Resgate de investimento" na Visão geral — `rounded-full bg-muted px-2 py-0.5 text-xs`).
- **Recorrência**: badge "X de Y ↻", mesmo estilo.
- **Investimento**: badge "Aporte" (saída) ou "Resgate" (entrada).

Uma linha pode acumular mais de um badge (ex.: saída recorrente marcada como aporte tem badge de Recorrência **e** de Investimento) — badges quebram linha se não couberem lado a lado.

### 12.2 Modal de detalhe (view + edição + exclusão unificadas)

Clicar em qualquer ponto da linha (não um botão/ícone específico) abre um único `Dialog` com:
- Todos os campos do registro, nos mesmos moldes do formulário de edição já existente (`EditarTransacaoConteudo`) — editáveis ou travados seguindo a mesma regra já definida para parcela/recorrência.
- Botão "Salvar" (reaproveita `editarTransacao`).
- Botão destrutivo "Apagar", que troca o conteúdo do **mesmo modal** para a confirmação de exclusão já existente (incluindo a opção de propagar para parcelas/ocorrências restantes) — sem sobrepor um segundo overlay.

Substitui os dois componentes atuais `EditarTransacaoDialog` e `ApagarTransacaoDialog` por um único `DetalheTransacaoDialog`, com estado interno `modo: "detalhe" | "confirmarExclusao"`.

### 12.3 Filtros

Substitui o filtro por coluna (um `Input` por cabeçalho) por uma barra de filtros acima da tabela: busca livre por **Descrição**; filtro por **Conta** (`Select`, opção "Todas"); filtro por **Categoria** (`Select`, opção "Todas"); filtro por **Mês/Ano de referência** (dois `Select`, opção "Todos"). Reaproveita o motor de filtragem já existente do `@tanstack/react-table` — colunas que saem da tabela como visíveis (ex.: mês/ano de referência) continuam existindo como colunas ocultas (`columnVisibility`) só para fins de filtro.

### 12.4 Ações removidas da tabela

A coluna "Ações" deixa de existir — a linha inteira é clicável e abre o modal de detalhe (seção 12.2), eliminando o vazamento horizontal da tabela.
