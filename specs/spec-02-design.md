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
| Gráficos | **Recharts** | Reintroduzida na Task 72, escopada só ao gráfico de Disponível da Projeção (§14.2) — ver nota abaixo. |
| Hospedagem | Vercel (hobby) | Conforme requisito. |
| Fuso do servidor | **`America/Sao_Paulo`, fixado em código** | Task 74 — ver nota abaixo. |

### Banco de dados: por que Postgres, e não SQLite local

Na fase de Requisitos, a sugestão inicial foi "SQLite via Prisma/Drizzle". Isso **não funciona em produção no Vercel**: funções serverless rodam em ambiente efêmero, sem sistema de arquivos persistente entre execuções — um arquivo `.db` local perderia todas as escritas a cada novo cold start ou instância concorrente.

**Escolha:** **Vercel Postgres** (roda sobre Neon). Motivos:
- Integração nativa com Vercel: banco criado direto pelo dashboard, variáveis de ambiente auto-configuradas.
- Usa driver HTTP-friendly para serverless — não sofre do problema clássico de esgotamento de conexões que Postgres "tradicional" teria nesse ambiente.
- É a combinação Next.js + Prisma + Postgres, a mais documentada do ecossistema — menos chance de tropeçar em peculiaridades pouco documentadas durante a implementação, alinhado com o pedido de manter a implementação simples/leve em tokens.
- Tipos mais robustos para valores monetários (`Decimal` nativo) e melhor suporte a agregações (usadas nos blocos da Visão mensal).

### Testes: por que Vitest, e onde focar no MVP

**Escolha:** Vitest em vez de Jest — configuração praticamente zero em projeto JS/ESM (Jest exige mais ajuste para rodar bem com o App Router do Next.js), roda rápido, e a API é quase idêntica à do Jest, então não há curva de aprendizado extra.

**Escopo de testes no MVP:** o maior risco de bug silencioso deste app está nas **funções puras de cálculo de data** (seções 4 e 5) — `calcularFatura` e `gerarParcelas` — porque erram fácil e silenciosamente (rollover de mês/ano, dia de fechamento maior que o mês, etc.), e um erro ali distorce dado financeiro sem quebrar a aplicação visivelmente. São também as mais fáceis de testar, por serem funções puras sem I/O.

Sugestão de cobertura prioritária (a virar tarefas concretas na fase de Tasks):
- `calcularFatura`: casos das tabelas de exemplo das seções 4 e 5 (vencimento antes/depois do fechamento, rollover de ano, fechamento em dia inexistente no mês).
- `gerarParcelas`: número correto de parcelas geradas, progressão de 1 mês por parcela, e o caso de borda de fechamento dia 31 caindo em fevereiro.
- Testes de componente/E2E (ex: Playwright) ficam **fora do MVP** — dado o porte do projeto (uso familiar, poucos usuários), o retorno não compensa o esforço nesta fase. Pode ser revisitado depois.

### Gráficos: removidos do escopo, depois reintroduzidos de forma escopada

A Task 17 implementou um gráfico de gastos por categoria com **Recharts** (`GraficoGastosPorCategoria`, em `acompanhamento-client.jsx`). O spec-01 revisado (seção 3, item 7) removeu o requisito de gráficos/análises visuais da **Visão mensal** — o foco passou a ser acompanhamento operacional e consulta das movimentações consolidadas. Consequência técnica: a dependência `recharts` e o componente `GraficoGastosPorCategoria` ficaram órfãos e foram removidos na Task 21.

Essa remoção **não se estendeu à Projeção** — a Task 62 (M16) abriu uma exceção limitada e deliberada com um gráfico de barras do Disponível em `div` + CSS puro, justamente pra não reintroduzir a dependência por algo simples. A Task 72 reverte essa escolha específica: o gráfico da Projeção evolui pra Recharts (rótulos, eixo, tooltip — ver §14.2), e a dependência volta ao `package.json`. **Ainda não há gráficos na Visão mensal** — o requisito removido no spec-01 item 7 continua valendo lá; a reintrodução é só pro gráfico já existente na Projeção.

### Fuso do servidor: por que fixado em código, não por variável de ambiente

**Bug encontrado em produção (Task 74):** `lib/actions/transacoes.js` converte a data do formulário (`"YYYY-MM-DD"`) com `new Date(ano, mes-1, dia)` — construção que resolve no fuso do **processo**, não numa zona fixa. Em dev local isso nunca deu problema porque servidor e "navegador" (a própria máquina) estão no mesmo fuso. Em produção, a função serverless da Vercel roda em **UTC**, enquanto o navegador do usuário está no Brasil (UTC−3): uma data digitada como `15/01/2026` é corretamente gravada como `2026-01-15T00:00:00.000Z` (meia-noite UTC), mas ao ser lida de volta num Client Component (`transacoes-client.jsx`, `lib/datas.js`) — que roda no navegador — os getters locais (`getDate()`, `toLocaleDateString()` sem fuso explícito) resolvem no fuso do navegador e devolvem o dia **anterior**. Afeta `dataCompra` e `dataEfetiva` igualmente (`dataEfetiva` é sempre a mesma instância de `dataCompra`, nunca derivada separadamente — Design §13, `calcularReferencia`). Mais grave: o modal de edição pré-preenche a data já deslocada — salvar sem tocar nela reenvia a data errada pro servidor, que grava de verdade um dia a menos, **compondo o erro a cada edição**.

**Correção:** fixar o fuso do processo do servidor pra `America/Sao_Paulo`, eliminando a divergência com o navegador (a app é de uso familiar, sempre Brasil — não há caso de uso multi-fuso a suportar).

**Por que em código (`lib/db.js`) e não como variável de ambiente:** a Vercel **bloqueia `TZ` como nome de variável de ambiente configurável pelo usuário** — é reservada, usada internamente pela plataforma. A alternativa validada: `process.env.TZ = "America/Sao_Paulo"` como efeito colateral no topo de `lib/db.js`, módulo importado por toda Server Action e todo Server Component que lê ou grava data — roda cedo o bastante em cada cold start pra valer antes de qualquer `new Date()` do app. Validado que o Node.js não trava o fuso na primeira leitura: reatribuir `process.env.TZ` em runtime, mesmo depois de outras datas já terem sido calculadas no mesmo processo, funciona corretamente para todo `new Date()`/getter local subsequente.

**Alternativa descartada:** reescrever toda construção/leitura de data do app pra usar métodos UTC (`Date.UTC`, `getUTCDate`, etc.) em vez de métodos locais — resolveria de forma robusta contra qualquer fuso de servidor, mas é uma refatoração grande (`lib/fatura.js`, `lib/parcelamento.js`, `lib/recorrencia.js`, todas as telas com campo de data, todos os testes), desproporcional ao problema de uma app de uso familiar sempre-Brasil.

### Resíduo da Task 74: agrupamento por dia ainda podia herdar o horário errado de um lançamento antigo (Task 81)

**Bug encontrado em produção (Task 81), reportado pelo usuário:** a Task 74 corrigiu a construção/exibição de data **daqui pra frente**, mas não corrigiu retroativamente lançamentos já gravados antes dela — esses continuam com `dataCompra`/`dataEfetiva` em meia-noite UTC **literal** (`T00:00:00.000Z`) em vez de meia-noite São Paulo (`T03:00:00.000Z`). Isso por si só é um resíduo aceito (não há migração de dados prevista pro MVP), mas `agruparPorDia` (`lib/consolidacao.js`, usada pelos três blocos — Entradas, Débito, Crédito) tinha uma fragilidade que fazia esse resíduo **vazar para lançamentos novos e corretos**: a chave do agrupamento (`dataCompra.toISOString().slice(0, 10)`) é estável (`T00:00:00.000Z` e `T03:00:00.000Z` do mesmo dia caem na mesma chave UTC), mas o **`dia` exibido no cabeçalho do grupo** reaproveitava a data bruta da *primeira* transação (por `dataCompra` crescente) que criava aquele grupo — e uma transação antiga em `T00:00:00.000Z` sempre ordena antes de uma nova em `T03:00:00.000Z` do mesmo dia. Exibida via `toLocaleDateString("pt-BR")` no fuso de São Paulo, meia-noite UTC literal volta um dia (`T00:00:00.000Z` − 3h = 21h do dia anterior) — arrastando o cabeçalho do grupo **inteiro** pra um dia antes, mesmo para as transações do grupo gravadas corretamente. Reproduzido consultando os dados reais de produção (só leitura, credenciais rotacionadas logo depois): um lançamento novo e correto ("NuViagens - NuPay", `dataCompra` em `T03:00:00.000Z`) aparecia sob o cabeçalho de dia de um lançamento antigo do mesmo dia ("Alimentação", em `T00:00:00.000Z`) — `/transacoes` mostrava a data efetiva certa (lê o valor de cada transação direto, sem agrupar), só a Visão mensal errava.

**Correção:** `agruparPorDia` deriva o `dia` exibido **da própria chave** de agrupamento (que já é estável) — reconstruindo uma data local a partir do `"YYYY-MM-DD"` da chave — em vez de reaproveitar a data bruta, potencialmente ruidosa, de uma transação qualquer do grupo. Elimina a dependência implícita de que toda `dataCompra` esteja exatamente em meia-noite local, tornando a exibição correta mesmo quando dados antigos (pré-Task-74) e novos convivem no mesmo grupo.

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
│   ├── visao-mensal/page.jsx        ← 4. Visão mensal (resumo + 4 blocos) — seção 8.3
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
└── visao-mensal/
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

enum MeioPagamento {
  CREDITO
  DEBITO
}

model Usuario {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  senhaHash    String
  ehAdmin      Boolean  @default(false) // gestão de usuários — seção 17.2
  criadoEm     DateTime @default(now())

  contas         Conta[]
  transacoes     Transacao[]
  valoresPadrao  ValorPadrao[]
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
  // numeroOcorrencia/totalOcorrencias/recorrenciaId (recorrência) removidas
  // na Task 87 — sem substituto até uma futura gestão de assinaturas.

  dataCompra        DateTime
  dataEfetiva       DateTime
  mesReferencia     Int           // 1-12
  anoReferencia     Int

  // Parcelamento (null quando não é compra parcelada)
  numeroParcela     Int?
  totalParcelas     Int?
  parcelamentoId    String?

  // Investimento
  ehInvestimento    Boolean       @default(false)
  contaInvestimentoId String?
  contaInvestimento  Conta?       @relation("ContaInvestimento", fields: [contaInvestimentoId], references: [id])

  criadoEm          DateTime      @default(now())

  // Presente só quando a transação nasceu de uma consolidação de despesa
  // padrão no débito (§13.6) — é o que a tira do agrupamento por dia.
  consolidacaoDespesa ConsolidacaoDespesaPadrao?

  @@index([usuarioId])
  @@index([contaId])
  @@index([mesReferencia, anoReferencia])
  @@index([parcelamentoId])
}

model ValorPadrao {
  id         String         @id @default(cuid())
  usuarioId  String
  usuario    Usuario        @relation(fields: [usuarioId], references: [id])

  descricao  String
  valor      Decimal        // sempre positivo; sinal é dado pelo `tipo`
  tipo       TipoTransacao  // ENTRADA (receita padrão) | SAIDA (despesa padrão)
  meio       MeioPagamento? // obrigatório quando tipo = SAIDA; null quando ENTRADA
  categoria  Categoria?     // só para tipo = SAIDA; pré-preenche a consolidação (§13.6)

  criadoEm   DateTime       @default(now())

  consolidacoesReceita ConsolidacaoReceitaPadrao[]
  consolidacoesDespesa ConsolidacaoDespesaPadrao[]

  @@index([usuarioId])
}

// Ajuste pontual de um item de RECEITA padrão pra um mês específico
// (Requisitos 3.8, Design §13.5) — substitui o valor genérico do item
// SÓ naquele mês, sem tocar em ValorPadrao nem nos demais meses.
// Renomeado de ConsolidacaoValorPadrao na Task 76, quando surgiu a
// consolidação de despesa e o nome genérico virou ambíguo.
model ConsolidacaoReceitaPadrao {
  id            String      @id @default(cuid())
  valorPadraoId String
  valorPadrao   ValorPadrao @relation(fields: [valorPadraoId], references: [id])

  mesReferencia Int         // 1-12
  anoReferencia Int
  valor         Decimal     // substitui ValorPadrao.valor só nesse mês

  criadoEm      DateTime    @default(now())

  @@unique([valorPadraoId, mesReferencia, anoReferencia])
  @@index([mesReferencia, anoReferencia])
}

