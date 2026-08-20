# Spec — Tasks: App de Finanças Pessoais (Familiar)

**Fase:** 3/3 — Tasks
**Status:** Rascunho para revisão
**Baseado em:** spec-01-requisitos.md, spec-02-design.md

---

## Como usar este documento

Cada tarefa abaixo é pequena o suficiente para ser implementada e revisada isoladamente. O fluxo recomendado com o Claude Code:

1. Peça uma tarefa por vez, referenciando os três documentos como contexto, ex: *"Implemente a Task 1 de spec-03-tasks.md, usando spec-02-design.md como referência de arquitetura/schema e spec-01-requisitos.md para as regras de negócio."*
2. Revise o resultado (diff, rodando localmente) antes de pedir a próxima.
3. Se algo sair diferente do esperado, corrija a spec (não só o código) antes de seguir — mantém o documento como fonte da verdade.

As tarefas estão agrupadas em marcos (M1–M7); a ordem entre marcos importa (cada um depende do anterior), mas dentro de um marco algumas tarefas podem ser paralelizadas se você preferir.

---

## M1 — Setup do projeto

**Task 1. Inicializar projeto**
Next.js 14+ (App Router, JavaScript, não TypeScript), Tailwind CSS, shadcn/ui. Estrutura de pastas conforme seção 2 do Design.

**Task 2. Banco de dados**
Provisionar Vercel Postgres, configurar Prisma (`npx prisma init`), criar `schema.prisma` com o conteúdo da seção 3 do Design, rodar a primeira migration.

**Task 3. Testes**
Configurar Vitest no projeto (conforme seção 1 do Design — "Testes: por que Vitest").

---

## M2 — Autenticação

**Task 4. NextAuth + Usuario**
Configurar NextAuth.js com Credentials Provider, hash de senha com bcrypt, validando contra o model `Usuario`.

**Task 5. Telas de cadastro e login**
`/cadastro` (nome, email, senha) e `/login` (email, senha).

**Task 6. Middleware de proteção**
Middleware do Next.js protegendo todas as rotas exceto `/login` e `/cadastro`, redirecionando não autenticados.

*(Checkpoint sugerido: critérios de aceite 1 e 8 do spec-01.)*

---

## M3 — Núcleo de negócio (funções puras)

**Task 7. `calcularFatura` + testes**
Implementar conforme seção 4 do Design. Testes cobrindo: vencimento antes/depois do fechamento, rollover de mês e de ano, fechamento em dia inexistente no mês (ex: dia 31 em fevereiro) — usar as tabelas de exemplo do Design como casos de teste.

**Task 8. `gerarParcelas` + testes**
Implementar conforme seção 5 do Design (inclui `ultimoDiaDoMes` e `dataAberturaProximaFatura`). Testes cobrindo: número correto de parcelas, progressão de exatamente 1 mês de referência por parcela, e o caso de borda de fechamento dia 31 caindo em fevereiro (ver tabela de exemplo do Design).

*(Estas duas tarefas são as de maior risco do projeto — revisar com atenção antes de seguir.)*

---

## M4 — Contas

**Task 9. Server actions de Conta**
`criarConta`, `editarConta`, `apagarConta`. Validação: campos de fechamento/vencimento obrigatórios só quando `tipo = CARTAO_CREDITO`.

**Task 10. Tela `/contas`**
Listagem + formulário de criação/edição com campos condicionais por tipo (seção 7 do Design).

*(Checkpoint: critério de aceite 3 do spec-01.)*

---

## M5 — Lançamento e gestão de transações

**Task 11. Server action `criarTransacao` (não parcelada)**
Cobre entrada, saída débito, saída crédito (sem parcelamento), e a marcação de investimento (aporte/resgate) com `contaInvestimentoId`. Deduz débito/crédito do `conta.tipo` (não pede escolha manual).

**Task 12. Server action `criarTransacaoParcelada`**
Usa `gerarParcelas` (Task 8) para criar as N transações numa única transaction do Prisma.

**Task 13. Editar e apagar transação**
`editarTransacao` e `apagarTransacao`, aplicando a qualquer transação independente de quem a criou (sem histórico de alterações). Por padrão, ambas afetam apenas a transação/parcela selecionada.

