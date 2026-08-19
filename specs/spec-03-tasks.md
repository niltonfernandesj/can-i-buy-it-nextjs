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

*(Checkpoint sugerido: critérios de aceite de `/transacoes` — spec-01 §6.)*

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