// Marca que um item de DESPESA padrão no débito foi resolvido num mês
// (Requisitos 3.9, Design §13.6). Diferente da consolidação de receita,
// esta GERA um lançamento real — daí o vínculo com Transacao.
model ConsolidacaoDespesaPadrao {
  id            String      @id @default(cuid())
  valorPadraoId String
  valorPadrao   ValorPadrao @relation(fields: [valorPadraoId], references: [id])

  mesReferencia Int         // 1-12
  anoReferencia Int

  // null = consolidado por R$ 0 ("não precisei pagar neste mês"), sem
  // lançamento. Quando presente, o valor vem da própria transação — não há
  // coluna `valor` aqui de propósito, pra não existir duas fontes de verdade
  // (a transação é editável por /transacoes).
  transacaoId   String?     @unique
  transacao     Transacao?  @relation(fields: [transacaoId], references: [id], onDelete: Cascade)

  criadoEm      DateTime    @default(now())

  @@unique([valorPadraoId, mesReferencia, anoReferencia])
  @@index([mesReferencia, anoReferencia])
}
```

**Notas sobre `ValorPadrao`:**
- **Não tem data nem conta** — é uma declaração atemporal, não um lançamento. O item em si nunca vira `Transacao` e nunca aparece em `/transacoes`.
- **`categoria` (adicionada na Task 77) é a única exceção** ao ponto acima: existe só para pré-preencher o formulário de consolidação de despesa (§13.6), que *gera* um lançamento. Nula para `ENTRADA` (a consolidação de receita não cria transação, §13.5) e opcional para `SAIDA`. Reabre parcialmente o item "vincular valores padrão a uma conta específica ou a uma categoria", listado como fora do escopo no spec-01 — parcialmente porque **só categoria** entrou; a conta continua fora, escolhida na hora de consolidar (o mesmo item padrão pode ser pago de contas diferentes em meses diferentes).
- **`meio` só se aplica a despesas.** Receitas são sempre creditadas em Conta corrente conceitualmente, e a Visão mensal não separa receitas por meio — por isso o campo é nulo para `ENTRADA`. A obrigatoriedade quando `tipo = SAIDA` é validada na Server Action, não no banco (o Prisma não expressa `CHECK` condicional de forma portátil).
- **`usuarioId` é apenas autoria**, como em `Conta` e `Transacao`: os valores padrão são compartilhados entre os membros da família, coerente com o modelo de dados único da spec-01 §2.

**Notas sobre `ConsolidacaoReceitaPadrao`:**
- **Não é uma `Transacao`.** Cogitado e descartado — reaproveitar `Transacao` obrigaria preencher `contaId`/`categoria`/`dataCompra`/`dataEfetiva`, nenhum dos quais tem correspondência conceitual real aqui (a mesma razão pela qual `ValorPadrao` já não é uma `Transacao`), e ainda exigiria filtrar essas linhas fora de toda consulta que hoje soma/lista `Transacao` (a tela `/transacoes`, `entradaReal` em `comporMes`) pra não aparecerem misturadas aos lançamentos comuns.
- **Vínculo por `valorPadraoId` (FK), não por texto/descrição** — sobrevive a uma renomeação do item em Valores padrão; não há ambiguidade entre itens com a mesma descrição.
- **Sem `usuarioId` próprio** — herda a autoria de `ValorPadrao` via `valorPadraoId`, mesmo raciocínio de dado compartilhado entre a família.
- **Escopo restrito a `tipo = ENTRADA`** validado na Server Action (não há `CHECK` no schema, mesmo padrão de `ValorPadrao.meio`) — despesa padrão tem mecanismo próprio, com semântica diferente (`ConsolidacaoDespesaPadrao`, abaixo).
- **`@@unique([valorPadraoId, mesReferencia, anoReferencia])`** garante no máximo uma consolidação por item por mês — criar uma nova consolidação pro mesmo item/mês é um `upsert`, não uma segunda linha.

**Notas sobre `ConsolidacaoDespesaPadrao`:**
- **Tabela separada da de receita, não uma coluna a mais nela.** As duas compartilham a chave (`valorPadraoId` + mês/ano) e a ideia de "este item vale outra coisa neste mês", mas divergem no essencial: a de receita **guarda um valor**; a de despesa **guarda um vínculo com um lançamento** e tira o valor de lá. Uma tabela única precisaria de `valor` e `transacaoId` ambos nuláveis, com o significado de cada linha dependendo implicitamente de `ValorPadrao.tipo` — exatamente a ambiguidade que motivou não pendurar a consolidação de receita em `Transacao` (nota acima).
- **Sem coluna `valor`, de propósito.** Quando há transação, o valor é o dela — que continua editável por `/transacoes`. Duplicar aqui criaria duas fontes de verdade que divergem silenciosamente na primeira edição feita por fora.
- **`transacaoId` nulo = consolidado por R$ 0** ("não precisei pagar neste mês", Requisitos 3.9). Não se cria transação de valor zero: além de poluir `/transacoes`, quebraria a convenção de `Transacao.valor` sempre positivo.
- **`onDelete: Cascade` na transação** resolve sozinho o requisito de "apagar o lançamento faz o item voltar a pendente", inclusive quando a exclusão acontece por `/transacoes` — sem código de sincronização espalhado.
- **A relação inversa é `Transacao.consolidacaoDespesa`** (opcional, um-para-um), e é ela que `buscarSaidasDebito` usa pra tirar esses lançamentos do agrupamento por dia (§13.6).
- **Apagar o item de `ValorPadrao` apaga as consolidações, mas não as transações** — o dinheiro foi gasto de fato (Requisitos 3.9). Como a FK `valorPadraoId` é `RESTRICT`, `apagarValorPadrao` faz `deleteMany` das consolidações antes, dentro da mesma `$transaction` já usada hoje para a consolidação de receita. Efeito colateral correto e esperado: os lançamentos órfãos voltam a aparecer no agrupamento por dia.

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

## 5. Algoritmos de parcelamento ~~e recorrência~~ (recorrência removida — Task 87)

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

### 5.2 ~~Recorrência~~ (removida — Task 87)

Esta seção descrevia `gerarOcorrenciasRecorrencia` (`lib/recorrencia.js`, arquivo removido por completo) e a validação de `criarTransacaoRecorrente` (também removida). O algoritmo em si — gerar N ocorrências mensais a partir de uma data base, com clamp de dia via `ultimoDiaDoMes` (seção 5.1, que continua existindo pro parcelamento) — não é mais necessário: a funcionalidade de transação recorrente saiu da aplicação (Requisitos §3, item 11, revisado). O texto original é preservado no histórico do repositório.

## 6. Regras de consolidação (Visão mensal)

Tradução direta da seção 3.1 dos Requisitos em queries. A ordem abaixo já reflete a ordem de exibição definida na seção 8.3.3 (Entradas → Investimentos → Saídas no débito → Saídas no crédito):

- **Entradas:** `WHERE tipo = ENTRADA AND conta.tipo = CONTA_CORRENTE AND mesReferencia = X AND anoReferencia = Y` → cada linha checa `ehInvestimento` para exibir a tag "Resgate de investimento". O filtro por `conta.tipo` entra no M27 (Requisitos 3.1 revisado, 3.11): sem ele, um estorno — que é uma `ENTRADA` num cartão — apareceria aqui **e** no bloco de crédito.
- **Investimentos:** `WHERE tipo = SAIDA AND ehInvestimento = true AND mesReferencia = X AND anoReferencia = Y`, agrupado (`GROUP BY`) por `contaInvestimentoId`, somando `valor`.
- **Saídas no débito:** `WHERE tipo = SAIDA AND conta.tipo = CONTA_CORRENTE AND ehInvestimento = false AND mesReferencia = X AND anoReferencia = Y`.
- **Saídas no crédito:** `WHERE conta.tipo = CARTAO_CREDITO AND mesReferencia = X AND anoReferencia = Y`, agrupado por `dataCompra`. O filtro `tipo = SAIDA` **cai** no M27: o bloco passa a trazer os dois tipos, e o sinal de cada linha é resolvido na exibição (`valorComSinal`, §8.3.17) — uma `ENTRADA` aqui é um estorno e entra negativa. Nenhuma outra query muda de forma: um estorno é uma transação comum, com `mesReferencia` calculado pela mesma regra de fatura da seção 4.

Essas quatro queries alimentam os quatro blocos da Visão mensal (seção 8.3); a apresentação (agrupamento por dia, popover de detalhamento, estados vazios etc.) é especificada na seção 8.

## 7. Telas e componentes principais

Todas as rotas abaixo (exceto autenticação) compartilham a navegação persistente definida na seção 8.1, renderizada pelo `layout.jsx` do grupo `(protegido)`.

| Rota | Descrição | Componentes-chave |
|---|---|---|
| `/login`, `/cadastro` | Autenticação | Form + NextAuth |
| `/contas` | CRUD de Contas | Criação por seção — um gatilho "+" por tipo, sem etapa de escolha (seção 8.2.3, revisado Task 75). Edição inline, mesmo mecanismo de Valores padrão. Listagem única, agrupada visualmente por tipo (Contas correntes, Cartões de crédito, Contas de investimento) |
| `/lancamento` | Novo lançamento | Redesenhado nas Tasks 85-87 (§8.2.4) — Tipo (Entrada/Saída/Investimento) e Meio (Crédito/Débito) em toggles de um clique; Conta e Categoria em chips; parcelas integradas ao campo Valor; data com navegação ‹ ›; foco automático pro campo Valor após salvar. **Também é o destino direto da ação global "+ Nova transação"** (seção 8.1) — sem tela intermediária |
| `/visao-mensal` | Visão mensal (renomeada de `/acompanhamento` → `/visao-geral`, ver seção 8.5) | Cabeçalho (título + ação "+ Nova transação"), seletor de mês/ano, resumo de 3 indicadores, 4 blocos em sequência vertical (Entradas, Investimentos, Saídas no débito, Saídas no crédito) com agrupamento diário e detalhamento via Popover/Sheet. Sem gráfico. Detalhamento completo na seção 8.3 |
| `/transacoes` | Tabela | Tabela enxuta (5 colunas) com indicadores visuais compactos, barra de filtros acima (busca + Conta/Categoria/Mês-Ano), linha inteira clicável abrindo modal único de detalhe/edição/exclusão (seção 12) |

## 8. Arquitetura de UX/UI — Navegação e Interação

Esta seção consolida as decisões de UX/UI da navegação principal e da Visão mensal. Em caso de conflito com a seção 7 ou com qualquer descrição anterior de navegação, organização visual ou interação, **as definições desta seção prevalecem**.

### 8.1 Navegação principal

A navegação autenticada tem três áreas: **Visão mensal**, **Transações**, **Contas**. Não existe área principal própria para "Investimentos" no MVP — investimentos são um tipo de movimentação e um bloco dentro da Visão mensal (seção 8.3.14). Uma ação global **"+ Nova transação"** fica acessível a partir de qualquer área e **navega direto para `/lancamento`** (rota já implementada na Task 15), sem etapa intermediária de escolha de tipo de transação.

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

#### 8.2.1 Visão mensal (`/visao-mensal`)
Tela principal de acompanhamento financeiro mensal. Ver detalhamento completo na seção 8.3.

#### 8.2.2 Transações (`/transacoes`)
Tela única de consulta e gestão: listagem, busca/filtros e ações de editar/apagar. Sem subpáginas por tipo de transação no MVP. Sem mudanças em relação à seção 7 já existente.

#### 8.2.3 Contas (`/contas`)
Tela única mostrando todas as contas simultaneamente, agrupadas visualmente por tipo: Contas correntes, Cartões de crédito, Contas de investimento.

**Criação de conta original — wizard de 2 etapas, implementado e depois revisto:** a versão original desta seção especificava um botão único "+ Nova conta" no topo da página, abrindo um `Dialog` em 2 etapas (1. escolher o tipo; 2. formulário específico) — implementado como tal (`NovaContaDialog`). A Task 75 revisa esse fluxo (ver abaixo), a pedido do usuário, visando consistência com a tela de Valores padrão (§15.4).

**Criação por seção, sem etapa de tipo (revisado — Task 75):** o botão único "+ Nova conta" sai de cena. Cada uma das três seções (Contas correntes, Cartões de crédito, Contas de investimento) ganha seu próprio gatilho **"+"** no cabeçalho do card — mesmo padrão do "+" de Valores padrão (§15.4). Clicar nele abre o formulário específico daquele tipo **direto**, sem a etapa de escolha — o tipo já está implícito por qual seção o usuário clicou. `NovaContaDialog` e a etapa `escolherTipo`/`etapa === "tipo"` saem do código; o formulário abre **inline, no topo da lista daquela seção** (mesmo padrão de posição do formulário de Valores padrão), não mais num `Dialog`.

**Edição inline, não mais em Dialog (revisado — Task 75):** editar uma conta usava `EditarContaDialog`/`EditarContaConteudo` — passa a trocar a linha da conta por um formulário inline, mesmo mecanismo de `FormularioInline` já usado em Valores padrão, reaproveitando os campos de `CamposConta` (nome, e para cartão, dia de fechamento/vencimento). A regra de bloqueio de `tipo`/`diaFechamento`/`diaVencimento` quando a conta já tem transações vinculadas (§17.4) continua idêntica — os campos ficam desabilitados dentro do formulário inline, com a mesma explicação de hoje.

**Ícones no lugar de botões de texto (revisado — Task 75):** "Editar" (`Button variant="outline"`) e "Apagar" (`Button variant="destructive"`, vermelho sólido) por linha viram ícones discretos — `Pencil`/`Trash2` (`lucide-react`), `text-muted-foreground` em repouso, sem cor de destaque. No hover: editar vai para `text-foreground`; apagar vai para um tom vermelho suave (não o vermelho sólido do botão antigo). Mesmo espírito do ícone de lápis já validado na consolidação de receita padrão da Visão mensal (§13.5). `window.confirm` antes de apagar continua como está — só o gatilho visual muda.

#### 8.2.4 Lançamento (`/lancamento`) — redesenho de redução de fricção (Tasks 85-87)

Motivação: o uso mais comum não é um lançamento isolado, é uma **sequência** — várias saídas no crédito lançadas em conjunto, olhando a fatura/extrato do cartão. Cada clique/campo evitável pesa multiplicado pela quantidade de lançamentos da sequência. Validado com o usuário via entrevista de requisitos + mock em HTML interativo (várias rodadas, incluindo comparação de mecanismos de alternância e posições de controle) antes de qualquer código.

**Ordem final dos campos** (revisado — Task 85; Categoria muda de posição, hoje vem depois de Valor): Tipo → Meio → Conta (+ Conta de destino, só com Tipo = Investimento) → Categoria → Valor (+ parcelas) → Descrição → Data → "Lançar".

**Tipo — toggle de um clique, três opções (revisado — Tasks 85 e 86):** substitui o `Select` (dropdown) — só 2 ou 3 opções não justificam abrir/fechar uma lista. Duas opções antes da Task 86 (Entrada/Saída), três depois (**+ Investimento**, ver abaixo). Ícones: `ArrowUpCircle`/`ArrowDownCircle` (mesmos do cabeçalho dos blocos Saídas/Entradas na Visão mensal), `PiggyBank` pro Investimento (mesmo do bloco Investimentos). Estado selecionado em alto contraste — fundo `bg-primary`/texto `text-primary-foreground` (mesmo tratamento dos chips de Categoria/Conta, abaixo), não a variação sutil `bg-card` sobre `bg-muted` cogitada e descartada por baixo contraste.

**Comportamento em telas estreitas (Task 89).** Os botões precisam de `min-w-0`: como itens flex, o default `min-width: auto` os impede de encolher abaixo do próprio conteúdo, e com três rótulos o grupo transbordava a coluna à direita — já a partir de 390px de viewport, não só em telas pequenas. O rótulo fica num `<span>` truncável para degradar com reticências em vez de vazar. **Os ícones aparecem só a partir de `sm:` — e apenas neste toggle**, via a prop `ocultarIconeNoMobile`: medido que é o ícone, não o tamanho da fonte, que impede "Investimento" de caber em largura de celular — com ele o rótulo trunca em 320/360/375/390px mesmo a 11px; sem ele cabe inteiro a 12px a partir de 360px. O toggle de **Meio**, que usa o mesmo componente, **mantém os ícones em toda largura**: com dois rótulos curtos (Crédito/Débito) há espaço de sobra, verificado sem truncamento inclusive a 320px. A supressão é opt-in justamente para não penalizar quem não tem o problema. A 320px (iPhone SE de 1ª geração) o rótulo ainda trunca, com o layout íntegro — limite aceito, já que evitá-lo exigiria encurtar o texto do rótulo.

**Meio — campo novo, mesmo padrão de toggle (Task 85):** Crédito/Débito, ícones `CreditCard`/`Wallet` (mesmos já usados em `TIPO_CONTA_ICONES`, `lib/contas.js`). Filtra os chips de Conta abaixo. A opção Crédito **some** (não fica só desabilitada) quando:
- ~~Tipo = Entrada — só existe entrada no débito.~~ **Revertido no M27:** entrada no crédito passa a ser um caso legítimo (estorno, Requisitos 3.11), e o toggle volta a oferecer as duas opções com Tipo = Entrada. Escolher Crédito filtra os chips de Conta pros cartões, como em qualquer outro Tipo.
- Tipo = Investimento (Task 86) — aporte sempre parte da conta corrente. Aqui o Meio continua sendo forçado pra Débito ao trocar de Tipo.

**Troca de Tipo no M27.** `selecionarTipo` deixa de embutir a regra "Entrada ⇒ Débito" — só Investimento força o Meio. Entrada preserva o Meio corrente, e a conta pré-selecionada segue a mesma lógica que já existe (mantém a conta atual se ela ainda pertence ao Meio, senão cai no primeiro chip visível). Efeito colateral desejado: numa sequência de lançamentos no cartão, alternar Saída → Entrada pra registrar um estorno não faz o formulário pular pro débito e perder o cartão selecionado.

**Sem mudança em Server Action (M27).** `criarTransacao`/`validarTransacao` já aceitam `tipo: ENTRADA` com conta de cartão, e `calcularReferencia` já roteia qualquer transação de cartão por `calcularFatura` (§4) — o estorno cai na fatura pela própria data, como uma compra. As travas existentes seguem valendo sem ajuste: `ehInvestimento` continua exigindo conta corrente (um estorno nunca vira aporte/resgate) e `criarTransacaoParcelada` continua exclusiva de `SAIDA` em cartão. A task de UI é de apresentação; o QA é que precisa **confirmar no banco** que a linha nasce com `tipo: ENTRADA`, `contaId` do cartão e o `mesReferencia` da fatura correta.

**Conta — chips em vez de `Select` (Task 85):** filtrados pelo Meio selecionado; trocar o Meio já pré-seleciona o primeiro chip visível, sem deixar o campo vazio. Rótulo do campo vira **"Conta de origem"** quando Tipo = Investimento (Task 86) — em qualquer outro Tipo, continua "Conta".

**Investimento — Tipo próprio, não mais checkbox (revisado — Task 86):** hoje é uma marcação secundária ("É investimento") dentro de um bloco condicional sob Saída + Débito, fácil de passar despercebida. Passa a ser a terceira opção do toggle de Tipo. Ao selecioná-la:
- Meio força Débito (acima).
- Nasce um campo novo, **"Conta de destino"**, logo abaixo de Conta — mesmos chips que hoje ficam sob o checkbox "É investimento", só que sempre visíveis nesse contexto, não atrás de mais uma marcação.
- **Sem mudança de schema** (decisão explícita do usuário, opção mais simples entre as duas cogitadas): `Transacao.tipo` continua `ENTRADA | SAIDA`; escolher Tipo = Investimento no formulário grava exatamente o que já é gravado hoje pro aporte — `tipo: SAIDA, ehInvestimento: true, contaId` (conta de origem), `contaInvestimentoId` (conta de destino). A Task 86 é inteiramente de apresentação — nenhuma Server Action muda de assinatura.
- **Resgate não ganha nada dedicado.** Na prática, o usuário nunca marcou uma entrada como resgate (`ehInvestimento` numa `ENTRADA`) — resgate já era só lançado como uma Entrada comum. O campo `contaInvestimentoId`/a possibilidade de uma `ENTRADA` ter `ehInvestimento = true` continuam existindo no schema (não há necessidade de removê-los — outra transação já os usa, do lado do aporte) mas perdem toda superfície de uso a partir desta task; a tag "Resgate de investimento" (Visão mensal, bloco Entradas) só volta a aparecer pra lançamentos antigos que já tinham essa marcação.

**Categoria — chips em vez de `Select`, e passa a persistir (Task 85):** mesmo padrão de chips da Conta. Diferente de Conta (que não persistia até a Task 80, e passa a persistir só com ela), Categoria **nunca** persistia — a partir desta task, junta-se a Tipo/Conta/Data no reset seletivo pós-envio (revisão do comportamento da Task 80): mantém o valor do lançamento anterior, porque lançamentos seguidos de uma mesma sequência tendem a repetir categoria (ex.: vários itens de Mercado na mesma sessão).

**Valor + Parcelas — integrados, sem checkbox "Parcelado" (Task 85):** hoje "Parcelado" é um checkbox que revela dois campos à parte ("Nº de parcelas", "Valor da parcela"), duplicando o que seria só o campo Valor. Passa a ser um único campo Valor, sempre visível, com um **stepper de parcelas** (`−`/`+` flanqueando um número, mesmo padrão visual da navegação de dia abaixo) **embutido dentro do próprio campo** (canto direito) — décima entre quatro posições comparadas com o usuário via mock (cabeçalho acima do campo, mesma linha do campo, abaixo do campo, embutido — “embutido” venceu por ser o mais compacto, um elemento a menos na tela).
- Só aparece quando Meio = Crédito (parcelamento continua exclusivo de cartão de crédito, Requisitos §3.2) **e Tipo ≠ Entrada** (M27) — não existe estorno parcelado (Requisitos 3.11). Sem essa segunda condição, liberar o Meio Crédito pra Entrada faria o stepper reaparecer num contexto em que ele não tem significado.
- Começa em **1** — o mínimo, e o caso comum (compra não parcelada). A partir de **2**, o rótulo do campo muda de "Valor" pra **"Valor da parcela"**, e uma legenda nasce abaixo do campo com o total calculado em tempo real (`Nx de R$ X = R$ Y`, recalculado a cada dígito) — sem exigir conta de cabeça pra conferir o total da compra.
- Parcelas ≥ 2 força Tipo = Saída (parcelamento não existe pra entrada nem investimento) e **trava o toggle de Tipo** (fica esmaecido, sem clique) enquanto ativo — evita uma combinação inválida por trás do campo.
- Nenhuma mudança em `criarTransacaoParcelada` nem no algoritmo de geração de parcelas (§5.1) — só a decisão "isso é parcelado" migra de um checkbox explícito pra `parcelas > 1`.

**Data — navegação rápida (Task 85, revisado):** ganha botões `‹`/`›` (dia anterior/seguinte), mesmo padrão visual (não o mesmo componente) do seletor de período da Visão mensal (§8.3.1). Resolve a fricção de trocar de dia usando o seletor nativo do navegador várias vezes numa mesma sequência de lançamentos que avança dia a dia.

Os botões ficam **acoplados dentro das pontas do próprio campo** (não flanqueando-o como elementos soltos, que era a forma original): um único container ocupa a largura total da coluna — igual aos demais campos — carregando fundo, borda e cantos arredondados, com os dois botões nas extremidades separados por divisores verticais.

O `<input type="date">` fica no meio com **largura intrínseca** (do próprio conteúdo), centralizado por `margin: auto`. Essa é a parte não óbvia: o widget nativo **ignora `text-align`** — renderiza o valor sempre colado à esquerda —, então centralizar o texto exige centralizar o próprio campo, já dimensionado exatamente pelo conteúdo. Tentativas anteriores (`text-align: center` no input de largura total) deixavam a data visivelmente à esquerda.

Clicar em qualquer ponto do campo abre o calendário via **`showPicker()`** (método padronizado do WHATWG HTML), envolto em `try/catch` — onde ela é barrada (iframe cross-origin, falta de ativação do usuário) o ícone nativo do campo continua sendo o gatilho. Descartada explicitamente a alternativa de esticar `::-webkit-calendar-picker-indicator` sobre o campo: embora seja um workaround difundido, depende de pseudo-elemento **não-padrão**, sem equivalente no Firefox (que removeu o comportamento de abrir no clique em qualquer ponto) e ainda em processo de padronização no CSSWG como `::picker-icon`.

**Foco automático pós-envio (Task 85):** ao salvar com sucesso, o foco do teclado volta pro campo Valor — hoje fica parado no botão "Lançar", exigindo um clique manual no campo antes de continuar digitando o próximo lançamento. Importante especialmente pra quem lança em sequência via teclado (Enter já submete o formulário a partir de `CampoValor`/Descrição, sem precisar do mouse no botão).

**Reset seletivo pós-envio (revisão consolidada, Tasks 80 + 85):** Tipo, Conta, Categoria e Data mantêm o valor do lançamento anterior; Valor, Descrição e a quantidade de parcelas (volta a 1) resetam.

**Sem menu avançado / accordion:** decisão explícita do usuário — nenhuma opção (Parcelas, Investimento) fica escondida atrás de um controle de expandir/recolher; tudo permanece no fluxo visível do formulário.

**Recorrência (Task 87):** ver Requisitos §3, item 11 (revisado) — a funcionalidade sai por completo, sem substituto imediato. Detalhe técnico (schema, `lib/recorrencia.js`, Server Actions, `/transacoes`) no Resumo de rastreabilidade e nas tasks de spec-03.

### 8.3 Detalhamento da Visão mensal

Estrutura do topo: 1ª linha = título "Visão mensal" + ação "+ Nova transação" (desktop: mesma linha, título à esquerda, ação em destaque). 2ª linha = navegação do período. Abaixo: os três indicadores do resumo mensal.

#### 8.3.1 Navegação do período
Ir para mês anterior/próximo; clicar no período exibido abre um seletor dedicado (ano atual, 12 meses em grade, mês selecionado destacado, navegação entre anos, atualiza a Visão mensal ao selecionar). Desktop: `Popover` do shadcn/ui a partir do período. Mobile: `Sheet` com `side="bottom"` (bottom sheet) — ambos já disponíveis na stack, sem nova dependência.

**Swipe no mobile:** a navegação de mês (`mesAnterior`/`mesSeguinte`, que fazem `router.push("/visao-mensal?mes=X&ano=Y")`) é extraída de `SeletorPeriodo` para um hook compartilhado `useNavegacaoPeriodo(mes, ano)` em `seletor-periodo.jsx`. Esse hook passa a ser reaproveitado tanto pelos botões de seta quanto por um listener de toque (`touchstart`/`touchend`) no container raiz de `VisaoMensalClient`: um arrasto horizontal maior que o deslocamento vertical e acima de 50px dispara `mesSeguinte()` (deslizar para a esquerda) ou `mesAnterior()` (deslizar para a direita). O gesto só é avaliado quando `window.innerWidth < 768` no momento do toque, preservando o desktop inalterado — sem necessidade de nenhuma biblioteca nova de gestos.

**Transição visual do swipe:** ao trocar de mês via swipe, o conteúdo abaixo do seletor de período (cards de resumo + os quatro blocos) é remontado com `key={`${mes}-${ano}`}`, disparando uma animação de entrada via `tailwindcss-animate` — a mesma biblioteca já usada em `Dialog`/`Sheet`, sem nova dependência: `animate-in fade-in slide-in-from-right-8 duration-200` para o próximo mês (swipe à esquerda), ou `slide-in-from-left-8` para o mês anterior (swipe à direita). A direção é guardada num `ref` interno a `VisaoMensalClient`, setado no handler de swipe antes de navegar. Como a troca de `searchParams` não desmonta `VisaoMensalClient` (mesmo a rota tendo `loading.jsx`, só as props são atualizadas), o `ref` sobrevive até o próximo render — sua leitura acontece diretamente durante a renderização, para computar a classe do `key` recém-trocado, e um `useEffect` dependente de `mes`/`ano` só limpa o `ref` depois, por higiene. Sem animação no carregamento inicial da página nem nas trocas de mês pelas setas ou pelo seletor de mês/ano — escopo restrito ao gesto de swipe. **Efeito colateral aceito:** como a remontagem reinicia o estado local de cada componente filho, as seções expandidas (Entradas/Investimentos/Saídas no débito/Saídas no crédito) voltam a ficar colapsadas a cada troca de mês via swipe.

#### 8.3.2 Resumo financeiro do mês
Três indicadores: **Entradas** (soma das entradas do mês, incluindo resgates e **excluindo estornos** — M27, §8.3.17); **Saídas** (soma das Saídas no débito e das Saídas no crédito do mês de referência, esta última já líquida dos estornos); **Disponível** (Entradas − Saídas no débito − Saídas no crédito − Investimentos). O bloco Investimentos entra na conta porque representa dinheiro comprometido (aportado) no mês, ainda que não seja um gasto por categoria — resgates não são subtraídos de novo aqui, pois já estão embutidos em Entradas. Cards apenas informativos no MVP (não são atalhos/links/expansores). No mobile: os três cards empilham em uma única coluna (uma card por linha, largura total) — evita corte de valores grandes ou negativos, já que nenhum card divide a largura com outro. A partir do breakpoint `md`, volta ao grid de 3 colunas lado a lado. Sem rolagem horizontal.

*(Os nomes dos indicadores são: Entradas, Saídas, Disponível — o antigo "Saldo" passa a se chamar "Disponível"; os outros dois nomes não mudam.)*

#### 8.3.3 Organização visual dos quatro blocos
Sequência vertical (inclusive no desktop), nesta ordem: **Entradas → Investimentos → Saídas no débito → Saídas no crédito**. Substitui qualquer organização em grid 2x2 mencionada anteriormente; prioriza espaço de leitura dos dados.

#### 8.3.4 Agrupamento diário e detalhamento por interação
Nos blocos Entradas, Saídas no débito e Saídas no crédito, as transações são agrupadas por dia. Na visualização principal, cada dia mostra apenas data + valor total do dia, em ordem cronológica crescente — as transações individuais não ficam permanentemente visíveis.

Detalhamento por interação:
- **Desktop**: hover sobre o agrupamento abre um `Popover` rico próximo à linha (sem alterar layout), com descrição, categoria, valor de cada transação e total do dia.
- **Mobile**: toque abre uma `Sheet` (bottom sheet) equivalente, preservando a Visão mensal em segundo plano.

Sem informações de conta/cartão no detalhamento diário no MVP. Sem limite arbitrário de itens nem "Ver mais" — conteúdo excedente usa altura máxima + rolagem interna (`overflow-y-auto`) dentro do `Popover`/`Sheet`.

**Tag de parcela no crédito (Task 84):** `DetalheDiario` (`components/visao-mensal/detalhe-diario.jsx`) já tem um ponto de extensão pra isso — o prop `renderTag`, usado hoje só em Entradas pra marcar resgate de investimento (`TagResgate`). O bloco Saídas no crédito passa a receber seu próprio `renderTag`, retornando a mesma tag pill já usada em `/transacoes` (`bg-muted rounded-full`, "X de Y") quando `t.numeroParcela` existe — mesmo componente/estilo, sem inventar um novo. Nenhuma mudança em `DetalheDiario` em si.

#### 8.3.5 Regra visual — Saídas no crédito
Continua filtrado pelo mês de referência da fatura (seção 6); agrupado pelo dia da compra original; uma compra de outro mês pode aparecer no período visualizado quando sua fatura pertence a esse mês de referência. A data original da compra deve ficar visível, para não parecer erro.

#### 8.3.6 Identidade visual dos blocos
Mesma estrutura/padrão de leitura nos quatro blocos, diferenciados por ícone próprio e cor de destaque discreta associada ao tipo — usada só em elementos pontuais (ícones/indicadores), não em fundos totalmente coloridos.

#### 8.3.7 Estrutura visual dos blocos (revisado — Task 82)
Os quatro blocos passam a ser **cards independentes** — borda (`border`) e cantos arredondados (`rounded-lg`), o mesmo `Card` do shadcn/ui já usado nos três indicadores do resumo (§8.3.2) — em vez de seções abertas separadas só por divisores sutis (`divide-y`), como era antes. O espaçamento vertical entre os cards (`gap-6`, mesmo valor já usado no `grid` do resumo) substitui o `divide-y` como elemento de separação — não há mais um "extrato contínuo", cada bloco é visualmente uma unidade própria. Cabeçalho de cada bloco, inalterado: ícone + nome + valor total consolidado na mesma linha (ex.: "▪ ENTRADAS R$ 8.500,00"), clicável para expandir/recolher. No mobile: ícone+título à esquerda, valor total à direita, mesma linha.

Validado com o usuário via mock em HTML interativo antes da task — a alternância "Por dia"/"Por cartão" do §8.3.16 foi decidida no mesmo mock, mas é tarefa separada (Task 83): esta seção (8.3.7) é só o container visual, sem mudança de comportamento.

Dentro de um bloco expandido, os valores padrão daquele meio vêm **antes** dos lançamentos agrupados por dia, separados deles por um divisor: receita padrão no bloco Entradas (§13.5) e despesas padrão no bloco Saídas no débito (§13.6, a partir da Task 79). Saídas no crédito não tem essa lista — a despesa padrão de crédito continua sendo um teto agregado, exibido na linha "Estimado restante" ao final do bloco.

#### 8.3.8 Estado de erro no carregamento
Erro contextual quando a Visão mensal não conseguir carregar/atualizar: informa a falha claramente (sem confundir com "sem movimentações"), disponibiliza "Tentar novamente", mantém a estrutura identificável, e **permanece visível** enquanto os dados não estiverem disponíveis (não é uma notificação temporária isolada).

#### 8.3.9 Estado de carregamento
Skeleton loading (acesso inicial, troca de período, retorno à tela). A estrutura geral fica visível com placeholders neutros para período, indicadores, valores/conteúdo dos blocos e agrupamentos, preservando as dimensões do conteúdo definitivo. Sem spinner central como representação principal; dados do período anterior não devem parecer pertencer ao novo período. Realização sugerida: `<Skeleton>` do shadcn/ui combinado com `loading.jsx`/`Suspense` do App Router na rota `/visao-mensal`.

#### 8.3.10 Formatação de datas (específica da Visão mensal)
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
Sempre 2 casas decimais (ex.: "R$ 8.500,00", "R$ 42,50"), centavos nunca ocultados mesmo quando zero. **Sem mudança necessária em `lib/moeda.js`**: `formatarReais`/`formatarCentavosParaReais` já usam `toLocaleString` com `style: "currency", currency: "BRL"`, que já formata com 2 casas decimais fixas por padrão — basta reaproveitá-las nos componentes da Visão mensal.

#### 8.3.12 Mês sem movimentações / estados vazios dos blocos
Quando o período não tiver nenhuma movimentação em nenhum dos 4 blocos, a Visão mensal mantém sua estrutura padrão (sem estado vazio geral adicional). Cada bloco permanece visível, mostrando R$ 0,00 e uma mensagem contextual (ex.: "Nenhuma entrada neste mês.", "Nenhuma saída adicional no débito neste mês." — "adicional" porque a checklist de despesas padrão (Task 79, §13.6) já ocupa o bloco mesmo sem lançamento algum agrupado por dia —, "Nenhuma saída no crédito neste mês.", "Nenhum investimento neste mês."). Blocos vazios não são ocultados.

#### 8.3.13 Destaque do dia atual
Quando o período visualizado é o mês atual e existe agrupamento na data atual, esse dia recebe destaque visual sutil (indicador pequeno ou ajuste discreto de tipografia) — sem virar card nem fundo dominante. Não exibido para outros períodos.

#### 8.3.14 Bloco de Investimentos
Visualização consolidada por Conta de investimento: total aportado no mês no cabeçalho do bloco; uma linha por Conta de investimento que recebeu aportes no período, com nome da conta e valor total aportado nela no mês (query da seção 6). Aportes individuais não ficam permanentemente visíveis. Resgates não aparecem aqui — continuam no bloco de Entradas.

#### 8.3.15 Tratamento de textos longos no detalhamento
Descrições no detalhamento diário ocupam uma única linha, truncadas com reticências quando excedem o espaço (ex.: "Supermercado Extra Contagem... R$ 420,00"). Categoria e valor mantêm posicionamento fixo. Sem quebra automática em múltiplas linhas (`truncate` do Tailwind resolve isso diretamente).

#### 8.3.16 Alternância "Por dia" / "Por cartão" — Saídas no crédito (Task 83)
Resolve Requisitos 3.1 (bullet "Alternância de visão no bloco Saídas no crédito"). Apoia a **conferência manual** dos lançamentos do app contra o valor da fatura mostrado pelo banco — por isso o foco é o **total por cartão** em destaque, com a listagem de lançamentos como apoio pra achar onde está a diferença quando os totais não batem. Validado com o usuário via mock em HTML interativo (três mecanismos de alternância comparados lado a lado, com dados fictícios) antes desta task.

**Mecanismo de alternância — abas, construídas à mão (sem nova dependência):** duas abas, "Por dia" e "Por cartão", no topo do corpo do bloco (abaixo do cabeçalho, só visível quando o bloco está expandido). Escolhida por preferência visual do usuário entre três opções comparadas no mock — as descartadas foram segmented control (toggle de dois botões) e select/dropdown (exige clique extra só pra ver as opções, desnecessário numa escolha binária sempre visível). O projeto **não tem** o componente `Tabs` do shadcn/ui instalado (nenhum `@radix-ui/react-tabs` no `package.json`) — como os outros controles simples já construídos à mão nesta base (ícones-botão da Task 75, checklist da Task 79), a alternância é dois `<button>` com `aria-selected`/`role="tab"` e uma borda inferior condicional (`border-b-2`) pro ativo, sem puxar uma dependência nova pra uma escolha binária. Troca de aba é só estado local (`useState`) no Client Component — sem navegação, sem re-fetch.

**Visão "Por dia" (padrão, selecionada ao expandir o bloco):** comportamento atual, inalterado — `DetalheDiario` agrupando por dia, Popover no desktop/Sheet no mobile (§8.3.4).

**Visão "Por cartão":** substitui o agrupamento por dia por uma lista de **subgrupos, um por cartão de crédito com lançamento no mês de referência exibido** — cartões sem movimentação no período não geram subgrupo (lista mais enxuta; a conferência é por cartão que teve gasto, não um checklist de "todo cartão cadastrado"). Cada subgrupo:
- **Cabeçalho do subgrupo:** ícone de cartão de crédito (mesmo ícone do cabeçalho do bloco — `CreditCard`, `lucide-react` — porém em `text-muted-foreground`, não na cor de destaque do bloco; o vermelho fica reservado pro ícone do título, evitando repetir o mesmo destaque em cada subgrupo) + nome do cartão (`Conta.nome`), e o **total do cartão naquele mês** em destaque à direita (`font-semibold`, mesmo peso visual do total do bloco).
- **Lançamentos do subgrupo:** uma linha por transação — descrição, data da compra (`DD/MM`, sem ano — mesma economia visual do agrupamento por dia) e valor — em ordem cronológica **crescente** (mesma convenção já usada em `orderBy: dataCompra: "asc"` no agrupamento por dia). Sem sub-agrupamento por dia dentro do subgrupo — é uma lista plana, o ponto é ver todos os lançamentos daquele cartão em sequência, não redescobrir agrupamento por data.
- **Divisor tracejado** (`border-t border-dashed`) entre subgrupos consecutivos — mesmo tracejado já usado em outras separações "internas" de bloco (ex.: despesa padrão vs. agrupamento por dia no débito, §13.6).

**Fonte dos dados:** nenhuma busca nova — a visão "Por cartão" reagrupa, no cliente, os mesmos dados já buscados por `buscarSaidasCredito` (mesmo mês de referência, já ordenados por `dataCompra`). Reagrupar por `transacao.conta.nome`/`conta.id` em vez de por dia é suficiente; `buscarSaidasCredito` já faz `include: { conta: true }`, então o nome do cartão já vem junto.

**Estornos (M27):** entram nesta visão como qualquer outro lançamento do cartão — mesma posição cronológica, sem subgrupo próprio e sem tag —, com o valor negativo em verde e somando com sinal no total do cartão (§8.3.17). É o comportamento que a visão precisa ter pra continuar servindo ao seu propósito: o banco também lança o crédito dentro da fatura do cartão, e um total que ignorasse o estorno nunca bateria com o extrato. Um cartão cujo total fique negativo no mês segue a mesma regra de cor dos demais agregados.

**Linha "Estimado restante" (§16.2):** aparece igual nas duas visões, ao final do bloco, fora da área que alterna — não é reagrupada por cartão (continua sendo o teto agregado de todos os cartões, Requisitos 3.5).

**Tag de parcela (Task 84):** cada linha de lançamento no subgrupo ganha a mesma tag pill de `/transacoes` ("X de Y") ao lado da descrição quando `t.numeroParcela` existe — mesmo tratamento visual do detalhamento por dia (§8.3.4), pra a marcação de parcela não depender de qual visão está ativa.

#### 8.3.17 Estornos no crédito — sinal, cor e agregação (M27)

Resolve Requisitos 3.11 e o bullet "Valores negativos" de 3.1. Validado com o usuário via mock em HTML antes das tasks.

**Um helper puro, uma regra.** O sinal não pode nascer espalhado por cada componente — vira um módulo novo, `lib/estorno.js`, sem dependência de `db` (ao contrário de `lib/consolidacao.js`) justamente pra poder ser importado por Client Components:

```javascript
/** Estorno: entrada lançada num cartão de crédito (Requisitos 3.11). */
export function ehEstorno(transacao) {
  return transacao.tipo === "ENTRADA" && transacao.conta?.tipo === "CARTAO_CREDITO";
}