**Task 14. Propagação para parcelas restantes**
Opção adicional, tanto na edição quanto na exclusão, de propagar a ação para todas as parcelas de `dataEfetiva` futura do mesmo `parcelamentoId` (ex: apagar as restantes ao cancelar uma compra, ou editar o valor das restantes se o valor da parcela mudou).

**Task 15. Tela `/lancamento`**
Formulário completo: tipo, conta (define os campos seguintes), valor, categoria, descrição, data; checkbox "É investimento" + select de conta de investimento; se conta = cartão, checkbox "Parcelado" + nº parcelas + valor da parcela.

*(Checkpoint: critérios de aceite 2, 4, 5, 6, 7, 9–16 do spec-01 — o maior bloco de regras de negócio do MVP.)*

---

## M6 — Telas de consulta

**Task 16. Queries de consolidação**
Implementar as 4 queries da seção 6 do Design (Entradas, Saídas débito, Saídas crédito, Investimentos), parametrizadas por mês/ano de referência.

**Task 17. Tela `/acompanhamento`**
Seletor de mês/ano + 4 blocos (agrupados por dia onde aplicável) + gráfico de gastos por categoria (Recharts).

**Task 18. Tela `/transacoes`**
Tabela com as 11 colunas da seção 3.3 do spec-01, filtro por qualquer coluna, ações de editar/apagar por linha (reaproveita Tasks 13–14), paginação.

*(Checkpoint: critérios de aceite 20–23 do spec-01.)*

---

## M7 — Navegação principal e redesign da Visão geral e Contas

**Task 19. Layout protegido + navegação principal**
Criar `app/(protegido)/layout.jsx` com `NavegacaoPrincipal` (menu lateral no desktop / barra inferior no mobile, Design §8.1), incluindo a ação global "+ Nova transação" que navega direto para `/lancamento`, sem etapa intermediária.

**Task 20. Renomear `/acompanhamento` → `/visao-geral`**
Rename de pasta/arquivo (`page.jsx`, `acompanhamento-client.jsx`) e ajuste de links internos (Design §8.5). Sem mudança de comportamento nesta task.

**Task 21. Remover gráfico órfão**
Remove `GraficoGastosPorCategoria`, a dependência `recharts` do `package.json`, e qualquer referência restante — o requisito de gráfico foi removido do spec-01 (item 7).

**Task 22. Reordenar blocos, renomear indicador e identidade visual contínua**
Ordem dos 4 blocos passa a Entradas → Investimentos → Saídas no débito → Saídas no crédito (Design §8.3.3); indicador "Saldo" do resumo passa a se chamar "Disponível" (Design §8.3.2); cada bloco ganha ícone próprio e cor de destaque discreta (Design §8.3.6); blocos passam de Cards independentes para seções abertas separadas por espaçamento vertical e divisores sutis, com cabeçalho ícone+nome+total consolidado na mesma linha (Design §8.3.7).

**Task 23. Seletor de período (setas + Popover/Sheet de mês/ano)**
Substitui os dois `Select` atuais (mês, ano) pelo controle `‹ Agosto 2026 ›`: setas navegam sequencialmente um mês por vez; clicar no período abre um seletor dedicado — `Popover` no desktop, `Sheet` bottom no mobile — com grade de 12 meses, mês selecionado destacado e navegação entre anos (Design §8.3.1). Sem gesto de swipe.

**Task 24. Detalhamento diário via Popover/Sheet**
Substitui a exibição atual por: hover → `Popover` (shadcn/ui) no desktop, toque → `Sheet` bottom no mobile (Design §8.3.4), incluindo truncamento de descrições longas (Design §8.3.15).

**Task 25. Estados de erro, loading e vazio da Visão geral**
Skeleton loading (acesso inicial, troca de período, retorno à tela), estado de erro com ação "Tentar novamente", e estado vazio por bloco com mensagem contextual (Design §8.3.8, §8.3.9, §8.3.12).

**Task 26. Destaque do dia atual**
Destaque visual sutil do dia atual quando o período visualizado for o mês corrente (Design §8.3.13). A formatação de data `DD MMM` da seção 8.3.10 fica fora do escopo desta task — ver nota em spec-02 §11.