/**
 * Valor da transação com o sinal que ela tem dentro do bloco em que aparece.
 * Só estorno é negativo: uma entrada em conta corrente (bloco Entradas) e
 * qualquer saída seguem positivas, então a função é segura de usar em
 * qualquer um dos três blocos agrupados por dia.
 */
export function valorComSinal(transacao) {
  return ehEstorno(transacao) ? -Number(transacao.valor) : Number(transacao.valor);
}
```

**Onde o sinal se aplica.** Toda soma que hoje faz `Number(t.valor)` sobre uma lista que pode conter estorno passa a usar `valorComSinal`: `somarGrupo` (total do dia, `visao-mensal-client.jsx`), o total do dia dentro de `ListaTransacoes` (`detalhe-diario.jsx`) e o total por cartão em `ListaPorCartao`. `comporMes` **não** usa o helper — lá a regra é outra (§13.3): o estorno é subtraído do crédito num termo próprio, e o total do bloco vem de `composicaoCredito.total`, não da soma dos grupos por dia.

**Cor.** Um valor negativo é exibido em `text-entrada` (o verde já usado no bloco Entradas), com o sinal vindo do próprio `formatarReais`, que já emite `-R$ 1,00` para números negativos — sem string montada à mão. A regra vale em **todos** os níveis de agregação, sem exceção: linha do estorno, total do dia (linha fechada e dentro do popover/sheet), total do cartão, total no cabeçalho do bloco e valor dos cards de resumo. Um valor ≥ 0 mantém a cor que já tinha hoje.

Ter uma condição só — `valor < 0 → text-entrada` — evita a variante em que o componente precisa saber *por que* ficou negativo. O verde aqui não significa "receita", significa "a favor do usuário", que é o que um agregado negativo dentro de um bloco de saída quer dizer.

**Exceção única: o card Disponível** (descoberta ao implementar a Task 101, não prevista quando a regra foi decidida). Ele não é um agregado de saída — é o resultado do mês, e negativo ali significa **déficit**, contra o usuário. Aplicar o verde diria o oposto do que aconteceu, então ele continua na cor padrão, como já era antes do M27 (onde ele podia ficar negativo por gasto acima da renda, sem estorno algum). A regra vale para os agregados que compõem saída: linha do estorno, total do dia, total do cartão, cabeçalho do bloco e o card **Saídas**.

**Sem tag na Visão mensal.** Nem no popover/sheet, nem na visão por cartão. O valor negativo em verde já é a marcação — decisão do usuário no mock, e coerente com §8.3.4, onde `renderTag` é reservado a informação que o valor não carrega (resgate, parcela). Em `/transacoes` a decisão é a oposta (§12.1), porque lá o valor de um estorno é `+ R$ …` em verde, igual ao de um salário.

**Estado vazio.** As mensagens de §8.3.12 não mudam. Um mês só com estorno tem grupos por dia no bloco de crédito, então nunca cai no estado vazio; e o bloco Entradas exibindo "Nenhuma entrada adicional neste mês." com um estorno no mês é o comportamento correto — ele não é uma entrada.

### 8.4 Mapeamento sugerido de componentes

| Componente | Local sugerido | Responsabilidade |
|---|---|---|
| `NavegacaoPrincipal` | `components/navegacao/NavegacaoPrincipal.jsx` | Menu lateral + barra inferior + ação "+ Nova transação" (seção 8.1) |
| `SeletorPeriodo` | `components/visao-mensal/SeletorPeriodo.jsx` | Navegação de mês/ano + `Popover`/`Sheet` de seleção (8.3.1) |
| `ResumoMensal` | `components/visao-mensal/ResumoMensal.jsx` | Os 3 indicadores (8.3.2) |
| `BlocoConsolidado` | `components/visao-mensal/BlocoConsolidado.jsx` | Estrutura comum de Entradas/Saídas débito/Saídas crédito: cabeçalho + agrupamento diário (8.3.4, 8.3.6, 8.3.7), reaproveitado com props de ícone/cor/dados por tipo |
| `BlocoInvestimentos` | `components/visao-mensal/BlocoInvestimentos.jsx` | Variante agrupada por conta de investimento, não por dia (8.3.14) |
| `DetalheDiario` | `components/visao-mensal/DetalheDiario.jsx` | `Popover` (desktop) / `Sheet` bottom (mobile) de detalhamento (8.3.4) |
| `MenuUsuario` | `components/navegacao/menu-usuario.jsx` | Nome do usuário + ação "Sair" (`DropdownMenu`), usado dentro de `NavegacaoPrincipal` (8.1.3) |

### 8.5 Impacto em código já implementado (não coberto por este documento — gera novas tasks em spec-03)

- **Rename de rota**: `app/(protegido)/acompanhamento/` → `app/(protegido)/visao-geral/` (arquivos `page.jsx` e `acompanhamento-client.jsx`), incluindo qualquer link interno existente. Renomeada novamente para `app/(protegido)/visao-mensal/` em spec-03 Task 68 — linhagem completa: `/acompanhamento` → `/visao-geral` → `/visao-mensal`.
- **Remoção de código órfão**: dependência `recharts` (`package.json`) e o componente `GraficoGastosPorCategoria` (hoje em `acompanhamento-client.jsx`) — sem uso após a remoção do requisito de gráfico do spec-01.
- **Reescrita do fluxo de `/contas`**: `contas-client.jsx` (Tasks 9–10) precisa passar do formulário único com campos condicionais para o wizard de 2 etapas + listagem agrupada por tipo (seção 8.2.3).
- **Criação do `layout.jsx`** do grupo `(protegido)` — hoje inexistente — para hospedar a navegação persistente (seção 8.1).
- **Nenhuma rota nova** é necessária para a ação "+ Nova transação": ela deve apenas linkar/navegar para `/lancamento`, já implementada.

Esses cinco pontos devem virar tasks próprias no spec-03 antes ou durante o marco de deploy (Task 19), já que alteram rotas e removem código em produção.

## 9. Autenticação

- NextAuth Credentials Provider: valida email/senha (bcrypt) contra a tabela `Usuario`.
- Sessão JWT (mais simples que sessão em banco para este porte de app).
- Middleware protege todas as rotas exceto `/login`. **A rota `/cadastro` deixa de existir** — ver seção 17.
- **Sem filtro de dados por usuário** nas queries (exceto para saber "quem lançou") — todos os usuários autenticados veem o mesmo conjunto de dados, conforme decidido nos Requisitos. Essa decisão depende criticamente do cadastro fechado (spec-01 §2).

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

## 11. Pendências que continuam em aberto

- Se `Conta de investimento` ganhará atributos próprios em fases futuras.
- Formato do CSV de fatura (fase futura).
- Categorização automática (fase futura).
- Formatação de data `DD MMM` da Visão mensal (§8.3.10, ex.: "05 AGO"): removida do escopo da Task 26 a pedido do usuário; a Visão mensal continua usando `formatarDataCurta` (`DD/MM/AAAA`). Revisitar se/quando decidido.

## 12. Arquitetura de UX/UI — Transações

Resolve a seção 3.3 dos Requisitos. Em caso de conflito com a seção 7 ou qualquer descrição anterior da tela `/transacoes`, as definições desta seção prevalecem.

### 12.1 Tabela enxuta

5 colunas visíveis: Data efetiva, Descrição, Categoria, Conta, Valor. A coluna de data usa `dataEfetiva` (não `dataCompra`) e a tabela é ordenada por ela — é o campo que já determina `mesReferencia`/`anoReferencia` em toda a aplicação (cálculo de fatura, consolidação da Visão mensal, filtro de Mês/Ano da seção 12.3); numa compra parcelada, `dataCompra` é idêntica em todas as parcelas, então não serve para distinguir quando cada uma ocorre. As demais informações hoje em colunas (Tipo, Data do lançamento, Mês de referência, Parcela, É investimento, Conta de investimento) migram para o modal de detalhe (seção 12.2). O rótulo "Data do lançamento" (não "Data da compra") é usado no modal por ser neutro para entrada, saída e investimento — o campo continua sendo `dataCompra` no schema.

**Indicadores visuais compactos** (sem coluna própria), junto à Descrição ou ao Valor:
- **Tipo**: sinal (+/-) prefixado ao Valor; Entrada em `text-emerald-600` (mesmo tom já usado no bloco Entradas da Visão mensal), Saída na cor padrão do texto.
- **Parcela**: badge "X de Y" (mesmo estilo de tag usado para "Resgate de investimento" na Visão mensal — `rounded-full bg-muted px-2 py-0.5 text-xs`).
- **Investimento**: badge "Aporte" (saída) ou "Resgate" (entrada — só aparece em lançamentos antigos, já que a tela de lançamento não oferece mais essa marcação pra entrada, Task 86).
- **Estorno (M27)**: badge "Estorno" quando `ehEstorno(t)` (§8.3.17). Necessário aqui e **só** aqui: nesta tela o Valor de um estorno é `+ R$ …` em `text-entrada`, exatamente igual ao de um salário, e a única pista seria a coluna Conta trazer o nome de um cartão. O sinal e a cor **não** mudam — a coluna reflete o tipo do registro, e é a Visão mensal que compõe a fatura (§8.3.17).

Uma linha pode acumular mais de um badge (ex.: saída parcelada marcada como aporte tem badge de Parcela **e** de Investimento) — badges quebram linha se não couberem lado a lado. ~~Badge de Recorrência ("X de Y ↻")~~ — **removido (Task 87)**, junto com a funcionalidade.

### 12.2 Modal de detalhe (view + edição + exclusão unificadas)

Clicar em qualquer ponto da linha (não um botão/ícone específico) abre um único `Dialog` com:
- Todos os campos do registro, nos mesmos moldes do formulário de edição já existente (`EditarTransacaoConteudo`) — editáveis ou travados seguindo a mesma regra já definida para parcela.
- Botão "Salvar" (reaproveita `editarTransacao`).
- Botão destrutivo "Apagar", que troca o conteúdo do **mesmo modal** para a confirmação de exclusão já existente (incluindo a opção de propagar para as parcelas restantes) — sem sobrepor um segundo overlay.

Substitui os dois componentes atuais `EditarTransacaoDialog` e `ApagarTransacaoDialog` por um único `DetalheTransacaoDialog`, com estado interno `modo: "detalhe" | "confirmarExclusao"`.

### 12.3 Filtros

Substitui o filtro por coluna (um `Input` por cabeçalho) por uma barra de filtros acima da tabela: busca livre por **Descrição**; filtro por **Conta** (`Select`, opção "Todas"); filtro por **Categoria** (`Select`, opção "Todas"); filtro por **Mês/Ano de referência** (dois `Select`, opção "Todos"). Reaproveita o motor de filtragem já existente do `@tanstack/react-table` — colunas que saem da tabela como visíveis (ex.: mês/ano de referência) continuam existindo como colunas ocultas (`columnVisibility`) só para fins de filtro.

### 12.4 Ações removidas da tabela

A coluna "Ações" deixa de existir — a linha inteira é clicável e abre o modal de detalhe (seção 12.2), eliminando o vazamento horizontal da tabela.

## 13. Valores padrão e composição da projeção

Resolve as seções 3.5 e 3.6 dos Requisitos. Toda a lógica desta seção é **pura** (entra dado, sai número) e mora em `lib/projecao.js` — o que a torna testável no Vitest sem banco, como já acontece com `lib/fatura.js`, `lib/parcelamento.js` e `lib/recorrencia.js`.

### 13.1 Quando a fatura de um mês de referência fechou

Para saber se a estimativa de crédito ainda vale num mês, é preciso descobrir **quando a fatura daquele mês de referência fechou**. Isso é a inversa de `calcularFatura` (seção 4): lá, a data da compra leva ao mês de referência; aqui, o mês de referência leva à data de fechamento.

```javascript
/**
 * Data/hora em que a fatura de um mês de referência fecha para um cartão.
 * Inversa de calcularFatura (seção 4).
 */
function dataFechamentoDaReferencia(mesReferencia, anoReferencia, cartao) {
  let mesFech = mesReferencia;
  let anoFech = anoReferencia;

  // calcularFatura empurra a referência para o mês seguinte quando o
  // vencimento é "menor" que o fechamento — aqui desfazemos esse passo.
  if (cartao.diaVencimento < cartao.diaFechamento) {
    mesFech -= 1;
    if (mesFech < 1) { mesFech = 12; anoFech -= 1; }
  }

  const dia = Math.min(cartao.diaFechamento, ultimoDiaDoMes(mesFech, anoFech));
  return new Date(anoFech, mesFech - 1, dia, 23, 59, 59, 999);
}
```

O `Math.min` reaproveita o mesmo cuidado já usado no parcelamento (seção 5.1): um cartão configurado para fechar dia 31 fecha no dia 28/29/30 nos meses que não têm dia 31.

**Verificação contra os exemplos da seção 4:**

| Cartão | Mês de referência | Fatura fechou em |
|---|---|---|
| Fech. 25, venc. 5 (`5 < 25`) | set/2026 | **25/ago/2026** |
| Fech. 10, venc. 17 (`17 ≥ 10`) | ago/2026 | **10/ago/2026** |

Ambos batem com a tabela da seção 4 lida no sentido inverso — uma compra em 10/ago cai na fatura que fecha em 25/ago e vence em setembro.

### 13.2 Fronteiras da estimativa

```javascript
/** A estimativa de crédito ainda vale? Vale enquanto ao menos um cartão não fechou. */
function creditoAindaEstimavel(mesReferencia, anoReferencia, cartoes, hoje) {
  if (cartoes.length === 0) return false; // sem cartão cadastrado não há gasto no crédito
  return cartoes.some(
    (c) => hoje <= dataFechamentoDaReferencia(mesReferencia, anoReferencia, c)
  );
}

/** A estimativa de débito ainda vale? Vale até o fim do mês de referência. */
function debitoAindaEstimavel(mesReferencia, anoReferencia, hoje) {
  const ultimoInstante = new Date(anoReferencia, mesReferencia, 0, 23, 59, 59, 999);
  return hoje <= ultimoInstante;
}
```

Usar `.some()` é equivalente a comparar com o fechamento mais tardio, e evita construir o máximo explicitamente.

**Receitas não têm fronteira:** uma receita padrão entra em todo mês exibido, passado ou futuro (Requisitos 3.5). Não existe `receitaAindaEstimavel`.

### 13.3 Composição de um mês

```javascript
/**
 * Compõe os totais de um mês a partir das três fontes:
 * lançamentos reais, compromissos já assumidos e valores padrão.
 */
function comporMes({
  mesReferencia, anoReferencia, transacoes, valoresPadrao,
  consolidacoesReceita, consolidacoesDespesa, cartoes, hoje,
}) {
  const doMes = transacoes.filter(
    (t) => t.mesReferencia === mesReferencia && t.anoReferencia === anoReferencia
  );
  const ehParcela = (t) => t.parcelamentoId !== null;
  const doMesFiltro = (c) => c.mesReferencia === mesReferencia && c.anoReferencia === anoReferencia;

  // Estorno: entrada lançada num cartão (Requisitos 3.11). Não é receita —
  // sai de Entradas e abate o real do crédito.
  const ehEstorno = (t) => t.tipo === "ENTRADA" && t.conta?.tipo === "CARTAO_CREDITO";

  // --- Entradas: real + receita padrão (por item, com consolidação do mês
  // substituindo o valor genérico quando existir — Requisitos 3.8, §13.5) ---
  const entradaReal = somar(doMes.filter((t) => t.tipo === "ENTRADA" && !ehEstorno(t)));
  const receitasDoMes = consolidacoesReceita.filter(doMesFiltro);
  const entradaPadrao = valoresPadrao
    .filter((v) => v.tipo === "ENTRADA")
    .reduce((soma, item) => {
      const consolidacao = receitasDoMes.find((c) => c.valorPadraoId === item.id);
      return soma + Number(consolidacao ? consolidacao.valor : item.valor);
    }, 0);

  // --- Saídas no crédito: teto consumido pelo real (Requisitos 3.5) ---
  function comporCredito() {
    const doMeio = doMes.filter(
      (t) => t.tipo === "SAIDA" && !t.ehInvestimento && t.conta.tipo === "CARTAO_CREDITO"
    );

    const parcelas   = somar(doMeio.filter(ehParcela));            // somam por cima
    const consumidor = somar(doMeio.filter((t) => !ehParcela(t))); // avulsos + recorrências

    // Estornos do mês (Requisitos 3.11): abatem o real, e SÓ o real. Não
    // entram no cálculo do estimado — decisão explícita do usuário: estornar
    // não devolve teto (Requisitos 3.5). Por isso `consumidor` continua bruto
    // e `estornos` só aparece no `real`/`total`.
    const estornos = somar(doMes.filter(ehEstorno));

    const teto = somar(
      valoresPadrao.filter((v) => v.tipo === "SAIDA" && v.meio === "CREDITO")
    );
    const aindaEstimavel = creditoAindaEstimavel(mesReferencia, anoReferencia, cartoes, hoje);
    const estimado = aindaEstimavel ? Math.max(0, teto - consumidor) : 0;

    const real = parcelas + consumidor - estornos; // pode ser negativo
    return { real, estimado, total: real + estimado };
  }

  // --- Saídas no débito: previsão fixa por item, resolvida por consolidação
  // (Requisitos 3.5 revisado + 3.9, §13.6). Nenhum lançamento consome nada:
  // itens não consolidados somam cheios, lançamentos somam por cima. ---
  function comporDebito() {
    const real = somar(
      doMes.filter(
        (t) => t.tipo === "SAIDA" && !t.ehInvestimento && t.conta.tipo === "CONTA_CORRENTE"
      )
    );

    const despesasDoMes = consolidacoesDespesa.filter(doMesFiltro);
    const pendentes = valoresPadrao.filter(
      (v) =>
        v.tipo === "SAIDA" &&
        v.meio === "DEBITO" &&
        !despesasDoMes.some((c) => c.valorPadraoId === v.id)
    );

    // Mês encerrado não soma previsão (Requisitos 3.5) — os pendentes ainda
    // aparecem na tela, mas sem valor (§13.6).
    const estimado = debitoAindaEstimavel(mesReferencia, anoReferencia, hoje)
      ? somar(pendentes)
      : 0;

    return { real, estimado, total: real + estimado };
  }

  const credito       = comporCredito();
  const debito        = comporDebito();
  const investimentos = somar(doMes.filter((t) => t.tipo === "SAIDA" && t.ehInvestimento));

  return {
    mesReferencia,
    anoReferencia,
    entradas: { real: entradaReal, estimado: entradaPadrao, total: entradaReal + entradaPadrao },
    credito,
    debito,
    investimentos,
    disponivel: (entradaReal + entradaPadrao) - credito.total - debito.total - investimentos,
  };
}
```

Pontos que merecem atenção:

- **Investimentos nunca são estimados.** Não há valor padrão de aporte; o bloco reflete apenas o que foi lançado.
- **Estorno entra em um lugar só (M27).** `ehEstorno` é a mesma condição usada nas duas pontas — subtrai de `entradaReal` e de `credito.real`. Tratá-lo em só uma delas produziria o erro clássico: contado como receita **e** como abatimento, o Disponível subiria o dobro do estorno. A checagem depende do tipo da conta, e usa **encadeamento opcional** (`t.conta?.tipo`): as duas telas já fazem `include: { conta: true }`, mas até o M27 `comporCredito`/`comporDebito` só liam a conta de **saídas** — uma entrada sem a relação carregada nunca quebrava. Sem o `?.`, a composição do mês inteiro passa a estourar nesse caso; com ele, a entrada é tratada como entrada comum, que é o comportamento histórico.
- **`credito.real` e `credito.total` podem ser negativos.** Um mês com mais estorno que gasto no cartão é legítimo (Requisitos 3.11) e nada é truncado em zero: o `Math.max(0, …)` existente protege só o `estimado`, que é outra coisa. O `disponivel` sobe na mesma medida, que é o resultado correto.
- **A fórmula do `disponivel` é a mesma da seção 8.3.2** (Entradas − Crédito − Débito − Investimentos), agora aplicada sobre totais compostos em vez de apenas reais.
- **Cada bloco devolve `real` e `estimado` separados**, e não só o total — é isso que permite às telas exibirem a distinção visual exigida pelos Requisitos 3.1 e 3.6.
- **A mesma função serve as duas telas.** A Visão mensal chama `comporMes` para um único mês; a Projeção chama para doze. Não há duas implementações da regra.
- **`entradas.estimado` é a chave, não a semântica.** O nome é compartilhado com `credito.estimado`/`debito.estimado` só por simetria de forma (mesmo shape `{real, estimado, total}`, mesma função que os produz) — o conteúdo é outra coisa em cada um: no crédito é uma estimativa de verdade (teto ainda não consumido); no débito é a soma dos itens padrão ainda não consolidados (Requisitos 3.5 revisado); nas entradas é a receita padrão, um valor garantido que nunca é reduzido. A camada de exibição (§16.2) trata os três de forma diferente; a função não foi renomeada porque o nome é interno e já documentado aqui — renomear só a chave sem mudar comportamento não valia o churn em `lib/projecao.js`, seus testes e as telas que a consomem.
- **Débito e crédito deixaram de compartilhar `comporSaidas`** (Task 78). A função única parametrizada por `meio` existia porque a regra era idêntica nos dois; com o débito virando previsão por item, manter um só corpo exigiria condicionais em quase toda linha. Duas funções irmãs e explícitas custam menos leitura que uma genérica cheia de exceção.
- **`real` no débito passa a incluir os lançamentos de consolidação**, que são transações comuns — não há filtro especial aqui. O filtro existe só na camada de exibição (§8.3.7), pra não mostrar o mesmo gasto duas vezes dentro do bloco.
- **As duas listas de consolidação seguem o mesmo padrão de `transacoes`**: o chamador passa a lista relevante (um mês na Visão mensal, a janela de 12 meses na Projeção) e `comporMes` filtra internamente por `mesReferencia`/`anoReferencia` — nenhuma tela pré-filtra antes de chamar. Detalhes em §13.5 e §13.6.

### 13.4 Casos de teste obrigatórios (Vitest)

Como a regra tem várias bordas, `lib/projecao.test.js` deve cobrir no mínimo:

1. Mês futuro sem lançamento algum → estimativa integral em crédito e débito; receita padrão integral.
2. Mês com gasto avulso **no crédito** menor que o teto → estimativa = teto − avulso.
3. Mês com gasto avulso **no crédito** maior que o teto → estimativa zero, total = real.
4. Mês com parcela **no crédito** → parcela soma por cima do teto, sem consumi-lo.
5. Mês com ocorrência de recorrência **no crédito** → consome o teto, como um avulso.
6. Mês com fatura já fechada em todos os cartões → estimativa de crédito zero.
7. Mês com dois cartões de fechamentos distintos, um fechado e outro não → estimativa de crédito ainda vale.
8. Nenhum cartão cadastrado → estimativa de crédito zero.
9. Mês passado → estimativa de despesa zero, mas receita padrão presente.
10. Entrada real pontual → soma à receita padrão, sem descontá-la.
11. Cartão com fechamento dia 31 em mês de 30 dias → fronteira no último dia do mês.
12. Item de receita padrão com consolidação no mês composto → usa o valor da consolidação, não o valor genérico do item.
13. Item de receita padrão com consolidação num **outro** mês (fora do mês composto) → usa o valor genérico, a consolidação de outro mês não vaza.
14. Dois itens de receita padrão, só um consolidado no mês → o consolidado usa seu valor de consolidação, o outro usa o valor genérico, somados corretamente.
15. Entrada real pontual num mês com item consolidado → soma por cima do valor consolidado, sem descontá-lo (mesma regra do caso 10, agora sobre um valor consolidado).

Casos adicionados na Task 78, cobrindo a virada do débito para previsão por item:

16. Gasto avulso no débito → **não** consome a previsão; estimado continua sendo a soma dos itens padrão de débito, e o avulso soma por cima (inverte o caso 2 no débito).
17. Ocorrência de recorrência no débito → mesmo comportamento do caso 16, sem consumir nada (inverte o caso 5 no débito).
18. Gasto avulso no débito maior que a soma dos itens padrão → estimado **não** vai a zero; continua cheio (inverte o caso 3 no débito).
19. Item de despesa padrão no débito consolidado no mês → sai da previsão; o lançamento vinculado entra em `real`.
20. Dois itens de despesa no débito, só um consolidado → o consolidado entra por `real`, o pendente mantém previsão cheia.
21. Consolidação de despesa por R$ 0 (`transacaoId` nulo) → item sai da previsão e nada entra em `real`.
22. Consolidação de despesa num **outro** mês → não vaza para o mês composto; o item continua previsto.
23. Mês passado com item de despesa no débito não consolidado → estimado zero (`debitoAindaEstimavel` falso), mas o lançamento real do mês continua somando.
24. Item de despesa padrão no **crédito** → nunca é afetado pelas consolidações de despesa; segue a regra de teto do caso 2.

Casos adicionados no M27, cobrindo o estorno no crédito (Requisitos 3.11):

25. Estorno no mês → **não** soma em `entradas.real` (o bloco Entradas ignora entradas em cartão).
26. Estorno no mês → abate `credito.real` no valor exato, e `credito.total` cai junto.
27. Estorno no mês com teto de despesa padrão no crédito ainda estimável → `credito.estimado` **inalterado**; a estimativa segue calculada sobre o valor bruto dos avulsos, sem descontar o estorno (é a decisão do usuário — o inverso, se algum dia for revisto, quebra este teste de propósito).
28. Estorno maior que os gastos do cartão no mês → `credito.real` negativo, sem truncar em zero; `credito.estimado` continua ≥ 0.
29. Estorno num mês → `disponivel` sobe **exatamente** o valor do estorno (guarda contra a contagem dupla).
30. Entrada em conta corrente no mesmo mês de um estorno → a entrada soma em `entradas.real` e o estorno não; os dois não se misturam.
31. Estorno num mês com fatura já fechada em todos os cartões (`creditoAindaEstimavel` falso) → `estimado` zero, `real` já com o estorno abatido.
32. Estorno num **outro** mês de referência → não vaza para o mês composto, nem em entradas nem em crédito.

### 13.5 Consolidação mensal de receita padrão

Resolve Requisitos 3.8. `ConsolidacaoReceitaPadrao` (§3 — chamada `ConsolidacaoValorPadrao` até a Task 76, renomeada quando a consolidação de despesa tornou o nome genérico ambíguo) é uma tabela separada de `ValorPadrao` — não um campo nele, nem uma linha "especial" dentro dela — porque a lista de Valores padrão representa "vale todo mês, sempre"; misturar exceções pontuais na mesma tabela obrigaria toda leitura a discriminar "isso é regra geral ou exceção de um mês?". `comporMes` (§13.3) resolve por item: existe uma consolidação de receita para `(valorPadraoId, mesReferencia, anoReferencia)`? Usa o valor dela; senão, usa `ValorPadrao.valor`.

**Por que não virou `Transacao`:** cogitado durante o design (a ideia original do usuário), descartado por três atritos concretos — `Transacao.contaId`/`categoria`/`dataCompra`/`dataEfetiva` são obrigatórios e nenhum tem correspondência conceitual aqui (mesma razão pela qual `ValorPadrao` em si nunca foi uma `Transacao`); identificar as linhas de consolidação por texto (`descricao`) pra excluí-las de `entradaReal` e da tela `/transacoes` seria frágil (quebra numa renomeação, ambíguo com descrições duplicadas); e mesmo contornando isso com um campo novo de vínculo, o resultado seria estruturalmente a mesma tabela nova proposta aqui, só que pendurada em `Transacao` de um jeito mais confuso.

**Onde se edita:** só na Visão mensal, no bloco Entradas — não existe UI de consolidação na tela Valores padrão, nem um seletor de mês dedicado (a Visão mensal já sabe qual mês/ano está sendo visto via `SeletorPeriodo`, o contexto vem de onde o usuário está).

**Exibição — bloco Entradas (`visao-mensal-client.jsx`):** `LinhaReceitaPadrao` (linha única agregada) é substituída por uma lista, um item de receita padrão por linha, sempre visível quando o bloco está expandido (não só quando há consolidação) — mesmo com um único item cadastrado, o comportamento já é "por item", só que com uma linha. Cada linha mostra a **descrição do item** (não um rótulo genérico "Receita padrão") e o **valor resolvido** daquele mês (consolidado ou genérico — visualmente idênticos, sem marcação, por decisão consciente: uma vez consolidado, esse é o valor normal do mês, não uma incerteza a sinalizar). **Um único divider** (borda inferior) fecha o bloco de itens como um todo, separando-o dos lançamentos reais agrupados por dia abaixo — não há divider entre os itens de receita padrão entre si. O bloco de lançamentos reais (`DetalheDiario`, agrupamento por dia) **não muda em nada** nesta task.

**Edição inline — ícone de lápis:** cada linha ganha um botão-ícone (`Pencil`, `lucide-react`, ~12px, `text-muted-foreground`, hover destaca) antes do valor — não um botão "Editar" como na tela Valores padrão, que ali é a tela inteira dedicada a isso; aqui é uma ação secundária dentro de uma tela de consulta, e precisa ficar discreta. Clicar troca **só aquela linha** por um formulário compacto: um campo de valor (reaproveitando a lógica de `CampoValor` — acumulação estilo calculadora — mas **sem o `<Label>` visível**, que não cabe no espaço inline; `CampoValor` ganha um prop `label` opcional, quando omitido não renderiza o elemento, usando `aria-label` no input em vez disso) e dois botões-ícone compactos (`Check`/`X`, Salvar/Cancelar) — mesmo espírito do formulário inline já usado em Valores padrão (`FormularioInline`), só que reduzido ao mínimo (sem campo de descrição, que não muda). Quando o item **já tem** consolidação ativa nesse mês, o formulário ganha um link pequeno "usar padrão (R$ X)" que remove a consolidação **imediatamente** (sem precisar de Salvar) e volta o item ao valor genérico.

**Server Actions** (`lib/actions/valores-padrao.js`) — nomes revisados na Task 76, junto com o rename do model, pra ficarem simétricos com os de despesa (§13.6):
- `consolidarReceitaPadrao({ valorPadraoId, mesReferencia, anoReferencia, valor })` — `upsert` por `(valorPadraoId, mesReferencia, anoReferencia)` (a constraint `@@unique` do schema garante no máximo uma linha). Valida sessão (padrão do projeto) e que `valorPadrao.tipo === "ENTRADA"` antes de gravar. Chamava-se `consolidarValorPadrao`.
- `removerConsolidacaoReceitaPadrao({ valorPadraoId, mesReferencia, anoReferencia })` — apaga a linha, se existir. Chamava-se `removerConsolidacaoValorPadrao`.
- Ambas seguidas de `router.refresh()` no cliente, mesmo padrão já usado em `ValoresPadraoClient`.

**`page.jsx` (Visão mensal e Projeção):** ambos passam a buscar `db.consolidacaoReceitaPadrao.findMany(...)` — Visão mensal filtrando pelo mês em exibição, Projeção pela janela de 12 meses (mesmo padrão de `OR` já usado para `transacoes`) — e repassam para `comporMes`. Só a Visão mensal precisa **também** montar a lista bruta de itens de receita padrão + valor resolvido do mês (uma pequena composição própria em `page.jsx`, fora de `comporMes`, já que a Projeção nunca precisa do detalhe por item — só do agregado que `comporMes` já devolve). A Projeção não muda em nenhum outro ponto: já consome só `entradas.total`, que passa a vir correto automaticamente.

### 13.6 Consolidação de despesa padrão no débito

Resolve Requisitos 3.9. Enquanto a consolidação de receita (§13.5) só substitui um número, esta **gera um lançamento real** — é o registro de que a conta foi paga. O modelo de dados (`ConsolidacaoDespesaPadrao`, §3) e o porquê de ser tabela separada estão documentados no schema.

**Estados de um item de despesa padrão no débito, num dado mês:**

| Estado | Registro de consolidação | Transação | Entra no mês como |
|---|---|---|---|
| Pendente | não existe | — | `estimado` (valor cheio do item), zerado se o mês já encerrou |
| Pago | existe, `transacaoId` preenchido | existe | `real` (valor da transação) |
| Resolvido sem pagar | existe, `transacaoId` nulo | não existe | nada |

**Layout do bloco "Saídas no débito" (§8.3.7 revisado, fiel ao mock validado com o usuário):**

1. **Lista de despesas padrão, no topo** — espelha a posição que a receita padrão já ocupa no bloco Entradas (§13.5): vem **antes** dos lançamentos, com um rótulo de seção `Despesas padrão` em `text-xs text-muted-foreground`. Um item por linha, na ordem de cadastro, incluindo pagos e pendentes na mesma lista (é uma checklist — a ordem estável mês a mês é o que a torna legível).
2. **Divisor tracejado** (`border-t border-dashed`) separando a lista dos lançamentos.
3. **Agrupamento por dia**, como hoje (`DetalheDiario`), **sem** os lançamentos gerados por consolidação.

A linha "Estimado restante" (`LinhaEstimado`) **deixa de existir no débito** — a lista de pendentes já é o restante, agora nominal e acionável. O componente continua sendo usado pelo bloco de crédito, sem mudança.

**Anatomia de cada linha da checklist:**

- **Gatilho + estado no mesmo controle** — um botão-ícone à esquerda: `Circle` (`lucide-react`) quando pendente, `CheckCircle2` quando resolvido. O ícone comunica o estado e é o que abre o formulário; não há legenda.
- **Item pago recua**: descrição e valor em `text-muted-foreground`, enquanto o pendente fica na cor normal do texto. A atenção vai naturalmente pro que falta — inversão deliberada do peso visual, no mesmo espírito de um app de tarefas. (Descartado: descrição riscada, que em contexto financeiro se lê como "estornado".)
- **Data do pagamento** (`text-xs text-muted-foreground`) entre a descrição e o valor, só quando pago com lançamento. Como o lançamento sai do agrupamento por dia, essa é a única pista de *quando* — sem ela a informação se perderia.
- **Valor** à direita, `tabular-nums`. Em mês encerrado, um item pendente exibe o texto `não registrado` no lugar do valor — ele não soma ao total (§13.3), e mostrar um número que não entra na conta confundiria.

**Formulário inline de consolidação:** clicar no ícone troca a área abaixo da linha por um formulário compacto, mesmo padrão de `FormularioInline` já usado em Valores padrão e na consolidação de receita:

- **Campos:** valor (`CampoValor`, pré-preenchido com o valor do item quando pendente, ou com o valor atual quando editando), data (pré-preenchida com hoje se o mês exibido for o corrente, senão com o dia 1 do mês exibido — ou com a data da transação quando editando), conta corrente (`Select` só com contas `CONTA_CORRENTE`, pré-preenchida com a conta da transação quando editando, senão vazia) e categoria (`Select`, pré-preenchida com `ValorPadrao.categoria`).
- **Validação da data:** precisa cair dentro do mês exibido. Para débito, `calcularReferencia` deriva `mesReferencia` de `dataCompra` (§4) — uma data fora do mês faria o lançamento nascer em outro mês e sumir da lista, sem erro aparente.
- **Ações:** `Cancelar` e `Consolidar` à direita. Quando o item **já está resolvido**, o botão primário vira `Salvar` e aparece à esquerda uma ação destrutiva: **`Apagar lançamento`** quando há transação, **`Desfazer`** quando foi resolvido por R$ 0. O rótulo é explícito de propósito — um botão só "Apagar" dentro da linha de uma despesa padrão se leria como apagar o *item padrão*, que é global e afeta todos os meses.
- **Confirmações** (`window.confirm`, mesmo padrão das exclusões em Contas e Valores padrão): antes de apagar o lançamento, e antes de salvar com R$ 0 um item que tinha lançamento — este segundo caso é uma exclusão de transação disparada por uma edição de valor, destrutivo demais pra acontecer em silêncio.

**Server Actions** (`lib/actions/valores-padrao.js`, ao lado das de receita):
- `consolidarDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia, valor, data, contaId, categoria })` — valida sessão, que o item é `tipo === "SAIDA" && meio === "DEBITO"`, que a conta é `CONTA_CORRENTE` e que a data cai no mês. Numa `$transaction`: cria (ou atualiza) a `Transacao` e faz `upsert` do registro de consolidação. Com valor zero, não cria transação — e, se havia uma, apaga (o `Cascade` cuidaria do registro, então a ordem importa: atualizar o registro para `transacaoId: null` antes de apagar a transação).
- `removerConsolidacaoDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia })` — apaga o registro e, se houver, a transação vinculada.
- Ambas revalidam `/visao-mensal`, `/projecao` e `/transacoes` — esta última porque a consolidação cria/apaga lançamentos que aparecem lá.

**Leitura (`buscarSaidasDebito`, `lib/consolidacao.js`):** ganha `consolidacaoDespesa: null` no `where`, aproveitando a relação inversa opcional de `Transacao` (§3) — é o filtro que tira o lançamento consolidado do agrupamento por dia sem tocar em mais nada. `/transacoes` **não** filtra: lá o lançamento é uma transação como qualquer outra.

**`visao-mensal/page.jsx`** passa a montar também a lista de itens de despesa padrão do débito com o estado resolvido de cada um (`id`, `descricao`, `categoria`, `valorPadrao`, e — quando consolidado — `valor`, `data` e `contaId` vindos da transação, este último pra pré-preencher a conta no formulário ao editar), na mesma composição própria que já monta `itensReceitaPadrao`.

**A Projeção não muda** — consome só `debito.total`, que passa a vir correto automaticamente. Consolidar não é oferecido lá: a tela é resumo de doze meses, e a ação pertence ao detalhe de um mês.

## 14. Tela de Projeção e simulação

Resolve as seções 3.6 e 3.7 dos Requisitos.

### 14.1 Rota e carregamento

Rota `/projecao`, dentro do grupo `(protegido)`. O Server Component (`page.jsx`) busca de uma vez:

- **Transações** dos 12 meses da janela — filtro por `(mesReferencia, anoReferencia)`, aproveitando o índice composto já existente.
- **Valores padrão** (todos — a lista é curta e vale para todos os meses).
- **Contas** — os cartões alimentam `creditoAindaEstimavel` e o formulário de simulação.

Chama `comporMes` doze vezes no servidor e passa o array pronto para o Client Component, junto com os cartões (necessários para a simulação recalcular no cliente).

**Cuidado já conhecido:** `Decimal` do Prisma não é serializável de Server para Client Component — converter com `Number(...)` antes de passar, como já é feito em `visao-mensal/page.jsx` e `transacoes/page.jsx`.

**Cache:** a rota depende de "hoje" para calcular as fronteiras, então não pode ser estática. Como a janela é derivada da data atual e não de `searchParams`, é preciso forçar renderização dinâmica com `export const dynamic = "force-dynamic"` — do contrário o Next prerenderiza no build e a projeção congela na data da publicação. Este é o mesmo tipo de armadilha do Full Route Cache que já causou o bug da conta nova não aparecer em `/lancamento`.

### 14.2 Estrutura visual

Três faixas, de cima para baixo:

1. **Gráfico de barras do Disponível (revisado na Task 72 — migrado pra Recharts)** — 12 barras, uma por mês, uma série só (`disponivelExibido`: `disponivelSimulado` quando o mês está simulado, senão `disponivel` — o mesmo valor já exibido hoje), divergindo de uma linha de base em zero. Sem quebra por categoria — Entradas/Saídas/Investimentos continuam só nos indicadores de cada card da lista, abaixo; o gráfico é a visão panorâmica de uma métrica só.

   **Cor de cada barra** (via `fill="var(--token)"` direto no elemento SVG — o `fill` do Recharts não aceita classe do Tailwind, só um valor de cor; a variável CSS resolve porque `fill` como atributo de apresentação participa da cascata, mesmo raciocínio já registrado abaixo sobre a sintaxe de opacidade do Tailwind não funcionar com os tokens hex deste projeto):
   - Não simulado, `disponivelExibido >= 0`: `var(--entrada)`.
   - Não simulado, `disponivelExibido < 0`: `var(--destructive)`.
   - **Simulado** (`mes.simulado === true`), **qualquer sinal**: `var(--periodo-fg)` (reaproveitado — já é o tom usado no seletor de período pra destaque de estado de UI, não uma cor de categoria financeira, o que evita ler "simulado" como uma quarta categoria de dinheiro). Cobre inclusive o caso de um mês virar negativo por causa da simulação (ex.: R$ 500 → -R$ 1.000): como a altura/direção da barra já vem de `disponivelExibido` normalmente, a barra atravessa o zero sem precisar de tratamento especial — só a cor muda. Alternativa descartada na entrevista com o usuário: empilhar um segmento "diferença" sobre a barra — funciona quando os dois valores têm o mesmo sinal, mas não tem suporte nativo do Recharts pra cruzar a linha do zero quando o sinal muda.

   **Legenda:** sem legenda permanente pra positivo/negativo — a posição da barra acima/abaixo do zero já comunica isso sozinha. Um indicador único (chip de cor + texto "Simulado"), **idêntico no desktop e no mobile**, aparece só quando pelo menos um mês da janela tem `simulado === true` — mesma condição que hoje aciona a frase de rodapé condicional, que sai (substituída por esse indicador). Sem essa condição, nenhum indicador aparece.

   **Eixo e grid — só no desktop:** `YAxis` (valores em R$, formatados sem centavos por um formatador próprio do componente — não `formatarReais`, que sempre mostra centavos) e as linhas de grade aparecem só a partir do breakpoint `md`, detectado em runtime (`window.innerWidth`/`matchMedia`, mesmo padrão de `BREAKPOINT_MD_PX` já usado em `useSwipeMes`, `visao-mensal-client.jsx`) — não dá pra resolver isso só com classes Tailwind porque o Recharts não renderiza os eixos condicionalmente via CSS. O eixo X (abreviação de 3 letras do mês) continua em ambos os breakpoints, como já era. No mobile, sem eixo Y nem grid, evita reabrir o aperto de espaço já resolvido na Task 71 — a barra some sozinha, só com a cor e a posição.

   **Tooltip** (hover no desktop, toque no mobile — comportamento nativo do Recharts): mostra `Mês/Ano` e, quando não simulado, `formatarReais(disponivel)` sozinho; quando simulado, `formatarReais(disponivel)} → ${formatarReais(disponivelSimulado)}` — mesmo formato "antes → depois" já usado em `DisponivelComDelta` nos cards de mês (§14.2, ponto 3), pra não inventar uma segunda notação pra dizer a mesma coisa.

   **Barra não navega** — sem `onClick`; a navegação pra Visão mensal continua exclusiva dos cards da lista abaixo (Requisitos 3.6). Achado da entrevista: hover/toque pra ver valor e navegação por clique são affordances diferentes vivendo a poucos cm de distância — misturar as duas no mesmo gesto confunde mais do que ajuda.

   **Acessibilidade:** cada barra ganha um `<title>` SVG (ou `aria-label` equivalente) com o mesmo texto do tooltip — o Tooltip do Recharts não é nativamente acessível via teclado/leitor de tela, e o app já usa esse tipo de fallback leve nos indicadores dos cards (`title`, Design §14.2 ponto 3, "reforçado por `title` no elemento para acessibilidade").

   **Sem animação** (`isAnimationActive={false}`) — recalcular a simulação atualiza as barras instantaneamente, mesmo comportamento de hoje; Recharts anima por padrão, e isso precisa ser desligado explicitamente.

   Sai o contorno (`ring-2 ring-inset ring-primary`) que hoje marca barra simulada, e sai o cálculo manual de `ALTURA_BARRA_PX`/`maiorAbsoluto`/`alturaPx` — o domínio do eixo escala automaticamente a partir dos dados.
2. **Formulário de simulação** — compacto, numa linha no desktop: cartão, data, valor, parcelas, e um botão para limpar.
3. **Lista dos 12 meses** — um card por mês. Mês à esquerda — nome do mês em destaque (`font-semibold`) e ano em tom neutro (`text-xs text-muted-foreground`), mesmas cores e tamanhos nos dois breakpoints, só a disposição muda: no desktop, empilhados em duas linhas, com largura fixa (`md:w-28`) pros cards ficarem com altura/alinhamento padronizados ao rolar a lista; no mobile, lado a lado numa linha só, separados por um ponto (`Agosto · 2026`) — empilhado ficava alto demais numa tela estreita, onde a largura fixa de duas linhas também não se justifica. Ao centro, três indicadores compactos ícone + valor, sem rótulo em texto (a cor+ícone identifica, reforçado por `title` no elemento para acessibilidade) — **Entradas** (círculo com seta pra baixo, `text-entrada`), **Saídas** (círculo com seta pra cima, `text-muted-foreground`), **Investimentos** (cofrinho, `text-investimento`); à direita, o **Disponível** em destaque, rotulado com uma legenda pequena "Disponível" (`text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground`, `mb-0.5` até o valor) acima do valor (`text-xl font-semibold`, `text-destructive` só quando negativo — mesma regra da Visão mensal), com o delta de simulação (§14.3) quando houver — mesmo padrão de rótulo já usado no card de resumo da Visão mensal (§8, `CardTitle` "Disponível"), só que compacto o bastante pra não empurrar o card em altura. Nenhum indicador mostra a composição real/estimado — só o total consolidado; essa distinção deixou de existir neste nível de resumo e passou a viver só na Visão mensal (Requisitos 3.6, revisado — ver §16.2). Investimentos exibe "R$ 0" quando o mês não teve aporte, mantendo os três indicadores alinhados ao rolar a lista.

   **Simetria dos indicadores no mobile (revisado — achado do usuário em uso real):** a primeira versão deixava os três indicadores quebrarem em duas linhas quando não cabiam lado a lado (`flex-wrap`) — na prática, 2 indicadores ficavam numa linha e o 3º sozinho embaixo, assimétrico. Substituído por uma única linha sempre (`flex-nowrap`), com fonte e ícone menores **só no mobile** (o desktop, que nunca teve esse problema, mantém os valores originais):

   | | Mobile | Desktop |
   |---|---|---|
   | Fonte do indicador | `text-[11px]` | `text-sm` (14px, inalterado) |
   | Ícone | `h-3.5 w-3.5` (14px) | `h-4 w-4` (16px, inalterado) |
   | Gap ícone↔valor | `gap-1` (4px) | `gap-1.5` (6px, inalterado) |
   | Gap entre indicadores | `gap-x-2` (8px) | `gap-x-5` (20px, inalterado) |

   Medido empiricamente (Chromium headless, fonte Arial real do app, `tabular-nums`, viewport 393px/iPhone 16) contra o pior caso — os três indicadores simultaneamente em `R$ 99.999,99` (5 dígitos): a linha precisa de 268,2px dos 279px disponíveis dentro do card (`main` `p-8` → borda do `Card` → `CardContent` `px-6 py-4`), 10,8px de folga. Valores de 6+ dígitos podem cortar o texto (`overflow-hidden text-ellipsis` no valor) — fora do escopo garantido pela seção 3.6 dos Requisitos, que cobre uso familiar comum.

   **Cor do indicador de Saídas:** não existe um token de cor único para "saída" — o card soma débito e crédito num total só, e nem `--saida-debito` nem `--saida-credito` representam esse total sozinhos. O ícone usa `text-muted-foreground` (o mesmo tom neutro já usado em elementos de apoio) em vez de escolher um dos dois tokens de meio de pagamento, e também em vez de `--estimado` — que já carrega um significado específico (incerteza) que não se aplica aqui.

Cada card da lista é um **link** para `/visao-mensal?mes=X&ano=Y` (Requisitos 3.6) — a Projeção resume doze meses, o detalhe de cada um continua na Visão mensal. O hover reforça essa affordance de clique (borda, fundo e sombra do card destacados); usa tokens sólidos do tema (`border-ring`, `bg-muted`), não a sintaxe de opacidade `/NN` do Tailwind — `tailwind.config.js` mapeia as cores direto para `var(--token)` em hex, que não suporta modificador de opacidade (achado registrado, correção mais ampla ainda pendente — ver nota em `spec-03`).

### 14.3 Simulação

Roda **inteiramente no cliente**, sobre os dados já carregados — nenhuma chamada ao servidor, nenhuma Server Action, nenhuma escrita.

- **Entradas do formulário:** cartão, data da compra, **valor total** e quantidade de parcelas.
- **Divergência deliberada de `/lancamento`:** lá o usuário informa o *valor da parcela*; aqui informa o *valor total*, porque numa simulação se pensa no preço do produto ("um celular de R$ 3.000 em 10x"). O valor da parcela é derivado (`total / n`, arredondado a duas casas), e um eventual centavo de resíduo é irrelevante numa projeção.
- **O valor total nunca é aplicado a um único mês.** Ele existe apenas como entrada de conveniência: é imediatamente dividido em N parcelas, e o que impacta a projeção são **as parcelas, distribuídas mês a mês** — que é justamente o efeito que a simulação existe para revelar.
- **Distribuição:** reaproveita `gerarParcelas` de `lib/parcelamento.js` — função pura, roda no cliente sem adaptação. Isso garante que a simulação obedeça exatamente às mesmas regras de fechamento de fatura de um lançamento real.
- **Aplicação:** cada parcela simulada soma ao `credito.total` (e reduz o `disponivel`) do seu mês de referência. Como parcelas **não consomem o teto** (seção 13.3), somar direto ao total está correto e não exige recompor o mês inteiro.

**Exemplo trabalhado** — R$ 3.000 em 10x, cartão com fechamento dia 25 e vencimento dia 5, compra em 10/ago/2026:

| Passo | Resultado |
|---|---|
| Valor da parcela | `3000 / 10` = **R$ 300** |
| Parcela 1 | fatura fecha 25/ago → **set/2026** |
| Parcelas 2–10 | faturas consecutivas → **out/2026** a **jun/2027** |
| Efeito em cada um dos 10 meses | `credito.total` +R$ 300 · `disponivel` −R$ 300 |
| Efeito em ago/2026 e jul/2027+ | **nenhum** — fora do intervalo das parcelas |

**Parcelamentos que ultrapassam a janela:** uma compra em 24x tem parcelas caindo além do 12º mês projetado. Elas simplesmente não são exibidas — a tela mostra a janela de 12 meses, não o parcelamento inteiro. A simulação deve deixar isso perceptível (ex.: "10 de 24 parcelas dentro da janela"), para o usuário não concluir que a dívida termina antes do que termina.
- **Efêmera:** vive em `useState`. Sair da rota descarta. Não há persistência, não há URL compartilhável, não há conversão em lançamento.
- **Exibição:** o resultado simulado deve ser distinguível do valor base — a proposta é exibir o delta ao lado do número (ex.: `R$ 1.140 → R$ 840`), para que o impacto seja lido diretamente, sem o usuário precisar memorizar o estado anterior.

### 14.4 Percentual do disponível (M28)

Resolve Requisitos §3.12. Validado com o usuário via mock em HTML antes das tasks — a régua, o texto do rótulo e os casos de borda foram decididos ali.

**Duas funções puras, em `lib/disponivel.js`** (módulo novo, sem dependência de `db` — é consumido por um Client Component):

```javascript
/**
 * Quanto o disponível representa das entradas do mês, em porcentagem.
 * Devolve null quando não há base de cálculo (entradas <= 0) — a camada de
 * exibição usa isso pra esconder o rótulo (Requisitos §3.12).
 */