**Task 27. Refazer tela `/contas` — wizard de 2 etapas**
Substituir o formulário único condicional pelo fluxo de 2 etapas (escolher tipo → formulário específico do tipo) + listagem agrupada visualmente por tipo: Contas correntes, Cartões de crédito, Contas de investimento (Design §8.2.3).

*(Checkpoint sugerido: critérios de aceite de navegação principal, criação de conta em 2 etapas, e os critérios já existentes de Visão geral com a nova ordem/nomenclatura — spec-01 §6.)*

---

## M8 — Saída recorrente

**Task 29. `gerarOcorrenciasRecorrencia` + testes**
Implementar conforme seção 5.2 do Design (`proximaDataMensal` + `gerarOcorrenciasRecorrencia`, reaproveitando `ultimoDiaDoMes` da seção 5.1). Testes cobrindo: número correto de ocorrências, progressão de 1 mês por ocorrência, clamping de dia (ex: dia 31 caindo em fevereiro), e cálculo de mês de referência tanto para débito (mês da própria data) quanto para crédito (via `calcularFatura`, recalculado de forma independente por ocorrência).

**Task 30. Server action `criarTransacaoRecorrente`**
Cobre saída no débito ou no crédito, N ≥ 2 meses, usando `gerarOcorrenciasRecorrencia` (Task 29) numa única transaction do Prisma. Aceita também a marcação de investimento (aporte) quando a conta for corrente, seguindo as mesmas regras de `criarTransacao` (Task 11).

**Task 31. Editar e apagar ocorrência recorrente**
Estende `editarTransacao` e `apagarTransacao` (Tasks 13–14) para tratar linhas com `recorrenciaId !== null`: por padrão afeta só a ocorrência selecionada, com a mesma opção de propagar para as ocorrências futuras (`dataEfetiva` ≥ selecionada) e a mesma restrição de campos editáveis (valor/descrição/categoria) já usada para parcelas.

**Task 32. Checkbox "Recorrente" em `/lancamento`**
Adiciona o checkbox "Recorrente" + campo "Quantidade de meses", disponível para saída em Conta corrente ou Cartão de crédito, mutuamente exclusivo com "Parcelado" (Design §7).

**Task 33. Coluna "Recorrência" em `/transacoes`**
Nova coluna (formato "X de X", vazio quando não aplicável) na tabela e no filtro, reaproveitando o padrão já usado para a coluna "Parcela" (Task 18).

*(Checkpoint sugerido: critérios de aceite novos de saída recorrente — spec-01 §6.)*

---

## M9 — Deploy

**Task 34. Publicação**
Deploy no Vercel, variáveis de ambiente (banco, NextAuth secret), smoke test manual percorrendo os critérios de aceite do spec-01 de ponta a ponta.

---

## M10 — Menu do usuário e login

**Task 35. Menu do usuário (logoff)**
Componente `MenuUsuario` (Design §8.1.3): nome do usuário + ação "Sair" via `DropdownMenu` do shadcn/ui, usando `useSession()`/`signOut()` do `next-auth/react` direto em `NavegacaoPrincipal`. Rodapé do `<aside>` no desktop; barra superior fixa e enxuta no mobile (`layout.jsx` ganha `pt-14 md:pt-0` correspondente).

**Task 36. Redirecionamento pós-login**
Login bem-sucedido passa a redirecionar para `/visao-geral` em vez de `/`.

*(Checkpoint sugerido: critérios de aceite de menu do usuário e redirecionamento pós-login — spec-01 §6.)*

---

## M11 — Entrada recorrente

**Task 37. Estender `criarTransacaoRecorrente` para aceitar `tipo`**
Passa a receber `tipo` (`ENTRADA` ou `SAIDA`). `gerarOcorrenciasRecorrencia` não muda (Design §5.2, já agnóstica de tipo). Validação: `ENTRADA` só é permitida em `CONTA_CORRENTE` (rejeita `CARTAO_CREDITO`) e nunca pode vir com `ehInvestimento = true` (rejeita resgate recorrente).