export function percentualDoDisponivel(disponivel, entradas) {
  if (!(entradas > 0)) return null;
  return (disponivel / entradas) * 100;
}

/** Faixa da régua (Requisitos §3.12). Limites inclusivos no piso. */
export function faixaDoPercentual(percentual) {
  if (percentual >= 40) return "otimo";
  if (percentual >= 25) return "bom";
  if (percentual >= 10) return "atencao";
  if (percentual >= 5) return "baixo";
  return "critico";
}
```

`percentualDoDisponivel` devolve **null**, não zero: zero é um percentual legítimo (disponível exatamente zerado, que cai na faixa crítica) e confundir os dois faria um mês sem renda parecer um mês sem folga. A guarda é `!(entradas > 0)` e não `entradas === 0` de propósito — cobre também `null`, `undefined` e `NaN` vindos de um mês malformado, sem deixar `Infinity` chegar à tela.

`faixaDoPercentual` não trata negativo em separado: qualquer valor abaixo de 5 — inclusive negativo — é `critico`, que é exatamente a regra dos Requisitos.

**A faixa é calculada sobre o percentual arredondado**, não sobre o exato — `faixaDoPercentual(Math.round(percentual))`. O componente exibe o arredondado, e classificar pelo exato faria a cor contradizer o número: um mês com 39,65% mostra `40%` e sairia em verde-lima, enquanto a régua dos Requisitos diz que 40% é verde com destaque. Encontrado no QA da Task 105, num mês real da janela.

**Tokens (§16.1).** Cinco tokens semânticos novos, `--disponivel-otimo` … `--disponivel-critico`. Quatro reaproveitam valores hexadecimais que já existem na paleta, mas ganham nome próprio em vez de a UI referenciar `--categoria-lima` ou `--saida-credito` — a régua não é uma categoria nem um meio de pagamento, e o alias explícito deixa uma futura recalibragem tocar num lugar só. Só `--disponivel-critico` (`#F43F5E`) é um valor novo.

**Mapa explícito de classe, não interpolação.** Mesma armadilha já registrada em `CLASSE_COR_CATEGORIA` (§18.4): o JIT do Tailwind só gera a classe se encontrar a string literal no código-fonte, então `text-disponivel-${faixa}` sairia sem cor na build. O componente usa um objeto literal `{ otimo: "text-disponivel-otimo", ... }`.

**Anatomia do rótulo:** `text-xs` (12px contra os 20px do valor) e **`font-normal` explícito** — o `<p>` que envolve o valor é `font-semibold`, e sem a declaração o rótulo herda o peso e *todas* as faixas saem com destaque, anulando a distinção (bug encontrado no QA da Task 105), exceto nas faixas `otimo` e `critico`, que levam `font-semibold` — é assim que "com destaque" dos Requisitos se materializa, sem um sexto tom. Fica na mesma linha do valor, alinhado pela linha de base (`items-baseline`), à direita dele no desktop e logo após ele no mobile — o container do Disponível já inverte o alinhamento por breakpoint (`md:text-right`), então o rótulo acompanha sem regra própria.

**Com simulação ativa** (§14.3), o percentual é calculado sobre `disponivelSimulado` e aparece **uma vez só**, ao fim da linha "antes → depois". Dois percentuais numa linha que já tem dois valores em R$ passariam de qualquer largura útil no mobile.

## 15. Navegação agrupada

Revisa a seção 8.1. Em caso de conflito, **esta seção prevalece**.

### 15.1 Estrutura

Cinco destinos em dois grupos semânticos:

| Grupo | Destinos |
|---|---|
| **Dados** | `/visao-mensal`, `/transacoes`, `/projecao` |
| **Ajustes** | `/contas`, `/valores-padrao` |

### 15.2 Desktop

A barra lateral exibe **os cinco destinos simultaneamente**, na ordem acima, com um **divisor** (`border-t`) entre os grupos. Sem rótulos de grupo: o agrupamento é comunicado apenas pela separação visual.

O botão "+ Nova transação" permanece no topo e o menu do usuário no rodapé (`mt-auto`), sem mudanças.

### 15.3 Mobile

A barra inferior passa de quatro alvos para **três**:

| Posição | Alvo | Comportamento |
|---|---|---|
| Esquerda | **Dados** | Navega para `/visao-mensal` |
| Centro | **Nova** | Botão circular em destaque → `/lancamento` |
| Direita | **Ajustes** | Abre um `Sheet` inferior com os dois destinos de configuração |

Dentro do grupo Dados, a troca entre as três telas acontece por uma **barra de abas fixa no topo do conteúdo**, a um único toque — é o que evita o custo de dois toques que motivou a escolha deste padrão.

**Implementação das abas:** um novo componente cliente `components/navegacao/abas-dados.jsx`, renderizado por `app/(protegido)/layout.jsx` imediatamente acima de `{children}`. Ele se auto-oculta em dois casos: no desktop (`md:hidden`) e quando `usePathname()` não corresponde a nenhuma das três rotas do grupo. Essa abordagem evita reorganizar as rotas em um route group aninhado — nenhum arquivo precisa mudar de lugar.

**Atenção ao `tailwind-merge`:** ao compor as classes responsivas deste componente e dos alvos da barra inferior, não repetir um utilitário de `display` sem prefixo de breakpoint dentro de uma constante compartilhada. Foi exatamente esse padrão que duplicou o seletor de período no mobile — ver o histórico do `seletor-periodo.jsx`.

### 15.4 Tela de Valores padrão

Rota `/valores-padrao`, dentro do grupo Ajustes. Tela única com **duas listas** — Receitas padrão e Despesas padrão — cada uma com CRUD inline: linha com descrição e valor, e edição/exclusão por item.

O formulário de despesa tem um seletor **Crédito/Débito** e um seletor de **Categoria** (adicionado na Task 77 — pré-preenche a consolidação de despesa, §13.6; o padrão é `OUTROS`); o de receita não tem nenhum dos dois (seção 3 do schema). Reaproveita `CampoValor` (máscara monetária) já usado em `/lancamento` e no modal de `/transacoes`.

**Gatilho de adicionar, no cabeçalho (revisado — Task 75):** o botão "Adicionar" ficava no fim da lista de cada card — some com o crescimento da lista, exigindo rolagem pra achar a ação mais comum da tela. Passa a ser um **"+"** discreto no cabeçalho de cada card (ao lado do título "Receitas padrão"/"Despesas padrão"), sempre visível independente de quantos itens já existem. O formulário de novo item abre **no topo da lista** (antes do primeiro item existente), não mais no fim — coerente com o gatilho estar no topo.

**Ícones no lugar de botões de texto (revisado — Task 75):** "Editar" (`Button variant="outline"`) e "Apagar" (`Button variant="destructive"`) por item viram ícones — `Pencil`/`Trash2` (`lucide-react`), `text-muted-foreground` em repouso, `text-foreground` (editar) ou vermelho suave (apagar) no hover. Mesmo padrão aplicado em Contas (§8.2.3) e já usado no lápis de consolidação de receita padrão na Visão mensal (§13.5). `window.confirm` antes de apagar continua como está.

Mutações via Server Actions em `lib/actions/valores-padrao.js`, com `revalidatePath` para `/valores-padrao`, `/visao-mensal` e `/projecao` — as três telas que consomem esses dados. Omitir alguma delas reproduz o bug de cache que já ocorreu com contas (seção 8.5).

## 16. Tema escuro

Resolve o requisito de tema da spec-01 §4. É um marco independente das seções 13–15 e pode ser implementado antes ou depois delas.

### 16.1 Tokens

O tema escuro é **único**: não há alternância nem leitura de `prefers-color-scheme`. Na prática, o bloco `:root` de `app/globals.css` passa a conter os valores escuros e o bloco `.dark` — hoje código morto, nunca ativado — é removido.

**`color-scheme: dark` no `:root` (Task 88).** Os tokens abaixo informam o *app* de que o tema é escuro, mas não informam o **navegador** — e o interior de widgets nativos é desenhado por ele, não por CSS do autor. Sem essa declaração, todo `<input type="date">` renderiza o ícone de calendário escuro sobre fundo escuro (medido: brilho 48 sobre fundo 36, praticamente invisível) e abre o popup do calendário **branco** no meio da aplicação escura. Vale também para scrollbars e para o preenchimento automático do Chrome no login, que força fundo claro por padrão.

`color-scheme` **não sobrepõe cor definida pelo autor** — afeta só o interior dos widgets do navegador e o canvas default. Verificado: `body`, superfície de card, fundo e borda de `Input` e cor de texto ficam idênticos antes e depois. Como não há `<select>` nativo na aplicação (todos são Radix), o principal ponto de risco dessa declaração não se aplica aqui.