**Task 38. Habilitar "Recorrente" para entrada em `/lancamento`**
Checkbox "Recorrente" passa a ficar disponível também com Tipo = Entrada quando a conta é Conta corrente (não quando é Cartão de crédito). Quando Recorrente + Entrada estiverem marcados, o checkbox "É investimento" fica indisponível (Design §7).

*(Checkpoint sugerido: critérios de aceite de entrada recorrente — spec-01 §6.)*

---

## M12 — Redesenho de `/transacoes`

**Task 39. Tabela enxuta com indicadores visuais compactos**
Reduz as colunas visíveis para Data da compra, Descrição, Categoria, Conta e Valor (Design §12.1). Remove as demais colunas (Tipo, Data efetiva, Mês de referência, Parcela, Recorrência, É investimento, Conta de investimento) da tabela. Adiciona os indicadores compactos: cor/sinal no Valor para Tipo, badge "X de Y" para Parcela, badge "X de Y ↻" para Recorrência, badge "Aporte"/"Resgate" para investimento.

**Task 40. Modal único de detalhe/edição/exclusão**
Substitui `EditarTransacaoDialog` e `ApagarTransacaoDialog` por um único `DetalheTransacaoDialog` (Design §12.2), aberto ao clicar em qualquer ponto da linha (remove a coluna "Ações" — Design §12.4). Contém o formulário de edição existente + botão "Apagar" que troca o conteúdo do mesmo modal para a confirmação de exclusão (com a opção de propagar, quando aplicável).

**Task 41. Barra de filtros (busca + Conta/Categoria/Mês-Ano)**
Substitui o filtro por coluna por uma barra acima da tabela: busca livre por Descrição, e filtros por Conta, Categoria e Mês/Ano de referência (Design §12.3), reaproveitando o `columnFilters` do `@tanstack/react-table` com colunas ocultas para os campos que saíram da tabela.

**Task 42. Coluna de data usa Data efetiva, não Data da compra**
Troca a primeira coluna da tabela de `dataCompra` para `dataEfetiva` e a ordenação (`orderBy`) da consulta em `page.jsx` para `dataEfetiva` (Design §12.1). O modal de detalhe passa a exibir "Data da compra" no lugar de "Data efetiva" no bloco somente-leitura.

**Task 43. Rótulo "Data do lançamento" no modal de detalhe**
Troca o rótulo "Data da compra" por "Data do lançamento" no texto somente-leitura do modal de detalhe (Design §12.1) — termo neutro para entrada, saída e investimento. Só o rótulo muda; o campo `dataCompra` no schema não é renomeado.

*(Checkpoint sugerido: critérios de aceite de `/transacoes` — spec-01 §6.)*

---

## M13 — Swipe de mês na Visão geral (mobile)

**Task 44. Swipe horizontal troca de mês no mobile**
Extrai `mesAnterior`/`mesSeguinte` de `SeletorPeriodo` para um hook compartilhado `useNavegacaoPeriodo(mes, ano)` (Design §8.3.1). Adiciona um listener de `touchstart`/`touchend` no container raiz de `VisaoGeralClient`: deslizar para a esquerda chama `mesSeguinte()`, para a direita `mesAnterior()` — só quando o deslocamento horizontal supera o vertical e passa de 50px, e só abaixo do breakpoint `md`. Layout desktop inalterado.

**Task 45. Transição visual (fade + slide) na troca de mês via swipe**
Remonta o conteúdo abaixo do seletor de período com `key={mes-ano}` ao trocar de mês via swipe, disparando `animate-in fade-in slide-in-from-right-8`/`slide-in-from-left-8` (`tailwindcss-animate`, já instalado) conforme a direção do gesto (Design §8.3.1). Direção guardada num `ref` em `VisaoGeralClient`, lido diretamente durante a renderização (sobrevive entre navegações, já que a troca de `searchParams` não desmonta o componente) e limpo depois via `useEffect`. Sem animação no carregamento inicial nem nas trocas via setas/seletor de mês.

*(Checkpoint sugerido: critérios de aceite da Visão geral — spec-01 §6.)*

---

## M14 — Tema escuro

Vem primeiro deliberadamente: os marcos seguintes criam três telas novas, e construí-las já no tema definitivo evita revisar contraste duas vezes.

**Task 46. Tokens do tema escuro**
Substitui os valores do bloco `:root` de `app/globals.css` pela paleta escura da tabela do Design §16.1 e **remove o bloco `.dark`** — hoje código morto, já que nada nunca aplica essa classe. Adiciona os tokens semânticos novos (`--entrada`, `--investimento`, `--saida-debito`, `--saida-credito`, `--periodo-bg`, `--periodo-fg`, `--estimado`) e registra todos em `tailwind.config.js`, seguindo o padrão `{ DEFAULT, foreground }` já usado por `primary`/`secondary`. Nenhum componente muda nesta task — só o sistema de tokens.

**Task 47. Substituir cores literais por tokens**
Troca as classes cravadas na paleta clara pelos tokens da Task 46 (Design §16.1): `text-emerald-600`, `text-blue-600`, `text-amber-600` e `text-rose-600` em `visao-geral-client.jsx`; `bg-indigo-50`/`text-indigo-600` em `seletor-periodo.jsx`; `text-emerald-600` em `transacoes-client.jsx`. Depois desta task, nenhuma cor semântica deve estar fora do sistema de tokens.

**Task 48. Revisão de contraste dos componentes**
Percorre a lista do Design §16.3 — `Button` (todas as variantes), `Input`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Table`, `Card`, `Skeleton`, os quatro blocos da Visão geral, a pílula do seletor de período e os badges de parcela/recorrência/investimento — verificando cada um sobre o novo fundo e corrigindo o que não atingir **WCAG AA** (4.5:1 para texto normal, 3:1 para texto grande e elementos de interface). Atenção específica ao `Skeleton`, que tende a sumir no escuro. QA com captura de tela de cada rota.

*(Checkpoint sugerido: "A aplicação é exibida em tema escuro, com todos os elementos legíveis sobre o novo fundo" — spec-01 §6.)*

---

## M15 — Valores padrão e Projeção

**Task 49. Modelo `ValorPadrao` e migration**
Adiciona o enum `MeioPagamento` e o model `ValorPadrao` ao `schema.prisma` conforme o Design §3, com a relação em `Usuario`. Gera e aplica a migration. Sem UI nesta task.

**Task 50. Server Actions de valores padrão**
CRUD em `lib/actions/valores-padrao.js`: criar, editar e apagar. Valida que `meio` é obrigatório quando `tipo = SAIDA` e nulo quando `ENTRADA` (Design §3), e que o valor é positivo. `revalidatePath` para `/valores-padrao`, `/visao-geral` e `/projecao` — omitir alguma reproduz o bug de cache já ocorrido com contas.

**Task 51. Tela `/valores-padrao`**
Tela única com as duas listas (Receitas padrão e Despesas padrão), cada uma com CRUD inline (Design §15.4). O formulário de despesa tem seletor Crédito/Débito; o de receita, não. Reaproveita `CampoValor`. Adiciona um link temporário na navegação existente para a tela ficar alcançável — a estrutura definitiva vem no M16.

**Task 52. `lib/projecao.js` — fronteiras da estimativa**
Implementa `dataFechamentoDaReferencia`, `creditoAindaEstimavel` e `debitoAindaEstimavel` conforme o Design §13.1 e §13.2 — a inversa de `calcularFatura`. Testes no Vitest cobrindo os casos 6, 7, 8 e 11 da lista do Design §13.4 (fatura fechada, dois cartões com fechamentos distintos, nenhum cartão cadastrado, fechamento dia 31 em mês de 30 dias). Função pura, sem banco.

**Task 53. `lib/projecao.js` — composição de um mês**
Implementa `comporMes` conforme o Design §13.3, devolvendo `real` e `estimado` separados por bloco. Testes cobrindo os casos 1 a 5, 9 e 10 do Design §13.4 — com atenção aos dois que a spec mudou no meio do caminho: ocorrência de recorrência **consome** o teto, parcela **soma por cima**, e receita padrão nunca é consumida.

**Task 54. Composição real + estimado na Visão geral**
`visao-geral/page.jsx` passa a usar `comporMes` em vez de somar transações direto. Os blocos exibem a estimativa como **linha própria com borda tracejada e rótulo "estimado"** (Design §16.2), e os cards de resumo ganham o subtexto de composição (`R$ 800 real + R$ 400 estimado`). Primeira tela a consumir os valores padrão.

**Task 55. Tela `/projecao`**
Rota nova com `export const dynamic = "force-dynamic"` (Design §14.1 — sem isso a projeção congela na data do build). Server Component busca transações da janela, valores padrão e contas, chama `comporMes` doze vezes e converte `Decimal` para `Number` antes de passar ao cliente. Renderiza o gráfico de 12 barras em CSS puro e a lista de meses — cards empilhados no mobile. Link temporário na navegação, como na Task 51.

**Task 56. Simulação de compra**
Formulário client-side na `/projecao` com cartão, data, valor **total** e nº de parcelas (Design §14.3). Deriva o valor da parcela, distribui via `gerarParcelas` e soma cada parcela ao mês de referência correspondente. Efêmera, em `useState`. Exibe o delta ao lado do número e sinaliza quando o parcelamento ultrapassa a janela ("10 de 24 parcelas dentro da janela").

*(Checkpoint sugerido: critérios de aceite de valores padrão, projeção e simulação — spec-01 §6.)*

---

## M16 — Navegação agrupada

Fecha o ciclo: só agora os cinco destinos existem, e a estrutura definitiva pode substituir os links temporários das Tasks 51 e 55.

**Task 57. Barra lateral do desktop em dois grupos**
`NavegacaoPrincipal` passa a listar os cinco destinos na ordem do Design §15.1, com um divisor entre Dados e Ajustes e sem rótulos de grupo (Design §15.2). Botão "+ Nova transação" e menu do usuário permanecem onde estão.

**Task 58. Menu inferior de três alvos no mobile**
Reduz a barra inferior a Dados · Nova · Ajustes (Design §15.3). "Dados" navega para `/visao-geral`; "Nova" continua indo para `/lancamento`; "Ajustes" abre um `Sheet` inferior com Contas e Valores padrão. Remove os links temporários.

**Task 59. Abas do grupo Dados no mobile**
Novo componente cliente `components/navegacao/abas-dados.jsx`, renderizado por `app/(protegido)/layout.jsx` acima de `{children}`, alternando Visão geral / Transações / Projeção em um único toque. Auto-oculta no desktop e fora das três rotas do grupo, sem reorganizar diretórios (Design §15.3). **Cuidado com o `tailwind-merge`:** não repetir utilitário de `display` sem prefixo de breakpoint em constante compartilhada — foi esse padrão que duplicou o seletor de período no mobile.

*(Checkpoint sugerido: critérios de aceite de navegação — spec-01 §6.)*

---

## Resumo de rastreabilidade

| Marco | Resolve |
|---|---|
| M1 | Requisitos não funcionais (spec-01 §4) |
| M2 | Escopo item 1 (Autenticação) |
| M3 | Design §4–5 (algoritmos) |
| M4 | Escopo item 5 (Conta polimórfica) |
| M5 | Escopo itens 2, 3, 6, 8 (lançamento, edição, investimento, parcelamento) |
| M6 | Escopo itens 7, 9 (Visão geral, tabela) |
| M7 | Escopo item 10 (navegação principal, ação global, wizard de Contas) e alterações de escopo da Visão geral |
| M8 | Escopo item 11 (transação recorrente — saída) |
| M9 | Publicação (spec-01 §4) |
| M10 | Escopo itens 1, 10 (redirecionamento pós-login, menu do usuário) |
| M11 | Escopo item 11 (transação recorrente — entrada) |
| M12 | Escopo item 9 (redesenho da tela `/transacoes`) |
| M13 | Escopo item 7 (swipe de mês na Visão geral, mobile) |
| M14 | Requisitos não funcionais — tema escuro (spec-01 §4) |
| M15 | Escopo itens 12, 13, 14 (valores padrão, projeção de 12 meses, simulação) |
| M16 | Escopo item 10 (navegação agrupada em Dados e Ajustes) |