Paleta base:

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#131316` | Fundo da aplicação |
| `--card`, `--popover` | `#1B1B1F` | Superfícies elevadas |
| `--muted`, `--secondary`, `--accent` | `#232328` | Superfícies rebaixadas, hover |
| `--foreground` | `#F4F4F5` | Texto principal |
| `--muted-foreground` | `#85858F` | Texto secundário |
| `--border`, `--input` | `#2E2E34` | Bordas e campos |

Régua do percentual do disponível (§14.4, M28) — cinco degraus do verde ao vermelho:

| Token | Valor | Faixa |
|---|---|---|
| `--disponivel-otimo` | `#4ADE80` | 40% ou mais (mesmo hex de `--entrada`) |
| `--disponivel-bom` | `#A3E635` | 25% a 40% (mesmo hex de `--categoria-lima`) |
| `--disponivel-atencao` | `#FBBF24` | 10% a 25% (mesmo hex de `--saida-debito`) |
| `--disponivel-baixo` | `#FB7185` | 5% a 10% (mesmo hex de `--saida-credito`) |
| `--disponivel-critico` | `#F43F5E` | Abaixo de 5% (**valor novo**) |

Quatro repetem hexadecimais já presentes na paleta, mas com nome próprio: a régua não é categoria nem meio de pagamento, e o alias deixa uma recalibragem futura tocar num lugar só.
| `--primary` | `#F4F4F5` | Botão primário (fundo claro) |
| `--primary-foreground` | `#1B1B1F` | Texto do botão primário |

**Cores semânticas** — hoje cravadas como classes literais do Tailwind e por isso invisíveis ao sistema de temas. Passam a ser tokens:

| Token | Valor | Substitui |
|---|---|---|
| `--entrada` | `#4ADE80` | `text-emerald-600` |
| `--investimento` | `#60A5FA` | `text-blue-600` |
| `--saida-debito` | `#FBBF24` | `text-amber-600` |
| `--saida-credito` | `#FB7185` | `text-rose-600` |
| `--periodo-bg` / `--periodo-fg` | `#262640` / `#A5B4FC` | `bg-indigo-50` / `text-indigo-600` |

A família `-400` substitui a `-600` porque os tons `-600` do Tailwind foram calibrados para contrastar com branco; sobre `#131316` eles ficam escuros demais.

**Token novo, exigido pelas seções 13–14:**

| Token | Valor | Uso |
|---|---|---|
| `--estimado` | `#85858F` | Texto e traço de valores estimados |

### 16.2 Distinção visual entre real e estimado

Exigida pelo Requisitos 3.1 e usada nos blocos e no card de resumo da Visão mensal. **Não se aplica à Projeção** — seus cards de mês mostram só o total consolidado de cada indicador, sem separar real de estimado (Requisitos 3.6, revisado; ver §14.2). A distinção **não pode depender só de cor** — precisa sobreviver a impressão, daltonismo e telas ruins.

`comporMes` (§13.3) devolve a parcela não-real de entradas e de saídas na mesma chave (`estimado`), mas as duas **não têm a mesma natureza** (Requisitos 3.1, 3.5) — o tratamento visual diverge:

**Despesa (Saídas no débito, Saídas no crédito) — é uma estimativa de verdade:**
- Usa `--estimado` **e** um rótulo textual: "Estimado restante" na linha própria do bloco (revisado pós-implementação — deixa explícito que é o que sobra do teto, não o teto cheio) e "estimado", em minúsculo, inline no subtexto do card de resumo (ver abaixo).
- Na Visão mensal, entra como uma **linha própria depois** dos lançamentos reais do bloco, com **borda tracejada** (`border-t border-dashed`) — o tracejado comunica "provisório".
- No card de resumo, o subtexto segue `R$ 800 + R$ 400 estimado` (valor real primeiro, sem a palavra "real" — revisão pós-implementação: o termo era redundante, já que o segundo valor já é identificado como "estimado").

**Receita padrão (bloco Entradas) — é garantida, não é estimativa (Requisitos 3.5):**
- **Não** usa `--estimado` nem o rótulo "estimado" — usa o rótulo "Receita padrão", **sem cor de destaque**: rótulo em `text-muted-foreground` e valor na cor padrão do texto, o mesmo tratamento neutro de uma linha de lançamento comum. (Revisão pós-implementação, a pedido do usuário: a primeira versão usava a cor `--entrada` do bloco, mas isso dava mais destaque do que o dado pedia — é dinheiro garantido, não precisa chamar mais atenção que um lançamento real.)
- Na Visão mensal, entra como uma **linha própria antes** dos lançamentos reais do bloco, com **borda sólida** (`border-b`, não tracejada) — a receita padrão é a base sobre a qual as entradas pontuais somam, não um adendo incerto ao final.
- No card de resumo, o subtexto inverte a ordem: `R$ 400 receita padrão + R$ 800` — a parte garantida lidera, sem a palavra "real" no valor restante (mesma revisão da despesa, acima).

Ambos os casos continuam nunca somando ao total silenciosamente, sem indicação — a diferença é só entre "isto pode não se confirmar" (estimado, despesa) e "isto é dinheiro real, só que ainda não é um lançamento" (receita padrão, entrada).

### 16.3 Escopo da revisão de contraste

Trocar os tokens não basta: cada elemento precisa ser verificado sobre o novo fundo. A varredura mínima cobre `Button` (todas as variantes), `Input`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Table`, `Card`, `Skeleton`, os quatro blocos da Visão mensal, a pílula do seletor de período e os badges de parcela/recorrência/investimento.

Alvo: **WCAG AA** (4.5:1 para texto normal, 3:1 para texto grande e elementos de interface). O `Skeleton` merece atenção específica — no claro ele é um cinza sutil sobre branco, e a transposição ingênua tende a sumir no fundo escuro.

O precedente de por que isso importa: `--destructive-foreground` nunca foi definido no tema, e o resultado foi texto preto sobre botão vermelho em toda a aplicação — um bug que passou despercebido por várias tasks.

## 17. Endurecimento de segurança

Resolve os achados da revisão de segurança conduzida ao final da fase de Design. Complementa a seção 9.

### 17.1 O achado que originou esta seção

Três decisões isoladamente defensáveis se combinavam num vazamento completo:

1. `middleware.js` excluía `cadastro` do matcher — rota pública por design.
2. `criarUsuario` não exigia sessão, convite nem allowlist.
3. Nenhuma query de leitura filtra por `usuarioId` (decisão consciente da spec-01 §2).

Com a aplicação publicada, qualquer pessoa que descobrisse a URL criava uma conta e obtinha leitura **e escrita** sobre todos os dados financeiros da família. Nenhum dos três itens é um bug em si — o vazamento nasce da interação entre eles, e é por isso que a spec-01 §2 agora declara cadastro fechado e compartilhamento total como regras inseparáveis.

### 17.2 Gestão de usuários pelo administrador

A rota `/cadastro`, a página e a Server Action `criarUsuario` pública são **removidas**. O middleware passa a excluir apenas `/login` e os assets do Next. A criação de usuários volta em seguida, mas restrita a um administrador.

**Consequência colateral positiva:** a enumeração de usuários (o formulário respondia "já existe um usuário com este email") desaparece junto com o formulário público.

#### Identificação do administrador

Campo `ehAdmin` no model `Usuario` (seção 3), propagado para a sessão pelos callbacks do NextAuth — o `jwt` copia o campo para o token, e o `session` o expõe em `session.user.ehAdmin`.

**Bootstrap sem acesso manual ao banco:** a migration que cria a coluna inclui um passo de dados marcando **o usuário mais antigo** (`ORDER BY "criadoEm" ASC LIMIT 1`) como administrador. Em produção, esse é o usuário que criou a aplicação. Isso evita depender de um `UPDATE` manual no console do provedor — decisão coerente com a de não expor credenciais de produção à máquina local (ver 17.6 sobre o risco de `prisma migrate deploy` disparar contra o banco errado).

Descartou-se a alternativa de identificar o admin por variável de ambiente (`ADMIN_EMAIL`): ela dispensaria a migration, mas amarraria a identidade do administrador ao e-mail, que é justamente um campo editável.

#### Aplicação da regra em três camadas

A verificação é feita no servidor, em todas as camadas — esconder o item de menu no cliente **não é proteção**, já que Server Actions são endpoints HTTP invocáveis diretamente:

1. **Middleware** — `/usuarios` exige `token.ehAdmin`, via callback `authorized` do `withAuth`.
2. **Server Component** — a página verifica a sessão antes de renderizar e redireciona quem não for admin.
3. **Server Action** — um helper `exigirAdmin()` abre `criarUsuario` e `editarUsuario`, devolvendo erro sem executar nada.

A camada 3 é a que realmente protege; as duas primeiras existem para dar a resposta certa ao usuário e reduzir superfície.

#### Operações e travas

| Operação | Regra |
|---|---|
| Criar usuário | Nome, e-mail e senha. E-mail único, senha com mínimo definido, hash bcrypt custo 10 — o mesmo do login |
| Editar usuário | Nome e senha de qualquer usuário |
| Editar o próprio e-mail | **Bloqueado** |
| Remover o próprio `ehAdmin` | **Bloqueado** |
| Apagar usuário | **Não existe** — `Transacao.usuarioId` e `Conta.usuarioId` referenciam `Usuario`, e apagar quem já lançou algo violaria a chave estrangeira. Revogar acesso é trocar a senha, o que preserva a autoria dos lançamentos |

As duas travas de auto-bloqueio existem porque não há caminho de volta: um administrador que se rebaixe ou perca o próprio e-mail ficaria sem nenhuma forma de recuperar o acesso pela aplicação.

#### Aviso na interface

A tela concede acesso irrestrito às finanças da família — qualquer usuário criado ali lê e edita tudo (spec-01 §2). Isso deve estar **escrito na tela**, antes do formulário, e não subentendido. É um requisito de segurança, não de UX: evita que a decisão seja tomada sem consciência do alcance meses depois.

### 17.3 Limitação de taxa no login

O `authorize` do Credentials Provider passa a rejeitar tentativas quando um mesmo e-mail acumula falhas consecutivas dentro de uma janela de tempo.

**Decisão de implementação:** contador em memória no processo do servidor, não em banco. Justificativa: o volume é de duas pessoas, um contador em memória não adiciona schema nem latência, e o pior caso de um restart da função na Vercel é zerar o contador — o que reduz a proteção, mas não a anula, já que o custo do bcrypt permanece. Persistir em banco seria a escolha correta num app multiusuário real, e fica registrado aqui como o próximo passo caso o app cresça.

Parâmetros sugeridos: **5 tentativas** por e-mail, janela de **15 minutos**. A mensagem de erro devolvida ao usuário **não distingue** "senha errada" de "bloqueado por excesso de tentativas" — evita confirmar a existência da conta.

### 17.4 Integridade de contas com transações vinculadas

`editarConta` hoje permite alterar `tipo`, `diaFechamento` e `diaVencimento` livremente. Como `mesReferencia` das transações já foi calculado a partir desses valores (seção 4), alterá-los **invalida silenciosamente** dados já gravados: uma transação classificada como saída no crédito passa a apontar para uma conta corrente, e a Visão mensal passa a somar errado sem nenhum sinal de erro.

Regra: quando a conta **possui transações vinculadas**, `tipo`, `diaFechamento` e `diaVencimento` ficam **imutáveis**. O nome continua editável. A UI reflete a regra desabilitando os campos e explicando o motivo, em vez de deixar o usuário tentar e receber erro.

Recalcular `mesReferencia` de todas as transações afetadas seria a alternativa mais flexível, mas exigiria reprocessar parcelamentos inteiros — cujas datas efetivas derivam em cadeia umas das outras (seção 5.1) — e foi descartada por desproporcional ao ganho.

### 17.5 Sessão

`session.maxAge` passa a ser declarado explicitamente em `authOptions`, em vez de herdar o padrão de 30 dias do NextAuth. Valor adotado: **7 dias**.

**Limitação conhecida e aceita:** sessões JWT não são revogáveis do lado do servidor. Não existe "sair de todos os dispositivos", e como o app não tem troca de senha, também não há o cenário de invalidar sessões após uma troca. Migrar para sessões em banco resolveria, ao custo de uma tabela e uma consulta por requisição — desproporcional para duas pessoas, e registrado como próximo passo se o app crescer.

### 17.6 Dependências

`npm audit` acusa 2 falhas críticas e 5 altas. Elas **não se resolvem com `npm audit fix --force`**, e há duas armadilhas concretas:

- A correção sugerida para `next-auth` é instalar a **4.24.7 — uma versão anterior** à 4.24.15 em uso. Um downgrade não é correção; a linha corrigida está no Auth.js v5, cuja migração é de porte considerável.
- A correção sugerida para `next` é subir da **14.2.35 para a 15.5.23**, salto de major. O Next 15 torna `searchParams` e `params` assíncronos, o que **quebra `visao-mensal/page.jsx`**, que os lê de forma síncrona. A atualização exige alteração de código, não só de versão.

Entre os avisos do Next há um diretamente relevante para esta arquitetura: *"Unauthenticated disclosure of internal Server Function endpoints"* — o app é inteiramente construído sobre Server Actions.

A task correspondente deve, portanto, **avaliar antes de atualizar**: verificar quais avisos se aplicam a um deploy na Vercel (parte afeta apenas self-hosted), tratar primeiro o que é explorável neste contexto, e tratar o salto de major como trabalho próprio, com QA completo — nunca como um comando automático.

**Avaliação (Task 52):**

Confirmado por inspeção do projeto: sem `rewrites`/`i18n` em `next.config.mjs` (arquivo praticamente vazio), sem runtime Edge em nenhuma rota, sem uso de `next/image` ou `next/script`, sem servidor customizado (deploy padrão da Vercel via `next start`, sem `server.js`). Isso elimina a maior parte dos avisos do `next` por não se aplicarem a este projeto:

| Aviso | Aplica-se aqui? |
|---|---|
| DoS no Image Optimizer via `remotePatterns` | Não — self-hosted only; hospedado na Vercel e sem `next/image` |
| Cache de disco do `next/image` sem limite | Não — mesma razão |
| DoS na API de Image Optimization | Não — mesma razão |
| Contrabando de requisição HTTP em `rewrites` | Não — sem `rewrites` configurado |
| SSRF em `rewrites` via hostname controlado | Não — mesma razão |
| XSS com nonces de CSP no App Router | Não — CSP com nonce não é usado |
| XSS em scripts `beforeInteractive` | Não — `next/script` não é usado |
| SSRF em upgrades de WebSocket | Não — sem uso de WebSocket |
| Bypass de Middleware/Proxy em i18n do Pages Router | Não — App Router puro, sem i18n |
| SSRF em Server Actions em servidores customizados | Não — deploy padrão da Vercel, sem `server.js` |
| Payload de Server Action sem limite no runtime Edge | Não — nenhuma rota roda em Edge |
| DoS via deserialização de requisição HTTP em RSC | **Potencialmente** — a aplicação usa Server Components extensivamente |
| DoS com Server Components (2 avisos) | **Potencialmente** — mesma razão |
| Cache poisoning em redirects de Middleware/Proxy | **Potencialmente** — a aplicação tem middleware de autenticação |
| Cache poisoning por colisão no cache-busting de RSC | **Potencialmente** — uso extensivo de RSC |
| DoS no App Router usando Server Actions | **Potencialmente** — toda mutação da aplicação passa por Server Actions |
| Confusão de cache em requisições com corpo (2 avisos) | **Potencialmente** — Server Actions são requisições POST com corpo |
| Divulgação não autenticada de endpoints internos de Server Function | **Sim, diretamente relevante** — arquitetura inteiramente baseada em Server Actions |

Os itens marcados como relevantes são todos avisos da própria maquinaria de RSC/Server Actions do Next.js — não têm patch isolado disponível na série 14.x; só se resolvem com o salto de major já identificado como fora do escopo desta task.

Para `@auth/core`/`next-auth`: o app usa somente `CredentialsProvider`, sem provider de Email nem OAuth — a falha de normalização de e-mail (usada pelo provider de Magic Link) e a de cookies de state/nonce/PKCE (usada por providers OAuth) **não se aplicam**. O `getToken()` com cabeçalho `Bearer` malformado é uma exceção não capturada que teoricamente poderia derrubar uma requisição ao middleware; os nomes/domínios de cookie usados pelo NextAuth são fixos por configuração, não vêm de input do usuário, o que limita a exploração do problema do pacote `cookie`. Confirmado via `npm view next-auth versions` que **4.24.15 (a versão em uso) é a última da série 4.x** — não existe patch mais novo na mesma major esperando para ser instalado; o único caminho de correção real é a migração para o Auth.js v5.

Para `glob` (via `eslint-config-next`): a vulnerabilidade é na **CLI** do pacote (flags `-c`/`--cmd`), nunca invocada por nós — é dependência de build/lint apenas, nunca executa em produção. Confirmado via `npm view eslint-config-next versions` que não existe uma versão 14.x estável que corrija isso (o changelog pula de `14.2.x` direto para `14.3.0-canary.*` e depois `15.x`); a correção só chega ao acompanhar o Next 15+.

**Conclusão:** nenhum dos oito avisos tem correção segura e isolada disponível dentro da major version atual. Os dois saltos de major (`next` 14→15 e `next-auth` 4→5) ficam registrados como próximos passos dedicados em spec-01 §7, cada um exigindo seu próprio ciclo de QA completo — não algo a ser feito dentro desta task nem via `npm audit fix --force`.

### 17.7 Achados avaliados e conscientemente não tratados

| Achado | Por que não vira task |
|---|---|
| **Ausência de verificação de propriedade** em `editarConta`/`apagarConta` e nas ações de transação | Adicionar checagem por `usuarioId` **contradiria a spec-01 §2**: o modelo familiar exige que qualquer membro edite o que outro lançou. O risco real vinha do cadastro aberto (17.2), não da falta da checagem. Fechado o cadastro, toda sessão autenticada é, por definição, um membro da família |
| **Ausência de auditoria** de alterações | Explicitamente fora de escopo desde a spec-01. `usuarioId` registra a autoria da criação, nunca da edição. Se o app passar a ter mais usuários, isso deve ser reavaliado junto com o isolamento de dados |
| **Política de senha** (mínimo de 6 caracteres, sem complexidade) | Mantida como está na tela de gestão (17.2). Com o cadastro fechado, senhas só são definidas pelo administrador para um grupo de duas pessoas — exigir complexidade protegeria pouco e atrapalharia mais. A limitação de taxa no login (17.3) é a defesa efetiva contra senha fraca |

## 18. Categorias como entidade gerenciável (M25)

Resolve o item 4 revisado e a §3.10 dos Requisitos. Substitui o `enum Categoria` — sete valores cravados no schema e espelhados em `CATEGORIA_LABELS` (`lib/categorias.js`) e numa lista `CATEGORIAS_VALIDAS` duplicada em `lib/actions/transacoes.js` — por uma tabela.

### 18.1 Modelo

```prisma
model Categoria {
  id       String   @id @default(cuid())
  nome     String   @unique
  cor      String   // slug da paleta (§18.4), não um hex livre
  ativa    Boolean  @default(true)
  criadoEm DateTime @default(now())

  transacoes    Transacao[]
  valoresPadrao ValorPadrao[]
}
```

**Sem `usuarioId`, diferente de `Conta` e `ValorPadrao`.** Categoria é uma taxonomia compartilhada, não um dado de alguém. A razão concreta vem da migração: as sete categorias atuais são usadas por transações de **vários usuários**, então não existe dono natural a atribuir — qualquer escolha seria arbitrária e o campo nasceria vestigial. Como a aplicação já não isola dados por usuário (spec-01 §2), `usuarioId` aqui só registraria autoria de criação, informação que ninguém consome.

**`nome` é único** (§3.10): duas categorias homônimas tornariam a escolha ambígua no formulário e no filtro.

**`cor` guarda o slug da paleta**, não o valor hexadecimal. Assim uma eventual revisão de tema (como a do M15) muda a cor em todo lugar de uma vez, em vez de deixar hexadecimais órfãos espalhados pelas linhas do banco.

**Ordenação:** `criadoEm asc`. As sete categorias migradas são semeadas na ordem em que existiam no enum, preservando a posição dos chips em `/lancamento` — o usuário já tem memória muscular dessa ordem, e alfabetar reembaralharia. Categorias novas entram no fim.

### 18.2 Migração de dados — expandir, migrar, contrair

O ponto sensível do marco: produção tem transações reais e `Transacao.categoria` é **obrigatória**. Decisão do usuário: **preservar a categorização do histórico**, mapeando 1:1 (a alternativa cogitada, jogar tudo em "Outros", perderia o filtro por categoria para todo o passado).

A troca **não** é feita numa migration só. O `build` roda `prisma migrate deploy` **antes** de a nova versão entrar no ar, então uma migration que já removesse a coluna antiga deixaria o código em produção — ainda o antigo — consultando uma coluna inexistente até o deploy concluir. Pior: se o `next build` falhasse depois da migration, produção ficaria com código velho sobre schema novo. O caminho é o padrão *expand/contract*, em três deploys independentes:

1. **Expandir (Task 90):** cria `Categoria`, semeia as sete linhas, adiciona `categoriaId` **anulável** em `Transacao` e `ValorPadrao` e preenche por correspondência com o enum. Puramente aditivo — o código antigo continua funcionando, porque a coluna `categoria` segue intacta e continua sendo a fonte da verdade.
2. **Migrar (Tasks 91–93):** a tela nova nasce e as telas existentes passam a ler e gravar `categoriaId`. As duas colunas convivem; a antiga vira apenas resquício.
3. **Contrair (Task 94):** `categoriaId` vira obrigatório em `Transacao`, e a coluna `categoria` e o `enum Categoria` são removidos.

O backfill é uma correspondência direta entre o valor do enum e o nome semeado (`MERCADO` → "Mercado" e assim por diante), sem ambiguidade nem linha órfã possível: o enum garante que todo valor existente está na lista das sete.

### 18.3 Regras de uso

- **Desativar** (`ativa = false`) tira a categoria da oferta em novos lançamentos e valores padrão, sem afetar o que já existe. As consultas que **alimentam formulários** filtram por `ativa`; as que **exibem ou filtram histórico** (coluna e filtro de `/transacoes`, detalhe diário da Visão mensal) não filtram — esconder uma categoria inativa ali tornaria o histórico inconsultável.
- **Exceção do formulário de edição:** ao editar uma transação cuja categoria já está inativa, essa categoria continua selecionável. Sem isso, salvar uma edição de valor forçaria trocar a categoria junto — efeito colateral que o usuário não pediu.
- **Excluir** exige zero uso: nenhuma `Transacao` e nenhum `ValorPadrao` apontando para a categoria. A verificação é feita na Server Action, e a foreign key no banco é a garantia final. A mensagem de erro precisa dizer **quantos** lançamentos impedem e sugerir desativar — um "não é possível excluir" seco deixaria o usuário sem saída.

### 18.4 Paleta de cores

Decisão do usuário: paleta fixa, não seletor livre. Cor arbitrária sobre `--background` (`#131316`) produz combinações ilegíveis, e o M15 justamente trouxe todas as cores da aplicação para o sistema de tokens — um hexadecimal livre por categoria abriria de novo o buraco que aquele marco fechou.

A paleta reaproveita os tokens semânticos que já existem (`--entrada`, `--investimento`, `--saida-debito`, `--saida-credito`) e acrescenta o que faltar para chegar a cerca de dez opções distinguíveis entre si, todas na família `-400` do Tailwind — a mesma escolha do §16.1, calibrada para contrastar com fundo escuro. Cada cor entra como token `--categoria-<slug>`, e é o `<slug>` que vai para o banco.

A cor aparece como **marcador** (ponto ou pílula) ao lado do nome da categoria: na listagem de `/categorias`, na coluna Categoria de `/transacoes` e no detalhe diário da Visão mensal. **Não** é usada como fundo de texto longo nem como única portadora de informação — o nome está sempre junto, o que mantém a leitura possível para daltônicos e em impressão (mesmo princípio do §16.2).

### 18.5 Tela `/categorias`

Entra no agrupamento de navegação de Contas e Valores padrão (§8.1). Estrutura segue o padrão já estabelecido por `/contas` e `/valores-padrao`: listagem em `Card`, formulário de criação inline, edição e exclusão por linha, Server Actions em `lib/actions/categorias.js` com `revalidatePath` para `/categorias` e para **todas as telas que exibem categoria** — `/lancamento`, `/transacoes`, `/visao-mensal` e `/valores-padrao`. Omitir alguma reproduz o bug de cache já ocorrido com contas (§8.5).

## 20. Detalhamento de investimentos (M29)

Resolve Requisitos §3.13. Validado com o usuário por duas rodadas de mock antes desta seção.

### 20.1 Schema

Quatro enums e um modelo. Os enums são do **domínio**, não da apresentação — os rótulos exibidos vivem num mapa em `lib/`, no mesmo padrão de `TIPO_CONTA_LABELS`.

```prisma
enum MercadoAtivo   { RENDA_FIXA }
enum EstrategiaAtivo { POS_FIXADO PRE_FIXADO INFLACAO }
enum ProdutoAtivo   { CDB LCA LCI TESOURO_DIRETO }

enum IndexadorAtivo {
  PERCENTUAL_CDI    // %CDI        — pós-fixado
  PERCENTUAL_SELIC  // %Selic      — pós-fixado
  CDI_MAIS          // CDI+        — pós-fixado
  SELIC_MAIS        // Selic+      — pós-fixado
  PREFIXADO         // % fixo a.a. — pré-fixado
  IPCA_MAIS         // IPCA+       — inflação
}

enum NaturezaMovimento { CREDITO DEBITO }
enum MotivoMovimento  { CUPOM TAXA CORRETAGEM AJUSTE }

model Ativo {
  id        String  @id @default(cuid())
  usuarioId String
  usuario   Usuario @relation(fields: [usuarioId], references: [id])

  // Sempre uma conta de tipo CONTA_INVESTIMENTO — a regra é da aplicação,
  // como já acontece com contaInvestimentoId em Transacao.
  contaId String
  conta   Conta  @relation("AtivosDaConta", fields: [contaId], references: [id])

  mercado    MercadoAtivo    @default(RENDA_FIXA)
  estrategia EstrategiaAtivo
  produto    ProdutoAtivo
  emissor    String
  indexador  IndexadorAtivo
  taxa       Decimal // sentido definido pelo indexador — ver Requisitos §3.13.2

  dataAquisicao  DateTime
  valorAquisicao Decimal
  vencimento     DateTime

  criadoEm DateTime @default(now())

  liquidacoes LiquidacaoAtivo[]

  @@index([usuarioId])
  @@index([contaId])
  @@index([vencimento])
}

// Dinheiro que entra ou sai do caixa da corretora sem envolver posição nem
// conta corrente: cupom, taxa de custódia, corretagem (Requisitos §3.13.3).
// Sempre da CONTA, nunca de um ativo — decisão do usuário: no M29 um vínculo
// com posição seria gravado e nunca lido.
// Liquidação é evento, não coluna. Total = remanescente zero.
model LiquidacaoAtivo {
  id      String @id @default(cuid())
  ativoId String
  ativo   Ativo  @relation(fields: [ativoId], references: [id], onDelete: Cascade)

  data              DateTime
  valorRecebido     Decimal // líquido de IR e IOF, retidos na fonte
  valorRemanescente Decimal // zero = posição fechada

  criadoEm DateTime @default(now())

  @@index([ativoId])
}

model MovimentoInvestimento {
  id        String  @id @default(cuid())
  usuarioId String
  usuario   Usuario @relation(fields: [usuarioId], references: [id])

  contaId String
  conta   Conta  @relation("MovimentosDaConta", fields: [contaId], references: [id])

  // natureza dá o sinal na soma; motivo apenas descreve. Separados de
  // propósito: um motivo novo não multiplica as opções.
  natureza NaturezaMovimento
  motivo   MotivoMovimento

  data      DateTime
  valor     Decimal // sempre positivo; o sinal vem da natureza
  descricao String?

  criadoEm DateTime @default(now())

  @@index([usuarioId])
  @@index([contaId])
}
```

**Por que liquidação é tabela, e por que ela guarda o remanescente.** Duas colunas em `Ativo` só suportam uma liquidação total. Com resgate parcial, `valorAquisicao × fator(dataAquisicao → hoje)` deixa de valer: a base encolheu e o trecho seguinte começa noutra data. Como o produtório dos fatores diários é **multiplicativo** — `fator(t0→t2) = fator(t0→t1) × fator(t1→t2)` —, quebrar o intervalo no dia do resgate é exato, e a posição passa a valer `valorRemanescente × fator(data do evento → hoje)`. O caso sem nenhum evento cai na mesma fórmula, com a aquisição como "último evento": não são dois caminhos de código.

O remanescente é **guardado, não derivado**. Derivar exigiria que o nosso cálculo do trecho anterior batesse com o da corretora, incluindo arredondamento, e que soubéssemos o valor **bruto** retirado (guardamos o líquido, que é o que caiu na conta). Guardado, ele é um fato lido do extrato e **reancora** a conta a cada evento, sem acumular erro entre trechos — mesmo princípio já adotado para o valor recebido.

`LiquidacaoAtivo` **não tem `usuarioId`**, diferente das tabelas irmãs: aqui ele seria derivável do ativo, e duplicar abriria a chance de uma liquidação com dono diferente do da posição. E **não há flag de "liquidado" em `Ativo`** — seria dado derivado, exatamente o que esta seção evita. Uma posição está viva quando não tem liquidação alguma, ou quando a última tem remanescente maior que zero.

**Por que não existe coluna de saldo.** Nem `saldoEmConta` nem `saldoInvestido` são persistidos: os dois são **derivados** dos movimentos, pela mesma razão que a Visão mensal nunca guardou totais — um saldo materializado passa a ser uma segunda fonte de verdade, e diverge no primeiro `apagarTransacao` que esquecer de atualizá-lo.

**Por que os movimentos não reaproveitam `Transacao`.** A pergunta é legítima — seria uma tabela a menos. Mas toda `Transacao` com `mesReferencia` entra em `comporMes`: um cupom viraria receita e uma taxa de custódia, saída no débito, mudando o Disponível de um mês por dinheiro que ninguém pode gastar. Evitar isso exigiria um filtro novo em **seis** pontos de leitura (`comporMes`, as três buscas de `lib/consolidacao.js`, `/transacoes` e a Projeção) que ninguém pode esquecer — e o M27 mostrou o preço disso. Some-se que `categoriaId` é obrigatório com FK `Restrict` (que categoria é uma taxa da B3? e, pela regra de "não exclui categoria em uso", a categoria inventada ficaria indeletável), que `mesReferencia`/`anoReferencia` são obrigatórios e sem sentido aqui, e que `validarTransacao` **já recusa** `contaId` de uma conta de investimento — trava que existe justamente para manter essa semântica.

O critério que separa os dois casos: **isso muda quanto a família pode gastar neste mês?** Aporte e resgate, sim. Registro de ativo, liquidação e movimento avulso, não.

**O contra assumido:** passa a haver mais de um lugar onde "dinheiro se moveu", então o futuro extrato por conta terá que unir três fontes. É trabalho de leitura, não risco de correção.

**Por que registro de ativo e liquidação não geram `Transacao`.** São movimentos internos da corretora (Requisitos §3.13.1). Modelá-los como transação os faria aparecer em `/transacoes` e entrar em `comporMes`, contaminando Entradas/Saídas de um mês em que nada saiu do bolso do usuário. O registro é a própria linha de `Ativo`; a liquidação é uma linha de `LiquidacaoAtivo`.

### 20.2 Cálculo dos saldos

Módulo novo `lib/investimentos.js`, puro (sem `db`), porque é consumido por Client Component:

```javascript
saldoInvestido(conta) = Σ base atual de cada posição viva da conta
                        // base atual = valorRemanescente do ÚLTIMO evento de
                        // liquidação, ou valorAquisicao se não houve nenhum.
                        // Viva = sem evento, ou último evento com remanescente > 0.

saldoEmConta(conta)   = Σ aportes            // Transacao SAIDA  + ehInvestimento + contaInvestimentoId
                      − Σ resgates           // Transacao ENTRADA + ehInvestimento + contaInvestimentoId
                      − Σ valorAquisicao     // TODOS os ativos da conta, inclusive liquidados
                      + Σ valorRecebido      // de todos os eventos de liquidação
                      + Σ movimentos CREDITO // cupom, ajuste
                      − Σ movimentos DEBITO  // taxa, corretagem, ajuste

patrimonio            = Σ (saldoEmConta + saldoInvestido) de todas as contas de investimento
```

**Onde a soma roda.** No Postgres, via `groupBy`/`aggregate` — **uma linha por conta**, não o histórico carregado na aplicação. O custo não cresce com o histórico do jeito que a fórmula sugere: é um `SUM` sobre índice, e o volume realista são algumas dezenas de linhas por ano por conta. Registrado porque a leitura ingênua da fórmula assusta, e a preocupação é legítima — a resposta é *onde* ela roda.

**A saída documentada, se a dor aparecer:** fechamento periódico (saldo de abertura por conta, por período), que torna o trabalho limitado sem abandonar a derivação. Cabe por baixo **sem mudar a assinatura de leitura** — `saldoEmConta(conta)` continua sendo `saldoEmConta(conta)`. É por isso que derivar agora é a escolha reversível: sair de uma coluna materializada que já divergiu exigiria reconciliar dado real.

**Por que não materializar, como fazem as fintechs.** Elas materializam saldo e funciona — mas funciona porque o razão é **imutável**: erro vira estorno, nunca `UPDATE` nem `DELETE`, e só existe um caminho de escrita. Este app faz o oposto por decisão explícita (Requisitos §3, item 3: qualquer transação pode ser editada ou apagada livremente), com `editarTransacao` (inclusive propagando para parcelas), `apagarTransacao` e as actions de consolidação criando e apagando lançamentos. Materializar aqui herdaria o risco da técnica sem herdar a proteção que a torna segura.

Duas sutilezas que a fórmula esconde:

- **A aquisição debita para sempre.** O `− Σ valorAquisicao` percorre inclusive os ativos já liquidados: o dinheiro saiu do caixa no dia da aquisição e voltou pelos eventos de liquidação, possivelmente com valor diferente. Somar só os vivos faria o caixa reaparecer sozinho na liquidação.
- **Ativo vencido e não liquidado continua em `saldoInvestido`** (Requisitos §3.13.2) — o que tira a posição do saldo é o remanescente ter chegado a zero, não o vencimento ter passado.

**Agrupamento:** uma função recebe os ativos vivos e a chave (`estrategia` ou `mercado`) e devolve os grupos, cada um com seu total e as contas dentro. Não há duas implementações por visão — é a mesma função com chave diferente, no espírito do que `agruparPorCartao` já faz na Visão mensal.

**Percentual do grupo** = total bruto do grupo ÷ patrimônio. O saldo parado entra como um **card próprio ao final**, e é ele que fecha os 100% (Requisitos §3.13.4).

Esse card **não sai de `agruparPor`**: ele não é um grupo de posições, e a função continua devolvendo só os grupos de ativos. Quem monta a lista da tela acrescenta a linha do parado ao final — mantém a função pura com uma responsabilidade só, e evita um "grupo" fantasma sem `contas` dentro que todo consumidor teria que tratar como caso especial.

### 20.3 Estrutura da tela

Rota `/investimentos`, Server Component lendo os dados e passando a um Client Component — mesmo desenho de `/visao-mensal` e `/projecao`. `Decimal` do Prisma convertido para número na fronteira, como já se faz nas outras duas.

**Resumo.** Um `Card` com layout divergente por breakpoint: `flex-row` com o divisor de 1px a partir de `md`, `flex-col` sem divisor abaixo dele. A quebra é por classe, **não** por medição — o requisito é "sempre duas linhas no mobile", independente do tamanho dos números.

**Card "Disponível para investir".** Uma linha por conta de investimento, com saldo parado e as duas ações. Fica **entre** o resumo e o detalhamento, e existe porque registrar e resgatar são operações **por conta**, enquanto o detalhamento agrupa por estratégia — o raciocínio completo está em Requisitos §3.13.3.

**Registrar movimento** entra por um `DropdownMenu` na linha da conta, dentro do card "Disponível para investir" — o componente já está instalado e em uso no menu do usuário, então não entra dependência nova. As duas ações frequentes (registrar, resgatar) ficam visíveis e o menu guarda a rara: cupom e taxa acontecem duas vezes por ano por posição, então precisam ser **acháveis**, não rápidas de alcançar. O formulário nasce com a conta já escolhida, e o motivo é filtrado pela natureza — mesmo padrão de restrição que a estratégia faz sobre o indexador.

**Detalhamento.** Abre com um `<h2>` "Carteira" (Requisitos §3.13.4), reaproveitando o token de título de seção já usado em `visao-mensal-client.jsx` — `text-sm font-semibold uppercase tracking-wide`. Fica **acima** da alternância e dentro do mesmo `flex flex-col gap-4`, para a borda inferior das abas seguir atravessando a largura toda. No estado sem nenhuma posição o título não aparece: a mensagem de vazio já explica o bloco sozinha.

Alternância "Por estratégia" / "Por mercado" com o mesmo par de `<button role="tab">` construído à mão já usado em Saídas no crédito (§8.3.16) — sem puxar `@radix-ui/react-tabs` para uma escolha binária. Estratégia é o padrão.

Cada grupo é um card recolhível no mesmo padrão de `CabecalhoBloco` e de `GrupoCartao`: a linha inteira é o gatilho, com `aria-expanded` e um `ChevronDown` que gira. Recolhido por padrão.

**O card de saldo parado é a exceção**: mesmo cabeçalho, mas sem gatilho e sem `ChevronDown` — não é um `<button>`, é uma linha estática. A ausência do chevron é o que comunica que ali não há o que abrir, sem precisar de rótulo explicando.

Ele repete um número que o card "Disponível para investir" já mostra, agora somado em vez de por conta. Não é descuido: lá o parado é **acionável** (de qual conta eu invisto), aqui ele é **composição** (quanto da carteira não está alocado). São duas perguntas diferentes sobre o mesmo valor.

**Posição vencida:** `vencimento < hoje && dataLiquidacao == null`. Ganha fundo destacado, marcação "Vencido" e o botão de liquidar na própria linha. A comparação é por **dia**, não por instante — um título que vence hoje só conta como vencido amanhã.

### 20.4 Server Actions

Em `lib/actions/investimentos.js`, seguindo o padrão das demais (sessão, validação, `revalidatePath`):

- `registrarAtivo(dados)` — valida que a conta é `CONTA_INVESTIMENTO`, que o indexador pertence à estratégia, e que `valorAquisicao <= saldoEmConta` da conta. Cria o `Ativo`.
- `liquidarAtivo(id, { data, valor })` — valida que a posição existe e ainda está viva; cria um `LiquidacaoAtivo` com `valorRemanescente = 0` (no M29 toda liquidação é total).
- `apagarAtivo(id)` — desfaz um cadastro errado, devolvendo o valor ao saldo em conta por consequência da fórmula.
- `registrarMovimento(dados)` — valida a conta, que o motivo pertence à natureza, e que um débito não excede o saldo em conta.
- `apagarMovimento(id)` — desfaz um registro errado.

Todas revalidam `/investimentos`. **Nenhuma revalida `/visao-mensal` ou `/transacoes`** — registro de ativo e liquidação não tocam em transação nenhuma, e revalidar essas rotas sugeriria o contrário.

**A trava de saldo é da Server Action, não do banco.** O saldo é derivado, então não existe constraint que o expresse — mesma situação da regra "não exclui categoria em uso" (§18.3), checada na action com a FK como garantia final.

### 20.7 Data futura recusada nas operações de investimento

Requisitos §3.13.5. **Origem:** um aporte datado do dia seguinte já somava no saldo parado de hoje.

**Onde a trava entra — seis pontos, não cinco.** As cinco Server Actions de investimento, mais `validarTransacao`:

| Ação | Campo | Arquivo |
|---|---|---|
| `aportar` / `resgatar` | `data` | `lib/actions/investimentos.js` (via `validarMovimentacao`) |
| `registrarAtivo` | `dataAquisicao` | idem (via `validar`) |
| `liquidarAtivo` | `data` | idem |
| `registrarMovimento` | `data` | idem |
| edição de um aporte/resgate | `dataCompra` | `lib/actions/transacoes.js`, **só quando `ehInvestimento`** |

O sexto é o que fecha o vazamento: sem ele, editar a data de um aporte existente em `/transacoes` recolocaria o valor no futuro, e a regra seria contornável por uma porta lateral. **Transação comum continua aceitando data futura** — a Projeção depende disso.

**O corte é o fim do dia corrente**, não `new Date()`. Um lançamento com a data de hoje é o caso normal e não pode ser recusado por causa da hora.

```js
// lib/datas.js
export function ehFutura(data) {
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);
  return data > fimDeHoje;
}
```

Vive em `lib/datas.js`, junto de `paraDataLocal`, e é **pura** — testável sem banco, ao contrário das Server Actions que a usam. É o mesmo desenho de `lib/estorno.js` e `lib/disponivel.js`.

**Nenhuma leitura muda.** Os cálculos de `page.jsx` e `saldoParadoDe` continuam somando tudo, sem filtro de data — porque, com a trava, não existe mais nada no futuro para filtrar. Filtrar na leitura *e* travar na escrita seria redundante, e a redundância aqui esconde qual das duas está de fato valendo.

**`max` no input, além da trava no servidor.** Os mesmos seis campos recebem `max={hojeISO()}`: o calendário nativo cinza as datas posteriores, e como todos os formulários são `<form onSubmit>` com `required`, o navegador recusa o submit antes de a Server Action ser chamada. É **camada de UX, não garantia** — não impede valor programático —, então não substitui a validação no servidor; soma-se a ela, no mesmo desenho de `resolverCategoria`, onde a regra vive na action e não na coluna.

Duas exceções que, se esquecidas, quebram funcionalidade existente:

- **`vencimento` NÃO recebe `max`.** Em `registrar-ativo.jsx` ele fica logo abaixo de "Data de aquisição", no mesmo bloco, e é a data de vencimento do título — precisa ser futura. Travá-lo inutilizaria o cadastro. (O que ele pediria é um `min`; fora do escopo desta task.)
- **Em `/transacoes` o `max` é condicional a `form.ehInvestimento`.** O campo de data é o mesmo para transação comum e para aporte; aplicá-lo sempre tiraria a capacidade de agendar uma despesa, que a Projeção usa.

### 20.6 Resgate volta a ter conta de origem

Resolve Requisitos §3.13.7. A Task 86 tirou da tela de lançamento a capacidade de vincular uma entrada a uma conta de investimento; sem ela o saldo em conta da corretora **só cresce**, porque nada o debita do lado do resgate.

**Volta como marcação, não como quarto Tipo.** O toggle de Tipo já estourava a largura a 390px com três opções (Task 89, §8.2.4) — uma quarta reabriria aquele problema. E resgate é raro, ao contrário do aporte, que ganhou Tipo próprio justamente por ser frequente e por a marcação secundária passar despercebida.

A marcação aparece **só com Tipo = Entrada e Meio = Débito**: entrada no crédito é estorno (§3.11), que nunca é resgate. Marcar revela os chips de conta de origem, e desmarcar limpa a conta — a combinação "marcado sem conta" é recusada pela Server Action, que já exigia `contaInvestimentoId` quando `ehInvestimento` é verdadeiro.

**Nenhuma Server Action muda.** `validarTransacao` já aceita `ehInvestimento` numa `ENTRADA`: exige conta corrente como conta principal e uma conta de investimento vinculada. O que o M29 faz é reabrir a superfície de uso.

### 20.5 Navegação com rótulos por breakpoint

`GRUPO_DADOS` ganha um quarto destino e cada item passa a ter **dois rótulos**: `label` (desktop, usado na barra lateral) e `labelCurto` (mobile, usado em `AbasDados`). Só "Visão mensal" e "Investimentos" divergem — "Transações" e "Projeção" repetem o mesmo texto nos dois campos, em vez de um `labelCurto` opcional com fallback: dois campos sempre presentes tornam a tabela de rótulos legível de uma olhada.

`AbasDados` passa de `flex-1` com texto para uma coluna de ícone + rótulo em `text-[11px]`, mantendo o `flex-1`. O ícone vem do mesmo `Icone` que a barra lateral já usa, então não há uma segunda fonte de ícones a manter.

## 19. Instalação como app na tela inicial (PWA — M26)

Resolve o requisito de instalabilidade da spec-01 §4. Escopo deliberadamente restrito ao **app instalável**: sem service worker, sem cache de dados, sem push.

**Service worker não é requisito de instalação** — a especificação exige manifest, ícones, `start_url`, `display` e origem HTTPS; o service worker só entra quando se quer comportamento offline, que aqui está fora de escopo por decisão do usuário. Ou seja, o que este marco entrega é um PWA instalável completo, não uma versão pela metade.

### 19.1 O alvo é WebKit, não Chromium

O uso é **só em iPhone**. Todo navegador no iOS — inclusive o Chrome — é obrigado a usar WebKit, então o comportamento é o do Safari em qualquer um deles. Consequências que mudam o desenho:

- **Não existe prompt automático de instalação.** `beforeinstallprompt` é de Chromium e nunca dispara no iOS. A instalação é sempre manual: Compartilhar → Adicionar à Tela de Início. Não há o que implementar para "oferecer" a instalação; no máximo, instruir.
- **iOS ignora o campo `icons` do manifest** para o ícone da tela inicial e usa exclusivamente `<link rel="apple-touch-icon">`, 180×180. Sem essa tag, o ícone sai em branco ou como um recorte da página. Os `icons` do manifest continuam declarados (padrão da spec, e servem ao desktop), mas **não** são o que o iPhone lê.
- **O ícone precisa ser opaco.** iOS compõe **fundo branco** sob qualquer transparência — num app de tema escuro, um PNG com fundo transparente ganharia uma moldura branca. O ícone traz o próprio fundo, na cor do tema.
- Instalar pelo Chrome no iOS funciona a partir do iOS 16.4/17, pelo mesmo menu Compartilhar.

### 19.2 Manifest e metadados

`app/manifest.js` (rota de metadados do Next 14, que serve `/manifest.webmanifest`), com `name: "Pode Comprá?"`, `short_name: "Pó Comprá?"`, `start_url`, `display: "standalone"`, `background_color` e `theme_color` alinhados aos tokens do tema escuro (§16.1), mais os `icons` de 192 e 512.

**Os ícones vêm de uma arte única** (`icone-fonte.png`, na raiz), processada por `scripts/gera-icones.mjs`: troca do fundo quase preto original pelo `#1B1B1F` dos cards, recorte centrado no conteúdo (as cédulas puxam o eixo à esquerda, então centralizar pela imagem entortaria o personagem) elevando a ocupação de 70,7% para 80%, e redução por halving sucessivo — reduzir de 1108 para 180 num passo só serrilha a linha do contorno. O script fica versionado para que os PNGs não sejam binários sem procedência.

**`apple-mobile-web-app-status-bar-style` fica em `black`, não `black-translucent`.** O translúcido faz o conteúdo passar por baixo da barra de status, o que exige o tratamento de área segura da §19.4 — trocar antes disso colocaria o cabeçalho sob o relógio. Reavaliar na Task 96.

No `layout.jsx`, além do `<link rel="manifest">` que o Next injeta a partir do arquivo acima:

- `apple-touch-icon` (180×180, opaco) — o que o iOS de fato usa;
- `apple-mobile-web-app-capable` e `apple-mobile-web-app-status-bar-style` — o caminho legado da Apple para modo standalone e cor da barra de status. Declarados **junto** com o `display: "standalone"` do manifest, não no lugar dele: as versões de iOS em uso divergem em qual dos dois respeitam, e manter os dois é defensivo e sem custo;
- `theme-color` correspondente ao fundo da aplicação.

### 19.3 A armadilha do middleware

`middleware.js` protege tudo que não esteja explicitamente liberado — hoje `api/auth`, `login`, `_next/static`, `_next/image` e `favicon.ico`. **O manifest e os ícones caem nessa rede**: o navegador pediria `/manifest.webmanifest`, receberia um redirecionamento para `/login` com corpo HTML, e a instalação falharia **em silêncio**, sem erro visível.

O matcher precisa liberar `manifest.webmanifest`, `icon-*`, `apple-touch-icon*` — e a liberação é segura: são arquivos estáticos sem dado algum do usuário.

### 19.4 Área segura em modo standalone

Instalado, o app ocupa a tela inteira, **inclusive sob a barra de status e sob o indicador de home** — a moldura do navegador, que hoje reserva esse espaço, deixa de existir. A navegação mobile atual usa `fixed inset-x-0 top-0` (cabeçalho) e `fixed inset-x-0 bottom-0` (barra inferior, §15.3): sem tratamento, o cabeçalho fica parcialmente sob o relógio e a barra inferior sob o indicador de home, que é justamente onde ficam os alvos de toque mais usados.

A correção é `viewport-fit=cover` no viewport mais `env(safe-area-inset-*)` no preenchimento desses dois elementos fixos. É um problema que **só se manifesta depois de instalado** — não aparece testando no navegador.

### 19.5 O que dá para verificar e o que não dá

Verificável por asserção, sem o aparelho: o manifest responde `200` com `Content-Type` de manifest (e **não** um redirecionamento para o login), os campos obrigatórios estão presentes, cada ícone declarado existe e tem as dimensões e a opacidade prometidas, e as meta tags do iOS estão no HTML servido.

**Não** verificável aqui: o gesto de Adicionar à Tela de Início, a aparência real do ícone no springboard e o recorte da área segura no aparelho do usuário. Isso depende de um iPhone real e fica como confirmação dele.


---

## 21. Movimentação de investimento concentrada em Investimentos (M34)

Requisitos §3.14. Redistribuição de responsabilidade entre três telas, mais uma migration. **Nenhum cálculo muda** — nem `comporMes`, nem a consolidação, nem a Projeção.

### 21.1 O que sai de onde

| Superfície | Antes | Depois |
|---|---|---|
| `/lancamento` | Tipo "Investimento" (aporte) e checkbox de resgate | Nada. Toggle volta a Entrada/Saída |
| `/transacoes` | Cria (converte) aporte pelo checkbox, edita e apaga | Só edita e apaga |
| `/investimentos` | Registrar ativo, Registrar movimento, Liquidar | Ganha **Aportar** e **Resgatar** |

### 21.2 `categoriaId` opcional

```prisma
categoriaId String?
categoria   Categoria? @relation(fields: [categoriaId], references: [id], onDelete: Restrict)
```

`ValorPadrao.categoriaId` já é opcional desde o M18 — não é padrão novo no schema, é o mesmo aplicado a outra tabela.

**A migration é só de schema.** Nenhum `UPDATE` em linha existente: os dois aportes atuais continuam em "Outros" (Requisitos §3.14.2).

**A regra de obrigatoriedade muda de lugar:** sai da coluna e vai para `validarTransacao`, que passa a exigir categoria **exceto** quando `ehInvestimento` é verdadeiro. O banco deixa de ser a trava, e a Server Action passa a ser — é a mesma inversão que `ValorPadrao` já fez.

**Auditoria dos leitores.** `categoria` nula chega à UI por um caminho real: um **resgate aparece na lista de Entradas** da Visão mensal (§8.3), e o detalhe diário renderiza a categoria de cada linha.

**A leitura já estava protegida** — verificado na Task 117, corrigindo o que esta seção afirmava antes:

- `components/marcador-categoria.jsx` — `CategoriaComCor` já tinha guarda de nulo e já renderizava **travessão** (`—`) em `text-muted-foreground`. Célula vazia leria como dado faltando; travessão lê como "não se aplica". Nada a fazer.
- `components/visao-mensal/detalhe-diario.jsx` e a célula da tabela em `transacoes-client.jsx` passam por `CategoriaComCor` e herdam a guarda.
- O filtro por categoria usa `filterFn: "equals"` sobre `categoriaId`: uma linha nula nunca casa com categoria selecionada, que é o comportamento correto — aporte não deve aparecer ao filtrar por "Alimentação".

**O que de fato faltava** é o modal de edição: `form.categoriaId` já caía para `""` com `?? ""`, então o `<select>` aparecia **em branco** ao editar um aporte, convidando a preencher o que a regra manda deixar nulo. O campo passa a **sumir** quando `form.ehInvestimento` é verdadeiro.

### 21.3 Aportar e Resgatar

Duas Server Actions novas em `lib/actions/investimentos.js`, mas que **gravam `Transacao`** — são as únicas do arquivo que fazem isso, e a exceção é o próprio ponto da §3.14.1.

- `aportar({ contaInvestimentoId, contaCorrenteId, valor, data })` — grava `tipo: "SAIDA"`, `ehInvestimento: true`, `contaId` da conta corrente, `contaInvestimentoId` do destino, `categoriaId: null`.
- `resgatar({ contaInvestimentoId, contaCorrenteId, valor, data })` — grava `tipo: "ENTRADA"`, mesmo par de contas invertido no sentido, `categoriaId: null`. Recusa valor acima do saldo em conta da corretora (`saldoParadoDe`).

**Revalidação:** as duas revalidam `/investimentos`, `/visao-mensal` **e** `/transacoes` — ao contrário de todas as outras ações do arquivo. Elas criam transação, então as três telas mudam. Essa é exatamente a diferença que a §20.4 registra sobre as demais.

`mesReferencia`/`anoReferencia` saem de `calcularReferencia`, como qualquer transação em conta corrente — não há caminho especial.

### 21.4 O card "Contas de investimento"

Mesma `Card` + linha por conta de hoje. Muda o rótulo, os saldos e a hierarquia de ações.

**Dois saldos por linha.** Investido em `--investimento`, parado em `--entrada` — as cores que a tela já usa para os dois conceitos no Resumo. Rótulo curto acima de cada número, no mesmo token do `Rotulo` do card. "Parado em conta" a partir de `sm`, "Parado" abaixo — só onde falta largura.

**Ações.** `Aportar` (variante padrão, é a primária) e `Registrar ativo` (`outline`) visíveis; `DropdownMenu` com `Resgatar` e `Registrar movimento`. O `DropdownMenu` já está montado no componente `RegistrarMovimento` — ganha um item, não uma dependência.

**Mobile.** A linha vira `flex-col`: nome, depois os dois saldos dividindo a largura, depois os botões em linha cheia com o `⋯` fixo à direita. `Registrar ativo` é o rótulo mais longo e é ele que define se cabe. Se não couber a 390px, o plano é **trocar o botão pelo ícone `Plus` com `aria-label`** — nunca abreviar o texto, que vira adivinhação.

**O card passa a repetir o Resumo do topo**, agora por conta em vez de somado. Aceito e registrado: o Resumo é composição do patrimônio, o card é acionável por conta — a mesma justificativa que já separa o parado do Resumo do parado do `CardParado` (§20.3).

### 21.5 O que sai do Lançamento

`TIPOS` volta a duas entradas. Some `ehResgate`, `contaInvestimentoId` do formulário, o filtro `contasInvestimento` e o mapeamento `INVESTIMENTO → SAIDA` de `handleSubmit`. `contasParaSelecao` já excluía conta de investimento e continua como está.

**`validarTransacao` mantém o suporte a `ehInvestimento`** — não é código morto: as ações novas passam por ele, e `/transacoes` continua editando aporte e resgate existentes.

### 21.6 O que sai de Transações

Some o checkbox "É investimento" do modal de edição. O `<select>` de conta de investimento **fica**, condicionado a `transacao.ehInvestimento` em vez de ao estado do checkbox: dá para corrigir a corretora de um aporte existente, mas não dá para transformar uma saída comum em aporte.

O badge "Aporte"/"Resgate" da listagem não muda.
## 22. Parcelamento com controle fundido ao Valor (M35)

Requisitos §3.15. **Mock normativo:** https://claude.ai/code/artifact/a2c1a106-f737-4d78-b041-dfd457e488fe — traz os seis estados, a tabela de medidas e as regras. Consultar antes de escrever CSS: as classes exatas estão lá.

### 22.1 `CampoValor` troca `extra` por `prefixo`

O `extra` de hoje é um **slot absoluto dentro** do campo (`absolute right-1.5 top-1/2`), com `pr-24` no input reservando espaço. Fundir exige o oposto: um irmão flex, não um filho posicionado.

```
<div class="flex h-9 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
  {prefixo}                     ← flex-none, border-r border-input
  <input class="flex-1 min-w-0 border-0 bg-muted focus-visible:ring-0" />
</div>
```

**Três mudanças no componente, e a terceira é a que quebra se esquecida:**

1. `extra` **sai** e `prefixo` entra. `CampoValor` é usado em **9 lugares**, mas **só `/lancamento` passa `extra`** — não há consumidor órfão, então a troca é limpa e não precisa manter os dois.
2. Sem `prefixo`, o componente renderiza **exatamente como hoje** — o `<div>` extra não pode alterar altura, borda ou espaçamento nas outras 8 telas.
3. **O anel de foco muda de dono.** O `Input` traz `focus-visible:ring-1 ring-ring` nele mesmo; fundido, isso desenharia o anel só na metade direita e quebraria a costura. O anel sobe para o contêiner via `focus-within`, e o do input é anulado com `focus-visible:ring-0`. A borda do input também some (`border-0`), senão fica um fio duplo ao lado do divisor.

### 22.2 O dropdown de parcelas

**Não usar `Select` do Radix.** Ele captura o teclado para busca por digitação (typeahead) e trata `Esc` por conta própria — o campo numérico de "Outro" brigaria com o componente. Isso não é hipótese: o QA da Task 112 (M29) já esbarrou no `Esc` do `Select` fechando o `Dialog` inteiro. Usar **`DropdownMenu`**, já instalado e em uso em `menu-da-conta.jsx`.

**Estrutura da lista:** `À vista` · separador · `2x` a `12x` (roláveis, `max-h` ~170px) · separador · `Outro…`.

**O total por opção** vem de `valorCentavos * n`, o mesmo cálculo que a legenda já faz. Com valor zero, a lista mostra só o número de parcelas — evitar `R$ 0,00` repetido onze vezes.

**"Outro…"** troca o conteúdo do menu por um campo numérico com botão de confirmar, sem fechar o dropdown. Ao confirmar, o gatilho passa a exibir `18x`. Voltar ao à vista é reabrir e escolher "À vista", que fica no topo, fora da área rolável — por isso ele está separado do bloco de 2x a 12x.

### 22.3 O que sai e o que fica em `/lancamento`

Saem `BOTAO_PARCELA` e `ajustarParcelas`. `numeroParcelas` no estado, `podeParcelar`, `ehParcelado`, o rótulo alternado e a legenda do total **continuam iguais** — a mudança é de controle, não de regra. Nenhuma Server Action é tocada: `criarTransacaoParcelada` recebe o mesmo `numeroParcelas` de sempre.

---

## 23. Rendimento pós-fixado (M30)

Requisitos §3.16. Primeira chamada externa do projeto.

### 23.1 Duas tabelas, não uma

O levantamento dos seis indexadores (Requisitos §3.16.1) mostrou que o IPCA **não cabe** junto das séries diárias: frequência mensal, valor em % ao mês e quase dois meses de atraso. Uma tabela única exigiria que todo leitor soubesse ramificar pela série antes de interpretar o `valor` — e um produtório escrito distraidamente misturaria % ao dia com % ao mês, errando por ordens de grandeza sem estourar erro nenhum.

**No M30, só a diária existe:**

```prisma
enum SerieDiaria {
  CDI     // SGS 12
  SELIC   // SGS 11
}

model TaxaDiaria {
  serie SerieDiaria
  data  DateTime @db.Date
  valor Decimal  // % ao DIA, exatamente como o BC devolve

  @@id([serie, data])
}
```

**Sem `usuarioId`.** Taxa de mercado é dado público e compartilhado — é a primeira tabela do projeto que não pertence a ninguém. Chave composta em vez de `id` próprio: o par série+data **é** a identidade, e a PK dá de graça a garantia de não duplicar um dia.

`@db.Date` e não `DateTime` cheio: a série tem granularidade de dia, e guardar hora convidaria o bug de fuso que `paraDataLocal` existe para evitar.

**O IPCA ganha a sua no M31**, com a forma já decidida aqui para o marco seguinte não reabrir a discussão:

```prisma
model IndiceMensal {
  serie SerieMensal   // IPCA (SGS 433); IGP-M caberia depois
  mes   DateTime @db.Date  // sempre o dia 1º do mês de referência
  valor Decimal            // % ao MÊS

  @@id([serie, mes])
}
```

O campo se chama `mes`, não `data`: o nome carrega a granularidade, e é o que impede alguém de tratá-lo como dia. **A lógica de sincronização é escrita uma vez** e parametrizada por tabela — o que difere entre as duas é o intervalo pedido e onde grava, não o algoritmo.

**Nota para o M31:** Tesouro IPCA+ no mercado usa VNA com projeção de IPCA-15 para o mês corrente. Aplicar só os meses fechados é aproximação deliberada, e precisa ser decidida explicitamente lá — não herdada em silêncio daqui.

### 23.2 Buscar só o que falta

A janela necessária vai da **aquisição mais antiga entre as posições vivas** até hoje.

Duas bordas, não uma:

```
faltaNoFim    = [max(data guardada) + 1 dia, hoje]
faltaNoComeço = [início necessário, min(data guardada) − 1 dia]
```

Cobrir as duas evita assumir que o que está guardado é contíguo — e é o que acontece de verdade quando uma posição antiga é cadastrada depois de a tabela já ter os dias recentes.

**A ponta é re-perguntada a cada sincronização, e isso é correto.** A série atrasa, então `desejadoAte` (hoje) é quase sempre maior que o último dia guardado — e a única forma de descobrir que hoje foi publicado é perguntar. Medido: a segunda passada pede **um dia só**, não a janela, e leva um 404 imediato. Em produção o cache do `fetch` do Next (`revalidate: 3600`) segura essa chamada por uma hora. Não confundir com rebuscar a janela: o miolo nunca é pedido de novo.

**404 é sucesso com zero linhas.** Um intervalo sem dia útil — um fim de semana, ou "do último dia guardado até hoje" quando não há nada novo — devolve `404` com corpo `{"erro": ...}`. Tratar como erro faria a tela quebrar todo sábado. Qualquer outro status, timeout ou corpo ilegível é falha de verdade: **registra e segue com o que a tabela tem**, nunca propaga exceção para a página.

O parse tem duas armadilhas: a data vem `dd/MM/yyyy` (não ISO) e o valor vem **string** (`"0.051660"`), não número.

### 23.3 O cálculo, e por que ele é puro

`lib/rendimento.js`, sem `db` e sem `fetch` — recebe a lista de taxas já carregada. É o mesmo desenho de `lib/fatura.js` e `lib/investimentos.js`, e é o que permite testar a matemática sem banco nem rede.

**Convenção do mercado (ANBIMA)** para percentual do índice:

```
fator = Π (1 + taxa_do_dia × percentual)
```

Não `(1 + taxa)^percentual`. Medido contra a série real: a diferença entre as duas é de **R$ 0,05 em R$ 10.000 num ano** — irrelevante no valor, mas a primeira é a do mercado e é a que se pode conferir contra o extrato da corretora.

**Spread (CDI+ / Selic+)** é proporcional a 252 dias úteis:

```
fator = Π [ (1 + taxa_do_dia) × (1 + spread)^(1/252) ]
```

**A base é `baseAtual(ativo)`**, não `valorAquisicao` — o remanescente da última liquidação, que já existe desde o M29 e é o que torna o M33 possível sem refazer nada.

**O corte é `min(último dia publicado, vencimento)`** — vencido não rende (Requisitos §3.16.3).

**Dias contados:** os dias úteis com `data >= dataAquisicao` e `data <= corte`.

**A aquisição rende no próprio dia** — corrigido na Task 130, contra o extrato real. A versão original excluía o dia da compra e chamava isso de "aproximação de ±1 dia"; não era aproximação, era erro. Conferido contra a corretora numa posição de 87 dias úteis: com o dia da aquisição incluído o app devolve **R$ 5.251,92** e o extrato diz **R$ 5.251,92** — diferença de zero. Sem ele, R$ 3,04 a menos.

**Conferido contra a corretora em 26/08/2026, duas posições independentes:**

| Posição | Indexador | Dias úteis | App | Extrato |
|---|---|---|---|---|
| CDB Banco Topázio | 107% CDI | 87 | R$ 5.251,92 | R$ 5.251,92 |
| LCI Banco Inter | 87,5% CDI | 46 | R$ 5.106,27 | R$ 5.106,27 |

Produtos diferentes, percentuais diferentes (um acima e outro abaixo de 100%), janelas de tamanhos diferentes, uma tributada e outra isenta. Isso valida em conjunto: a convenção ANBIMA do percentual, o produtório sobre a série 12, e a contagem de dias a partir da aquisição inclusive.

**Terceira conferência, num Tesouro Selic 2031 a Selic + 0,10%:** extrato R$ 10.817,95, app R$ 10.821,40 — 0,03% de diferença, e **não é erro de cálculo**. É a distinção entre curva do papel e marcação a mercado (Requisitos §3.16.6). Ela valida o que dava para validar: a série 11 da Selic com 157 dias úteis de história, o spread `SELIC_MAIS`, e a sincronização estendendo a série **para trás** quando uma aquisição mais antiga aparece — a segunda borda da §23.2, que até então só tinha teste.

**O que segue sem validação:** a ponta do vencimento, e o comportamento de qualquer título do Tesouro cuja marcação a mercado seja relevante (prefixado e IPCA+, no M31).

**A ponta do vencimento continua não verificada.** A convenção de mercado costuma contar da aplicação (inclusive) até o vencimento (exclusive), o que seria `data < vencimento` em vez de `<=`. A diferença só aparece numa posição já vencida, e nenhuma das reais venceu ainda — quando a primeira vencer, vale conferir contra o valor de resgate antes de mudar.

### 23.4 O que muda na tela

O valor corrigido substitui o custo em **quatro lugares** — a coluna de saldo bruto, o total de cada grupo, o investido de cada conta e o patrimônio. Os percentuais passam a ser sobre valores corrigidos.

`saldoEmConta` **não muda**: caixa é caixa, e rendimento não realizado não é caixa. Só `saldoInvestido` passa a somar valor corrigido em vez de `baseAtual`.

**Sem rótulo de data na tela** (Requisitos §3.16.5). Consequência a registrar: CDI e Selic têm atrasos **diferentes entre si** — medido em 26/08, o CDI ia até 25/08 e a Selic até 26/08 —, então duas posições equivalentes em índices diferentes podem estar corrigidas até dias distintos, sem nada na interface indicando isso.

**Nada disso toca `comporMes`, a consolidação ou a Projeção.** Rendimento não realizado não é transação.

---

## 24. Rendimento pré-fixado (M31)

Requisitos §3.17. Sem integração nova.

### 24.1 O fator, e o truque do calendário

```
fator = (1 + taxa) ^ (dias úteis / 252)
```

`fatorAcumulado` ganha um terceiro modo. Os dois existentes consomem os **valores** das taxas; o pré-fixado consome só a **quantidade** — a lista entra como calendário, e os valores são ignorados:

```js
if (prefixado) return (1 + prefixado) ** (taxas.length / DIAS_UTEIS_NO_ANO);
```

Isso mantém `taxasAplicaveis` valendo sem alteração: o recorte por aquisição e vencimento é o mesmo, e é ele que define quantos dias contam. **Um caminho de código a menos** do que ter uma função separada para pré-fixado.

`SERIE_DO_INDEXADOR.PREFIXADO` passa de `null` para `"CDI"`. O nome do campo fica ligeiramente impreciso — ali o CDI não é a fonte da taxa, é a fonte dos dias —, e o comentário no código diz isso, porque é o tipo de coisa que alguém "corrige" de volta para `null` sem entender.

### 24.2 O que isso arrasta

Uma carteira só de pré-fixados passa a sincronizar o CDI. É uma chamada, para contar dias — e sem ela não há como saber quantos dias úteis se passaram.

O pré-fixado herda a defasagem de um dia do CDI. **Isso é desejável:** todas as posições ficam corrigidas até a mesma data, e o patrimônio não mistura números de dias diferentes.

### 24.3 Validação disponível

Ao contrário do IPCA+, o pré-fixado tem posição real para conferir: a **LCA do BTG a 15% a.a.**, isenta de IR — bruto e líquido coincidem, e não há mercado secundário para pessoa física, então curva e mercado também coincidem. É o teste mais limpo possível do M31.
