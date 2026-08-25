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

**Marcação de conclusão.** Cada task concluída recebe uma linha `✅ **Concluída** — commit \`hash\`` logo abaixo do título, ligando a spec ao código que a implementou. Os hashes foram obtidos do próprio histórico do git (commits no formato `Task N: ...`), não preenchidos de memória — commits que cobrem um intervalo (`Tasks 75-79`) marcam todas as tasks do intervalo. A única exceção é a **Task 34 (Publicação)**, tarefa operacional (deploy e smoke test manual) que por natureza não gerou commit.

---

## M1 — Setup do projeto ✅

**Task 1. Inicializar projeto**
✅ **Concluída** — commit `6faac17`
Next.js 14+ (App Router, JavaScript, não TypeScript), Tailwind CSS, shadcn/ui. Estrutura de pastas conforme seção 2 do Design.

**Task 2. Banco de dados**
✅ **Concluída** — commit `1430a68`
Provisionar Vercel Postgres, configurar Prisma (`npx prisma init`), criar `schema.prisma` com o conteúdo da seção 3 do Design, rodar a primeira migration.

**Task 3. Testes**
✅ **Concluída** — commit `d045f1f`
Configurar Vitest no projeto (conforme seção 1 do Design — "Testes: por que Vitest").

---

## M2 — Autenticação ✅

**Task 4. NextAuth + Usuario**
✅ **Concluída** — commit `2ea580d`
Configurar NextAuth.js com Credentials Provider, hash de senha com bcrypt, validando contra o model `Usuario`.

**Task 5. Telas de cadastro e login**
✅ **Concluída** — commit `e44b38f`
`/cadastro` (nome, email, senha) e `/login` (email, senha).

**Task 6. Middleware de proteção**
✅ **Concluída** — commit `978261c`
Middleware do Next.js protegendo todas as rotas exceto `/login` e `/cadastro`, redirecionando não autenticados.

*(Checkpoint sugerido: critérios de aceite 1 e 8 do spec-01.)*

---

## M3 — Núcleo de negócio (funções puras) ✅

**Task 7. `calcularFatura` + testes**
✅ **Concluída** — commit `f5b4278`
Implementar conforme seção 4 do Design. Testes cobrindo: vencimento antes/depois do fechamento, rollover de mês e de ano, fechamento em dia inexistente no mês (ex: dia 31 em fevereiro) — usar as tabelas de exemplo do Design como casos de teste.

**Task 8. `gerarParcelas` + testes**
✅ **Concluída** — commit `75a6a6b`
Implementar conforme seção 5 do Design (inclui `ultimoDiaDoMes` e `dataAberturaProximaFatura`). Testes cobrindo: número correto de parcelas, progressão de exatamente 1 mês de referência por parcela, e o caso de borda de fechamento dia 31 caindo em fevereiro (ver tabela de exemplo do Design).

*(Estas duas tarefas são as de maior risco do projeto — revisar com atenção antes de seguir.)*

---

## M4 — Contas ✅

**Task 9. Server actions de Conta**
✅ **Concluída** — commit `a44f955`
`criarConta`, `editarConta`, `apagarConta`. Validação: campos de fechamento/vencimento obrigatórios só quando `tipo = CARTAO_CREDITO`.

**Task 10. Tela `/contas`**
✅ **Concluída** — commit `063ce11`
Listagem + formulário de criação/edição com campos condicionais por tipo (seção 7 do Design).

*(Checkpoint: critério de aceite 3 do spec-01.)*

---

## M5 — Lançamento e gestão de transações ✅

**Task 11. Server action `criarTransacao` (não parcelada)**
✅ **Concluída** — commit `7f0d426`
Cobre entrada, saída débito, saída crédito (sem parcelamento), e a marcação de investimento (aporte/resgate) com `contaInvestimentoId`. Deduz débito/crédito do `conta.tipo` (não pede escolha manual).

**Task 12. Server action `criarTransacaoParcelada`**
✅ **Concluída** — commit `98f36a9`
Usa `gerarParcelas` (Task 8) para criar as N transações numa única transaction do Prisma.

**Task 13. Editar e apagar transação**
✅ **Concluída** — commit `e71c9e9`
`editarTransacao` e `apagarTransacao`, aplicando a qualquer transação independente de quem a criou (sem histórico de alterações). Por padrão, ambas afetam apenas a transação/parcela selecionada.

**Task 14. Propagação para parcelas restantes**
✅ **Concluída** — commit `937b0a9`
Opção adicional, tanto na edição quanto na exclusão, de propagar a ação para todas as parcelas de `dataEfetiva` futura do mesmo `parcelamentoId` (ex: apagar as restantes ao cancelar uma compra, ou editar o valor das restantes se o valor da parcela mudou).

**Task 15. Tela `/lancamento`**
✅ **Concluída** — commit `9484a2f`
Formulário completo: tipo, conta (define os campos seguintes), valor, categoria, descrição, data; checkbox "É investimento" + select de conta de investimento; se conta = cartão, checkbox "Parcelado" + nº parcelas + valor da parcela.

*(Checkpoint: critérios de aceite 2, 4, 5, 6, 7, 9–16 do spec-01 — o maior bloco de regras de negócio do MVP.)*

---

## M6 — Telas de consulta ✅

**Task 16. Queries de consolidação**
✅ **Concluída** — commit `84d7503`
Implementar as 4 queries da seção 6 do Design (Entradas, Saídas débito, Saídas crédito, Investimentos), parametrizadas por mês/ano de referência.

**Task 17. Tela `/acompanhamento`**
✅ **Concluída** — commit `6f4b5eb`
Seletor de mês/ano + 4 blocos (agrupados por dia onde aplicável) + gráfico de gastos por categoria (Recharts).

**Task 18. Tela `/transacoes`**
✅ **Concluída** — commit `cd6d5ea`
Tabela com as 11 colunas da seção 3.3 do spec-01, filtro por qualquer coluna, ações de editar/apagar por linha (reaproveita Tasks 13–14), paginação.

*(Checkpoint: critérios de aceite 20–23 do spec-01.)*

---

## M7 — Navegação principal e redesign da Visão geral e Contas ✅

**Task 19. Layout protegido + navegação principal**
✅ **Concluída** — commit `74f8834`
Criar `app/(protegido)/layout.jsx` com `NavegacaoPrincipal` (menu lateral no desktop / barra inferior no mobile, Design §8.1), incluindo a ação global "+ Nova transação" que navega direto para `/lancamento`, sem etapa intermediária.

**Task 20. Renomear `/acompanhamento` → `/visao-geral`**
✅ **Concluída** — commit `6e99ba9`
Rename de pasta/arquivo (`page.jsx`, `acompanhamento-client.jsx`) e ajuste de links internos (Design §8.5). Sem mudança de comportamento nesta task.

**Task 21. Remover gráfico órfão**
✅ **Concluída** — commit `0c78349`
Remove `GraficoGastosPorCategoria`, a dependência `recharts` do `package.json`, e qualquer referência restante — o requisito de gráfico foi removido do spec-01 (item 7).

**Task 22. Reordenar blocos, renomear indicador e identidade visual contínua**
✅ **Concluída** — commit `6507e1f`
Ordem dos 4 blocos passa a Entradas → Investimentos → Saídas no débito → Saídas no crédito (Design §8.3.3); indicador "Saldo" do resumo passa a se chamar "Disponível" (Design §8.3.2); cada bloco ganha ícone próprio e cor de destaque discreta (Design §8.3.6); blocos passam de Cards independentes para seções abertas separadas por espaçamento vertical e divisores sutis, com cabeçalho ícone+nome+total consolidado na mesma linha (Design §8.3.7).

**Task 23. Seletor de período (setas + Popover/Sheet de mês/ano)**
✅ **Concluída** — commit `41b630a`
Substitui os dois `Select` atuais (mês, ano) pelo controle `‹ Agosto 2026 ›`: setas navegam sequencialmente um mês por vez; clicar no período abre um seletor dedicado — `Popover` no desktop, `Sheet` bottom no mobile — com grade de 12 meses, mês selecionado destacado e navegação entre anos (Design §8.3.1). Sem gesto de swipe.

**Task 24. Detalhamento diário via Popover/Sheet**
✅ **Concluída** — commit `8cd7100`
Substitui a exibição atual por: hover → `Popover` (shadcn/ui) no desktop, toque → `Sheet` bottom no mobile (Design §8.3.4), incluindo truncamento de descrições longas (Design §8.3.15).

**Task 25. Estados de erro, loading e vazio da Visão geral**
✅ **Concluída** — commit `eba6947`
Skeleton loading (acesso inicial, troca de período, retorno à tela), estado de erro com ação "Tentar novamente", e estado vazio por bloco com mensagem contextual (Design §8.3.8, §8.3.9, §8.3.12).

**Task 26. Destaque do dia atual**
✅ **Concluída** — commit `6171f89`
Destaque visual sutil do dia atual quando o período visualizado for o mês corrente (Design §8.3.13). A formatação de data `DD MMM` da seção 8.3.10 fica fora do escopo desta task — ver nota em spec-02 §11.

**Task 27. Refazer tela `/contas` — wizard de 2 etapas**
✅ **Concluída** — commit `3a8818c`
Substituir o formulário único condicional pelo fluxo de 2 etapas (escolher tipo → formulário específico do tipo) + listagem agrupada visualmente por tipo: Contas correntes, Cartões de crédito, Contas de investimento (Design §8.2.3).

*(Checkpoint sugerido: critérios de aceite de navegação principal, criação de conta em 2 etapas, e os critérios já existentes de Visão geral com a nova ordem/nomenclatura — spec-01 §6.)*

---

## M8 — Saída recorrente ✅

**Task 29. `gerarOcorrenciasRecorrencia` + testes**
✅ **Concluída** — commit `40cf063`
Implementar conforme seção 5.2 do Design (`proximaDataMensal` + `gerarOcorrenciasRecorrencia`, reaproveitando `ultimoDiaDoMes` da seção 5.1). Testes cobrindo: número correto de ocorrências, progressão de 1 mês por ocorrência, clamping de dia (ex: dia 31 caindo em fevereiro), e cálculo de mês de referência tanto para débito (mês da própria data) quanto para crédito (via `calcularFatura`, recalculado de forma independente por ocorrência).

**Task 30. Server action `criarTransacaoRecorrente`**
✅ **Concluída** — commit `37a25ce`
Cobre saída no débito ou no crédito, N ≥ 2 meses, usando `gerarOcorrenciasRecorrencia` (Task 29) numa única transaction do Prisma. Aceita também a marcação de investimento (aporte) quando a conta for corrente, seguindo as mesmas regras de `criarTransacao` (Task 11).

**Task 31. Editar e apagar ocorrência recorrente**
✅ **Concluída** — commit `b8796c0`
Estende `editarTransacao` e `apagarTransacao` (Tasks 13–14) para tratar linhas com `recorrenciaId !== null`: por padrão afeta só a ocorrência selecionada, com a mesma opção de propagar para as ocorrências futuras (`dataEfetiva` ≥ selecionada) e a mesma restrição de campos editáveis (valor/descrição/categoria) já usada para parcelas.

**Task 32. Checkbox "Recorrente" em `/lancamento`**
✅ **Concluída** — commit `5293d1c`
Adiciona o checkbox "Recorrente" + campo "Quantidade de meses", disponível para saída em Conta corrente ou Cartão de crédito, mutuamente exclusivo com "Parcelado" (Design §7).

**Task 33. Coluna "Recorrência" em `/transacoes`**
✅ **Concluída** — commit `d2e4c33`
Nova coluna (formato "X de X", vazio quando não aplicável) na tabela e no filtro, reaproveitando o padrão já usado para a coluna "Parcela" (Task 18).

*(Checkpoint sugerido: critérios de aceite novos de saída recorrente — spec-01 §6.)*

---

## M9 — Deploy ✅

**Task 34. Publicação**
✅ **Concluída** — tarefa operacional (deploy), sem commit associado
Deploy no Vercel, variáveis de ambiente (banco, NextAuth secret), smoke test manual percorrendo os critérios de aceite do spec-01 de ponta a ponta.

---

## M10 — Menu do usuário e login ✅

**Task 35. Menu do usuário (logoff)**
✅ **Concluída** — commit `c5bdccc`
Componente `MenuUsuario` (Design §8.1.3): nome do usuário + ação "Sair" via `DropdownMenu` do shadcn/ui, usando `useSession()`/`signOut()` do `next-auth/react` direto em `NavegacaoPrincipal`. Rodapé do `<aside>` no desktop; barra superior fixa e enxuta no mobile (`layout.jsx` ganha `pt-14 md:pt-0` correspondente).

**Task 36. Redirecionamento pós-login**
✅ **Concluída** — commit `f8c836d`
Login bem-sucedido passa a redirecionar para `/visao-geral` em vez de `/`.

*(Checkpoint sugerido: critérios de aceite de menu do usuário e redirecionamento pós-login — spec-01 §6.)*

---

## M11 — Entrada recorrente ✅

**Task 37. Estender `criarTransacaoRecorrente` para aceitar `tipo`**
✅ **Concluída** — commit `4654673`
Passa a receber `tipo` (`ENTRADA` ou `SAIDA`). `gerarOcorrenciasRecorrencia` não muda (Design §5.2, já agnóstica de tipo). Validação: `ENTRADA` só é permitida em `CONTA_CORRENTE` (rejeita `CARTAO_CREDITO`) e nunca pode vir com `ehInvestimento = true` (rejeita resgate recorrente).

**Task 38. Habilitar "Recorrente" para entrada em `/lancamento`**
✅ **Concluída** — commit `8989186`
Checkbox "Recorrente" passa a ficar disponível também com Tipo = Entrada quando a conta é Conta corrente (não quando é Cartão de crédito). Quando Recorrente + Entrada estiverem marcados, o checkbox "É investimento" fica indisponível (Design §7).

*(Checkpoint sugerido: critérios de aceite de entrada recorrente — spec-01 §6.)*

---

## M12 — Redesenho de `/transacoes` ✅

**Task 39. Tabela enxuta com indicadores visuais compactos**
✅ **Concluída** — commit `3e8b4a6`
Reduz as colunas visíveis para Data da compra, Descrição, Categoria, Conta e Valor (Design §12.1). Remove as demais colunas (Tipo, Data efetiva, Mês de referência, Parcela, Recorrência, É investimento, Conta de investimento) da tabela. Adiciona os indicadores compactos: cor/sinal no Valor para Tipo, badge "X de Y" para Parcela, badge "X de Y ↻" para Recorrência, badge "Aporte"/"Resgate" para investimento.

**Task 40. Modal único de detalhe/edição/exclusão**
✅ **Concluída** — commit `149816a`
Substitui `EditarTransacaoDialog` e `ApagarTransacaoDialog` por um único `DetalheTransacaoDialog` (Design §12.2), aberto ao clicar em qualquer ponto da linha (remove a coluna "Ações" — Design §12.4). Contém o formulário de edição existente + botão "Apagar" que troca o conteúdo do mesmo modal para a confirmação de exclusão (com a opção de propagar, quando aplicável).

**Task 41. Barra de filtros (busca + Conta/Categoria/Mês-Ano)**
✅ **Concluída** — commit `63d54c6`
Substitui o filtro por coluna por uma barra acima da tabela: busca livre por Descrição, e filtros por Conta, Categoria e Mês/Ano de referência (Design §12.3), reaproveitando o `columnFilters` do `@tanstack/react-table` com colunas ocultas para os campos que saíram da tabela.

**Task 42. Coluna de data usa Data efetiva, não Data da compra**
✅ **Concluída** — commit `4d22c0f`
Troca a primeira coluna da tabela de `dataCompra` para `dataEfetiva` e a ordenação (`orderBy`) da consulta em `page.jsx` para `dataEfetiva` (Design §12.1). O modal de detalhe passa a exibir "Data da compra" no lugar de "Data efetiva" no bloco somente-leitura.

**Task 43. Rótulo "Data do lançamento" no modal de detalhe**
✅ **Concluída** — commit `20392c6`
Troca o rótulo "Data da compra" por "Data do lançamento" no texto somente-leitura do modal de detalhe (Design §12.1) — termo neutro para entrada, saída e investimento. Só o rótulo muda; o campo `dataCompra` no schema não é renomeado.

*(Checkpoint sugerido: critérios de aceite de `/transacoes` — spec-01 §6.)*

---

## M13 — Swipe de mês na Visão geral (mobile) ✅

**Task 44. Swipe horizontal troca de mês no mobile**
✅ **Concluída** — commit `c41a8ef`
Extrai `mesAnterior`/`mesSeguinte` de `SeletorPeriodo` para um hook compartilhado `useNavegacaoPeriodo(mes, ano)` (Design §8.3.1). Adiciona um listener de `touchstart`/`touchend` no container raiz de `VisaoGeralClient`: deslizar para a esquerda chama `mesSeguinte()`, para a direita `mesAnterior()` — só quando o deslocamento horizontal supera o vertical e passa de 50px, e só abaixo do breakpoint `md`. Layout desktop inalterado.

**Task 45. Transição visual (fade + slide) na troca de mês via swipe**
✅ **Concluída** — commit `4a32e50`
Remonta o conteúdo abaixo do seletor de período com `key={mes-ano}` ao trocar de mês via swipe, disparando `animate-in fade-in slide-in-from-right-8`/`slide-in-from-left-8` (`tailwindcss-animate`, já instalado) conforme a direção do gesto (Design §8.3.1). Direção guardada num `ref` em `VisaoGeralClient`, lido diretamente durante a renderização (sobrevive entre navegações, já que a troca de `searchParams` não desmonta o componente) e limpo depois via `useEffect`. Sem animação no carregamento inicial nem nas trocas via setas/seletor de mês.

*(Checkpoint sugerido: critérios de aceite da Visão geral — spec-01 §6.)*

---

## M14 — Endurecimento de segurança ✅

Vem antes de tudo: a aplicação está publicada com dados financeiros reais e, hoje, qualquer pessoa que descubra a URL pode se cadastrar e ler, editar e apagar tudo (Design §17.1). A **Task 46 é a urgente** — fecha o vazamento. As Tasks 47 a 49 devolvem, de forma controlada, a capacidade de criar usuários; as demais fecham o restante dos achados.

**Task 46. Fechar o cadastro público**
✅ **Concluída** — commit `0405347`
Remove a rota `/cadastro`, sua página e a Server Action `criarUsuario`. Ajusta o matcher do `middleware.js` para excluir apenas `/login` e os assets do Next (Design §17.2). Depois desta task, não deve existir nenhum caminho na aplicação que crie um usuário. **Pode e deve ser publicada isoladamente**, antes das seguintes.

**Task 47. Coluna `ehAdmin` e propagação na sessão**
✅ **Concluída** — commit `f834736`
Adiciona `ehAdmin Boolean @default(false)` ao model `Usuario` (Design §3). A migration inclui um passo de dados que marca **o usuário mais antigo** como administrador — em produção, o seu —, evitando qualquer `UPDATE` manual no console do provedor. Os callbacks `jwt` e `session` do NextAuth passam a carregar o campo, de modo que `session.user.ehAdmin` fique disponível no servidor e no cliente (Design §17.2).

**Task 48. Server Actions de gestão de usuários**
✅ **Concluída** — commit `df3c124`
`criarUsuario` e `editarUsuario` em `lib/actions/usuarios.js`, ambas iniciando por um helper `exigirAdmin()` que rejeita quem não for administrador (Design §17.2). Valida e-mail único, senha mínima e nome obrigatório; o hash usa bcrypt custo 10, igual ao login. Duas travas contra auto-bloqueio: o administrador **não pode remover o próprio `ehAdmin`** nem **alterar o próprio e-mail** por esta via. Sem exclusão de usuários — revogar acesso é trocar a senha.

**Task 49. Tela `/usuarios`**
✅ **Concluída** — commit `64b1916`
Lista os usuários e oferece criação e edição, restrita ao administrador (Design §17.2). A guarda é aplicada em **três camadas**: matcher do middleware, verificação no Server Component antes do render, e `exigirAdmin()` dentro de cada action — esconder o link no cliente não é proteção, já que Server Actions são endpoints HTTP. A tela exibe um aviso explícito de que qualquer usuário criado ali enxerga e edita **todos** os dados financeiros da família (spec-01 §2). Link temporário na navegação; ~~a entrada definitiva no grupo Ajustes vem na Task 65~~ — **decisão revista no M17**: o Design §15.1 (que prevalece sobre versões anteriores) fixou os cinco destinos da navegação agrupada sem incluir `/usuarios`. Em vez de expandir esse escopo, `/usuarios` permanece acessível só pelo menu do usuário logado (já com as três camadas de guarda), e o link temporário na barra principal é removido na Task 65 sem substituto.

**Task 50. Limitação de taxa no login**
✅ **Concluída** — commit `3292e1c`
Contador em memória por e-mail no `authorize` do Credentials Provider: 5 tentativas malsucedidas bloqueiam novas tentativas por 15 minutos (Design §17.3). A mensagem de erro **não distingue** senha incorreta de bloqueio, para não confirmar a existência da conta.

**Task 51. Travar tipo e fechamento de contas com transações**
✅ **Concluída** — commit `6ede05e`
`editarConta` passa a rejeitar alteração de `tipo`, `diaFechamento` e `diaVencimento` quando a conta possui transações vinculadas — esses valores originaram o `mesReferencia` já gravado, e alterá-los corrompe a consolidação silenciosamente (Design §17.4). O nome continua editável. A UI desabilita os campos e explica o motivo, em vez de deixar o usuário tentar e receber erro.

**Task 52. Duração explícita da sessão e avaliação das dependências**
✅ **Concluída** — commit `4692d60`
Declara `session.maxAge` em `authOptions` (7 dias) em vez de herdar o padrão de 30 (Design §17.5). Na mesma task, trata as dependências vulneráveis conforme o Design §17.6 — **avaliando antes de atualizar**: `npm audit fix --force` sugere um *downgrade* do `next-auth` e um salto de major do Next que quebra `visao-geral/page.jsx` (no Next 15 `searchParams` é assíncrono). Verificar quais avisos se aplicam a um deploy na Vercel, tratar primeiro o que é explorável neste contexto, e rodar QA completo em todas as rotas depois de qualquer atualização.

*(Checkpoint sugerido: critérios de aceite de autenticação — spec-01 §6.)*

---

## M15 — Tema escuro ✅

Os marcos seguintes criam três telas novas, e construí-las já no tema definitivo evita revisar contraste duas vezes.

**Task 53. Tokens do tema escuro**
✅ **Concluída** — commit `5089e90`
Substitui os valores do bloco `:root` de `app/globals.css` pela paleta escura da tabela do Design §16.1 e **remove o bloco `.dark`** — hoje código morto, já que nada nunca aplica essa classe. Adiciona os tokens semânticos novos (`--entrada`, `--investimento`, `--saida-debito`, `--saida-credito`, `--periodo-bg`, `--periodo-fg`, `--estimado`) e registra todos em `tailwind.config.js`, seguindo o padrão `{ DEFAULT, foreground }` já usado por `primary`/`secondary`. Nenhum componente muda nesta task — só o sistema de tokens.

**Task 54. Substituir cores literais por tokens**
✅ **Concluída** — commit `bd85945`
Troca as classes cravadas na paleta clara pelos tokens da Task 53 (Design §16.1): `text-emerald-600`, `text-blue-600`, `text-amber-600` e `text-rose-600` em `visao-geral-client.jsx`; `bg-indigo-50`/`text-indigo-600` em `seletor-periodo.jsx`; `text-emerald-600` em `transacoes-client.jsx`. Depois desta task, nenhuma cor semântica deve estar fora do sistema de tokens.

**Task 55. Revisão de contraste dos componentes**
✅ **Concluída** — commit `23d7db9`
Percorre a lista do Design §16.3 — `Button` (todas as variantes), `Input`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Table`, `Card`, `Skeleton`, os quatro blocos da Visão geral, a pílula do seletor de período e os badges de parcela/recorrência/investimento — verificando cada um sobre o novo fundo e corrigindo o que não atingir **WCAG AA** (4.5:1 para texto normal, 3:1 para texto grande e elementos de interface). Atenção específica ao `Skeleton`, que tende a sumir no escuro. QA com captura de tela de cada rota.

*(Checkpoint sugerido: "A aplicação é exibida em tema escuro, com todos os elementos legíveis sobre o novo fundo" — spec-01 §6.)*

---

## M16 — Valores padrão e Projeção ✅

**Task 56. Modelo `ValorPadrao` e migration**
✅ **Concluída** — commit `4a204d4`
Adiciona o enum `MeioPagamento` e o model `ValorPadrao` ao `schema.prisma` conforme o Design §3, com a relação em `Usuario`. Gera e aplica a migration. Sem UI nesta task.

**Task 57. Server Actions de valores padrão**
✅ **Concluída** — commit `e11a5e4`
CRUD em `lib/actions/valores-padrao.js`: criar, editar e apagar. Valida que `meio` é obrigatório quando `tipo = SAIDA` e nulo quando `ENTRADA` (Design §3), e que o valor é positivo. `revalidatePath` para `/valores-padrao`, `/visao-geral` e `/projecao` — omitir alguma reproduz o bug de cache já ocorrido com contas.

**Task 58. Tela `/valores-padrao`**
✅ **Concluída** — commit `4486653`
Tela única com as duas listas (Receitas padrão e Despesas padrão), cada uma com CRUD inline (Design §15.4). O formulário de despesa tem seletor Crédito/Débito; o de receita, não. Reaproveita `CampoValor`. Adiciona um link temporário na navegação existente para a tela ficar alcançável — a estrutura definitiva vem no M17.

**Task 59. `lib/projecao.js` — fronteiras da estimativa**
✅ **Concluída** — commit `cd40f21`
Implementa `dataFechamentoDaReferencia`, `creditoAindaEstimavel` e `debitoAindaEstimavel` conforme o Design §13.1 e §13.2 — a inversa de `calcularFatura`. Testes no Vitest cobrindo os casos 6, 7, 8 e 11 da lista do Design §13.4 (fatura fechada, dois cartões com fechamentos distintos, nenhum cartão cadastrado, fechamento dia 31 em mês de 30 dias). Função pura, sem banco.

**Task 60. `lib/projecao.js` — composição de um mês**
✅ **Concluída** — commit `a4a81ae`
Implementa `comporMes` conforme o Design §13.3, devolvendo `real` e `estimado` separados por bloco. Testes cobrindo os casos 1 a 5, 9 e 10 do Design §13.4 — com atenção aos dois que a spec mudou no meio do caminho: ocorrência de recorrência **consome** o teto, parcela **soma por cima**, e receita padrão nunca é consumida.

**Task 61. Composição real + estimado na Visão geral**
✅ **Concluída** — commit `2936cb0`
`visao-geral/page.jsx` passa a usar `comporMes` em vez de somar transações direto. Os blocos exibem a estimativa como **linha própria com borda tracejada e rótulo "estimado"** (Design §16.2), e os cards de resumo ganham o subtexto de composição (`R$ 800 real + R$ 400 estimado`). Primeira tela a consumir os valores padrão.

**Task 62. Tela `/projecao`**
✅ **Concluída** — commit `f25d5cb`
Rota nova com `export const dynamic = "force-dynamic"` (Design §14.1 — sem isso a projeção congela na data do build). Server Component busca transações da janela, valores padrão e contas, chama `comporMes` doze vezes e converte `Decimal` para `Number` antes de passar ao cliente. Renderiza o gráfico de 12 barras em CSS puro e a lista de meses — cards empilhados no mobile. Link temporário na navegação, como na Task 58.

**Task 63. Simulação de compra**
✅ **Concluída** — commit `6516ef3`
Formulário client-side na `/projecao` com cartão, data, valor **total** e nº de parcelas (Design §14.3). Deriva o valor da parcela, distribui via `gerarParcelas` e soma cada parcela ao mês de referência correspondente. Efêmera, em `useState`. Exibe o delta ao lado do número e sinaliza quando o parcelamento ultrapassa a janela ("10 de 24 parcelas dentro da janela").

*(Checkpoint sugerido: critérios de aceite de valores padrão, projeção e simulação — spec-01 §6.)*

---

## M17 — Navegação agrupada ✅

Fecha o ciclo: só agora os cinco destinos existem, e a estrutura definitiva pode substituir os links temporários das Tasks 58 e 62.

**Task 64. Barra lateral do desktop em dois grupos**
✅ **Concluída** — commit `d112de7`
`NavegacaoPrincipal` passa a listar os cinco destinos na ordem do Design §15.1, com um divisor entre Dados e Ajustes e sem rótulos de grupo (Design §15.2). Botão "+ Nova transação" e menu do usuário permanecem onde estão.

**Task 65. Menu inferior de três alvos no mobile**
✅ **Concluída** — commit `b4bff9c`
Reduz a barra inferior a Dados · Nova · Ajustes (Design §15.3). "Dados" navega para `/visao-geral`; "Nova" continua indo para `/lancamento`; "Ajustes" abre um `Sheet` inferior com Contas e Valores padrão. Remove os links temporários.

**Task 66. Abas do grupo Dados no mobile**
✅ **Concluída** — commit `c082f0c`
Novo componente cliente `components/navegacao/abas-dados.jsx`, renderizado por `app/(protegido)/layout.jsx` acima de `{children}`, alternando Visão geral / Transações / Projeção em um único toque. Auto-oculta no desktop e fora das três rotas do grupo, sem reorganizar diretórios (Design §15.3). **Cuidado com o `tailwind-merge`:** não repetir utilitário de `display` sem prefixo de breakpoint em constante compartilhada — foi esse padrão que duplicou o seletor de período no mobile.

*(Checkpoint sugerido: critérios de aceite de navegação — spec-01 §6.)*

**Task 67. Card do mês em `/projecao` vira link pra Visão geral**
✅ **Concluída** — commit `5fed9bc`
Cada card da lista de 12 meses passa a ser um link para `/visao-geral?mes=X&ano=Y` (Requisitos 3.6, Design §14.2), com hover destacando borda/fundo/sombra do card como affordance de clique. Usa tokens sólidos do tema (`border-ring`, `bg-muted`) em vez da sintaxe de opacidade `/NN` do Tailwind, que não gera CSS nos tokens deste projeto (achado registrado em spec-01 §7, correção mais ampla não priorizada).

**Task 68. Renomear "Visão geral" → "Visão mensal" (rota `/visao-geral` → `/visao-mensal`)**
✅ **Concluída** — commit `145c9af`
Renomeação de tela e rota, terceira da linhagem depois de `/acompanhamento` → `/visao-geral` (Task 20) — ver spec-02 §8.5 e a linha da tabela de rotas em §8.2. Nenhuma mudança de comportamento, só identidade:

- **Pastas/arquivos**: `app/(protegido)/visao-geral/` → `app/(protegido)/visao-mensal/` (`page.jsx`, `visao-geral-client.jsx` → `visao-mensal-client.jsx`, `loading.jsx`, `error.jsx`); `components/visao-geral/` → `components/visao-mensal/` (`seletor-periodo.jsx`, `detalhe-diario.jsx`).
- **Componentes/funções**: `VisaoGeralClient` → `VisaoMensalClient`, `VisaoGeralPage` → `VisaoMensalPage`, `VisaoGeralLoading` → `VisaoMensalLoading`, `VisaoGeralError` → `VisaoMensalError`, e os imports que os referenciam (inclui os imports de `seletor-periodo`/`detalhe-diario` a partir do novo caminho `@/components/visao-mensal/...`).
- **String de rota `/visao-geral` → `/visao-mensal`** em: `navegacao-principal.jsx` (entrada do grupo Dados no sidebar + link "Dados" da barra inferior), `abas-dados.jsx` (aba "Visão geral"), redirect pós-login (`app/(auth)/login/page.jsx`), redirect de fallback em `app/(protegido)/usuarios/page.jsx`, `revalidatePath` em `lib/actions/transacoes.js` (5 Server Actions) e `lib/actions/valores-padrao.js`, `router.push` do `useNavegacaoPeriodo` em `seletor-periodo.jsx`, link dos cards em `projecao-client.jsx` (Task 67).
- **Texto "Visão geral" → "Visão mensal"**: label de navegação (sidebar + abas) e os três H1 (`page.jsx`, `loading.jsx`, `error.jsx`).

Specs atualizadas nesta mesma task (spec-01 e spec-02 já refletem "Visão mensal"/`/visao-mensal` em toda referência ao estado atual; tasks já concluídas que citam `/visao-geral` — Task 20 e as que vieram depois dela — permanecem como estão, registro histórico do que era verdade quando foram escritas, mesmo padrão já usado no rename anterior).

**Task 69. Receita padrão não é tratada como estimativa no bloco Entradas**
✅ **Concluída** — commit `b0b2ee5`
`entradas.estimado` (de `comporMes`) carrega a receita padrão — um valor garantido, nunca reduzido pelo real (Requisitos 3.5) — mas hoje é exibido com a mesma linguagem visual de "estimativa" usada nas Saídas, o que sugere uma incerteza que não existe. Design §16.2 revisado com o tratamento diferenciado; aplicar em ambas as telas que consomem o campo (Design §13.3: "a mesma função serve as duas telas"):

- **Visão mensal** (`visao-mensal-client.jsx`): no bloco Entradas expandido, a linha de receita padrão passa a vir **antes** dos lançamentos reais agrupados por dia (não mais depois), com rótulo "Receita padrão", borda sólida (`border-b`, não tracejada) e cor `text-entrada` (não `text-estimado`). O bloco recebe uma prop (ex.: `ehEntradas`) pra `BlocoPorDia` escolher entre esse tratamento e o de "Estimado" já existente (mantido, sem mudança, para Saídas no débito/crédito). No card de resumo "Entradas", o subtexto inverte a ordem: receita padrão primeiro, real depois.
- **Projeção** (`projecao-client.jsx`): `ValorComposto` recebe uma prop equivalente pra aplicar o mesmo subtexto invertido e a mesma cor só na chamada de Entradas de cada card de mês; a chamada de Saídas mantém o comportamento atual.
- Nenhuma mudança em `lib/projecao.js` — `comporMes` continua devolvendo `{real, estimado, total}` com a mesma chave para os dois casos (nota já registrada em Design §13.3 sobre por que a chave não foi renomeada); só a camada de exibição muda.

*(Checkpoint sugerido: critérios de aceite revisados de Visão mensal e Projeção — spec-01 §6.)*

**Task 70. Cards de mês da Projeção — layout enxuto**
✅ **Concluída** — commit `1978831`
Os cards da lista de 12 meses (`projecao-client.jsx`) estavam poluídos: cada mês repetia o mesmo nível de detalhe (composição real/estimado) que já existe na Visão mensal, destino do clique. Requisitos 3.6 e Design §14.2/§16.2 revisados (validados com o usuário via mock em HTML antes desta task, decisão registrada aqui):

- Remove `ValorComposto` (subtexto de composição real/estimado) e `LinhaMes`'s grid de 3 colunas iguais. Cada card passa a ter: mês à esquerda (nome em destaque, ano em `text-muted-foreground`) — no desktop empilhado em duas linhas com largura fixa pra padronizar o card, no mobile lado a lado numa linha só separado por ponto (`Agosto · 2026`), mesmas cores/tamanhos nos dois casos; três indicadores compactos ícone + valor ao centro — Entradas (`ArrowDownCircle`, `text-entrada`), Saídas (`ArrowUpCircle`, `text-muted-foreground` — sem token de cor único pra "saída" combinada de débito+crédito, ver justificativa em Design §14.2), Investimentos (`PiggyBank`, `text-investimento`), mostrando `R$ 0` quando o mês não teve nenhum; Disponível em destaque à direita (`text-xl font-semibold`, mantendo `DisponivelComDelta` — cor `text-destructive` só quando negativo, seta de simulação quando houver).
- Cada indicador usa `title` no elemento (nome do indicador) como alternativa textual ao ícone, já que o rótulo em texto sai do layout.
- `mes.investimentos` (já devolvido por `comporMes`, Design §13.3) passa a ser consumido nesta tela pela primeira vez — nenhuma mudança em `lib/projecao.js`.
- Sem mudança na tela "Antes" (Visão mensal) nem na simulação (§14.3) — só o card de mês da Projeção muda.

*(Checkpoint sugerido: critérios de aceite revisados da Projeção — spec-01 §6.)*

**Task 71. Simetria dos indicadores no mobile e rótulo do Disponível — card de mês da Projeção**
✅ **Concluída** — commit `fab9162`
Achado do usuário em uso real: no mobile, os três indicadores (Entradas/Saídas/Investimentos) do card de mês quebravam em duas linhas assimétricas (2 numa linha, 1 sozinho embaixo), e o valor de Disponível não tinha nenhuma indicação textual do que representava. Design §14.2 revisado com as duas correções, validadas com o usuário via mock em HTML (comparação de alternativas + validação em escala real no pior caso) antes desta task:

- **`Indicador` (`projecao-client.jsx`):** fonte e ícone ganham valores menores só no mobile, mantendo o desktop inalterado — `text-[11px] md:text-sm`, `h-3.5 w-3.5 md:h-4 md:w-4`, `gap-1 md:gap-1.5`. O valor mantém `tabular-nums`.
- **Container dos indicadores em `LinhaMes`:** troca `flex-wrap gap-x-5 gap-y-1.5` por `flex-nowrap gap-x-2 md:gap-x-5` — nunca mais quebra entre os três, em nenhum breakpoint. `gap-y-1.5` sai (não há mais wrap, não há mais segunda linha).
- **`DisponivelComDelta`:** ganha uma legenda `text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-0.5` com o texto "Disponível", numa linha própria acima do valor (`text-xl font-semibold`, mantendo a regra de `text-destructive` quando negativo e o delta de simulação quando houver). Alinhamento herdado do container pai (`md:ml-auto md:text-right` em `LinhaMes`, já existente) — sem classe nova de alinhamento na legenda.
- Sem mudança em `lib/projecao.js` nem nos outros cards/telas — só o `LinhaMes` da Projeção.

*(Checkpoint sugerido: critérios de aceite revisados da Projeção — spec-01 §6. QA de interface obrigatório — mudança de UI — cobrindo especificamente o viewport 393px com um mês de valores de 5 dígitos, pra confirmar visualmente o que já foi validado por medição.)*

**Task 72. Gráfico de Disponível da Projeção migra pra Recharts**
✅ **Concluída** — commit `ca763b4`
O gráfico de barras do topo da Projeção era `div` + CSS puro (Task 62), deliberadamente simples pra não reintroduzir a dependência `recharts` (órfã desde a Task 21). A pedido do usuário, evolui pra algo mais robusto — eixo, tooltip, indicador de estado — o que muda esse cálculo. Design §1 e §14.2 revisados (entrevista de requisitos + mock em HTML validados com o usuário antes desta task):

- **Dependência:** `npm install recharts` — reintroduzida, escopada só a este gráfico (Design §1). A Visão mensal continua sem gráficos (Requisitos, item 7, inalterado).
- **`GraficoDisponivel` (`projecao-client.jsx`):** substitui a implementação em `div`+CSS por `ResponsiveContainer` + `BarChart`/`Bar`/`XAxis`/`Tooltip` do Recharts. Uma série só, `disponivelExibido` (o mesmo valor já calculado hoje) — sem quebra por categoria. `ALTURA_BARRA_PX` e o cálculo manual de `maiorAbsoluto`/`alturaPx` saem — o domínio escala automaticamente.
- **Cor por `Cell`:** `fill="var(--entrada)"` (`disponivelExibido >= 0`, não simulado), `fill="var(--destructive)"` (`< 0`, não simulado), `fill="var(--periodo-fg)"` (`mes.simulado`, qualquer sinal — resolve o cruzamento do zero sem precisar empilhar, ver Design §14.2). Usa a variável CSS direto no `fill`, não classe Tailwind (Recharts não aceita classe ali).
- **Indicador "Simulado":** chip de cor (`var(--periodo-fg)`) + texto "Simulado", **igual no desktop e no mobile**, renderizado condicionalmente (`meses.some(m => m.simulado)`) acima do gráfico. Substitui o contorno `ring-2 ring-inset ring-primary` e a frase de rodapé condicional atuais — ambos saem. Sem legenda pra positivo/negativo.
- **Eixo Y — só desktop:** `YAxis` com formatador próprio sem centavos (função local, não `formatarReais`) e `CartesianGrid`, renderizados condicionalmente via detecção de largura em runtime — reaproveita o padrão de `BREAKPOINT_MD_PX`/`window.innerWidth` já usado em `useSwipeMes` (`visao-mensal-client.jsx`), já que Tailwind não consegue condicionar isso (Recharts não lê classes `md:`). Eixo X (mês abreviado) continua em ambos.
- **Tooltip customizado** (`content={<TooltipDisponivel />}` ou equivalente): `Mês/Ano` + `formatarReais(disponivel)` quando não simulado; `formatarReais(disponivel)} → ${formatarReais(disponivelSimulado)}` quando simulado — mesmo formato "antes → depois" de `DisponivelComDelta`. Sem `onClick` nas barras — não navega.
- **Acessibilidade:** `<title>` SVG (ou `aria-label`) em cada barra, com o mesmo texto do tooltip — fallback pro Tooltip do Recharts não ser acessível via teclado/leitor de tela, mesmo padrão já usado nos indicadores dos cards.
- **Sem animação:** `isAnimationActive={false}` nas barras — recalcular a simulação deve continuar instantâneo.
- Sem mudança em `lib/projecao.js`, no formulário de simulação, nem na lista de cards de mês — só o `GraficoDisponivel`.

*(Checkpoint sugerido: critérios de aceite revisados da Projeção — spec-01 §6. QA de interface obrigatório — mudança de UI — cobrindo desktop [eixo, tooltip, indicador] e mobile [sem eixo, tooltip no toque], com e sem simulação ativa, incluindo um mês que a simulação empurra de positivo pra negativo.)*

**Task 73. Consolidação mensal de receita padrão, por item**
✅ **Concluída** — commit `d656e83`
Receita padrão é sempre o valor cheio em todo mês, puramente aditiva — diferente de despesa padrão, cujo teto é naturalmente consumido pelo real. Isso tira do usuário a possibilidade de registrar um mês com renda menor que o padrão, e torna pouco intuitivo registrar uma renda maior (exige calcular a diferença manualmente). Requisitos 3.8 e Design §3/§13.5 (schema `ConsolidacaoValorPadrao`) revisados, validados com o usuário numa entrevista de requisitos aprofundada + mock em HTML interativo, antes desta task:

- **Schema:** novo model `ConsolidacaoValorPadrao` (`valorPadraoId`, `mesReferencia`, `anoReferencia`, `valor`, `@@unique([valorPadraoId, mesReferencia, anoReferencia])`) — migration nova. **Não** é um campo em `ValorPadrao`, **não** é uma `Transacao` (ver Design §13.5 pros dois "porquês").
- **`comporMes` (`lib/projecao.js`):** ganha o parâmetro `consolidacoes` (mesmo padrão de `transacoes` — lista bruta, filtrada internamente por mês). `entradaPadrao` passa a ser calculado por item: usa `consolidacao.valor` quando existir uma pra `(item.id, mesReferencia, anoReferencia)`, senão `item.valor`. `lib/projecao.test.js` ganha os 4 casos novos do Design §13.4 (12-15).
- **`app/(protegido)/visao-mensal/page.jsx` e `app/(protegido)/projecao/page.jsx`:** ambos buscam `db.consolidacaoValorPadrao.findMany(...)` (Visão mensal filtrando o mês em exibição; Projeção, a janela de 12 meses, mesmo padrão `OR` já usado pra `transacoes`) e passam pra `comporMes`. Visão mensal **também** monta a lista de itens de receita padrão (`id`, `descricao`, valor resolvido do mês) fora de `comporMes`, só pra essa tela — Projeção não muda em mais nada, já consome só o agregado.
- **`visao-mensal-client.jsx`:** `LinhaReceitaPadrao` (linha agregada) sai; entra uma lista, um item de receita padrão por linha, sempre visível quando o bloco Entradas está expandido. Cada linha: descrição do item (não mais rótulo genérico "Receita padrão") + valor resolvido, sem marcação visual entre consolidado/genérico. **Um único divider** fecha o bloco de itens (não entre os itens em si) — separa o bloco inteiro dos lançamentos reais agrupados por dia abaixo. **`DetalheDiario` e o agrupamento por dia dos lançamentos reais não mudam em nada.**
- **Edição inline por ícone de lápis:** cada linha ganha um botão-ícone `Pencil` (`lucide-react`, discreto, antes do valor) que troca só aquela linha por um formulário compacto — campo de valor + botões-ícone `Check`/`X` (Salvar/Cancelar), sem campo de descrição. Quando o item já tem consolidação ativa nesse mês, o formulário ganha um link "usar padrão (R$ X)" que remove a consolidação imediatamente.
- **`CampoValor` (`components/campo-valor.jsx`):** ganha um prop `label` opcional — quando omitido, não renderiza o `<Label>` (usa `aria-label` no input em vez disso), pra caber no espaço inline da edição por lápis. Uso existente (Valores padrão, lançamento, simulação) continua passando `label` normalmente, sem mudança de comportamento.
- **Server Actions novas** (`lib/actions/valores-padrao.js` ou arquivo dedicado): `consolidarValorPadrao` (`upsert` por `valorPadraoId`+mês+ano, valida sessão e `tipo === "ENTRADA"`) e `removerConsolidacaoValorPadrao` (apaga a linha). Ambas seguidas de `router.refresh()` no cliente.
- Nenhuma mudança em despesa padrão, na tela Valores padrão, nem em `/transacoes`.

*(Checkpoint sugerido: critérios de aceite revisados da seção 3.8 — spec-01 §6. QA de interface obrigatório — mudança de UI e mutação de dado — cobrindo: consolidar um item, ver o valor refletido na Visão mensal e na Projeção (mesmo mês), remover a consolidação e confirmar volta ao valor genérico, um mês com consolidação sobrevivendo ao fechamento do mês, e confirmação de que o agrupamento por dia dos lançamentos reais permanece idêntico ao de antes da task.)*

---

**Task 74. Correção: `dataCompra`/`dataEfetiva` gravadas/exibidas um dia a menos em produção**
✅ **Concluída** — commit `182235d`
Bug reportado pelo usuário — investigado, causa raiz confirmada por reprodução controlada (servidor com `TZ=UTC` forçado + navegador simulando fuso do Brasil), corrigido e revalidado com o mesmo cenário antes desta task. Design §1 revisado (nova subseção "Fuso do servidor").

- **Causa:** `paraData()` (`lib/actions/transacoes.js`) constrói a data com `new Date(ano, mes-1, dia)`, que resolve no fuso do processo. Servidor na Vercel roda em UTC; a exibição/edição acontece em Client Components, no fuso do navegador (Brasil). O valor gravado é tecnicamente correto (meia-noite UTC do dia certo), mas toda leitura no navegador mostra o dia anterior — e o modal de edição reenvia essa data já errada se salva sem alteração, andando a data real pra trás a cada edição.
- **Correção:** `process.env.TZ = "America/Sao_Paulo"` fixado em `lib/db.js` (módulo importado por toda Server Action/Server Component que lida com data) — não como variável de ambiente, porque a **Vercel bloqueia `TZ` por ser reservada internamente**. Nenhuma mudança em `paraData`, `calcularFatura`, ou qualquer lógica de data existente — só o fuso do processo em si.
- Reversão das tentativas anteriores de configurar `TZ` via `.env`/`.env.example` (não teriam efeito de qualquer forma — `.env` não sobrescreve uma variável já presente no processo, e a Vercel não aceita a variável).
- Sem mudança em `mesReferencia`/`anoReferencia` — já eram calculados corretamente no servidor a partir da data original, antes de qualquer releitura; o bug era só na data de calendário exibida/gravada, não na lógica financeira de qual mês cada transação conta.

*(Checkpoint: reprodução controlada — servidor iniciado com `TZ=UTC` forçado no shell (simulando o runtime da Vercel) + Playwright com `timezoneId: "America/Sao_Paulo"` — confirmando que uma data digitada é gravada e exibida de volta como o mesmo dia, sem a correção depender de nenhuma variável de ambiente. Suite de testes completa, sem mudança de comportamento nela — os testes de `lib/` são funções puras sem I/O, não importam `lib/db.js`.)*

---

**Task 75. Ícones no lugar de botões de texto e ações de criar/editar mais acessíveis — Valores padrão e Contas**
✅ **Concluída** — commit `bc2d6a6`
Os botões "Editar"/"Apagar" (texto + cor sólida) por linha poluem visualmente as duas telas, e o gatilho de criar item fica escondido — no fim de cada lista em Valores padrão, atrás de um wizard de 2 etapas em Contas. Design §8.2.3 e §15.4 revisados, validados com o usuário via mock em HTML interativo (antes/depois nas duas telas) antes desta task:

- **Ícones (`valores-padrao-client.jsx` e `contas-client.jsx`):** `LinhaValorPadrao` e `SecaoContas` trocam os `Button` de texto ("Editar" outline, "Apagar" destructive) por botões-ícone discretos — `Pencil`/`Trash2` (`lucide-react`), `text-muted-foreground` em repouso; hover leva editar a `text-foreground` e apagar a um tom vermelho suave (não mais o vermelho sólido do botão antigo). `window.confirm` antes de apagar continua idêntico — só o gatilho visual muda.
- **Valores padrão — "+" no cabeçalho:** `ListaValoresPadrao` move o gatilho de adicionar do fim do `CardContent` pro `CardHeader` (`justify-between`, "+" ao lado do título "Receitas padrão"/"Despesas padrão"). Quando `adicionando`, `FormularioInline` passa a renderizar **antes** de `itens.map(...)` (topo da lista), não depois.
- **Contas — edição vira inline:** `EditarContaDialog`/`EditarContaConteudo` saem; `SecaoContas` ganha um estado de "qual conta está em edição" (mesmo espírito de `editandoId` em `ListaValoresPadrao`) e troca a linha da conta por um formulário inline reaproveitando `CamposConta`, mesma estrutura de `FormularioInline`. A regra de campos bloqueados quando a conta tem transações (Design §17.4) continua idêntica, só muda o container visual (inline em vez de dentro de um `Dialog`).
- **Contas — criação vira por seção, sem escolha de tipo:** o botão global "+ Nova conta" (`flex justify-end` no topo da página) e `NovaContaDialog` (com sua etapa `escolherTipo`) saem. Cada `SecaoContas` (Contas correntes, Cartões de crédito, Contas de investimento) ganha seu próprio "+" no `CardHeader`, que abre `CamposConta` **inline, no topo da lista daquela seção**, já com o `tipo` implícito pela seção clicada — sem tela/etapa intermediária de escolha.
- Nenhuma mudança nas Server Actions (`criarConta`, `editarConta`, `apagarConta`, `criarValorPadrao`, `editarValorPadrao`, `apagarValorPadrao`) nem no schema — a task é inteiramente de UI/mecanismo de interação nos dois Client Components.

*(Checkpoint sugerido: critérios de aceite revisados de Contas — spec-01 item 5 e §6. QA de interface obrigatório — mudança de UI e mutação de dado — cobrindo: criar uma conta de cada tipo pelo "+" da seção correta (confirmando que o tipo vem certo, sem etapa de escolha), editar uma conta bloqueada (campos desabilitados) e uma não bloqueada, apagar uma conta, e o mesmo roteiro (criar via "+" do cabeçalho, editar, apagar) para receita padrão e despesa padrão em Valores padrão.)*

---

## M18 — Consolidação de despesa padrão no débito ✅

Quatro tasks que entregam a funcionalidade descrita em Requisitos 3.9 e Design §13.6, validada com o usuário numa entrevista de requisitos aprofundada + mock em HTML interativo antes de qualquer código. A ordem é de dependência: refatoração e campo novo primeiro, regra e schema depois, superfície da funcionalidade por último.

**Task 76. Renomear `ConsolidacaoValorPadrao` → `ConsolidacaoReceitaPadrao`**
✅ **Concluída** — commit `bc2d6a6`
Refatoração pura, **sem nenhuma mudança de comportamento**, preparando terreno pra `ConsolidacaoDespesaPadrao` (Task 78): com duas consolidações de naturezas diferentes, o nome genérico atual (que na prática é receita-only) vira ambíguo. Design §3 e §13.5 revisados.

- **Schema/migration:** renomeia o model e a tabela. A relação em `ValorPadrao` passa de `consolidacoes` para `consolidacoesReceita`.
- **Server Actions (`lib/actions/valores-padrao.js`):** `consolidarValorPadrao` → `consolidarReceitaPadrao`; `removerConsolidacaoValorPadrao` → `removerConsolidacaoReceitaPadrao`.
- **Chamadas:** `visao-mensal-client.jsx` (os dois imports e usos em `LinhaItemReceitaPadrao`), `db.consolidacaoValorPadrao.findMany` em `visao-mensal/page.jsx` e `projecao/page.jsx`, e o `deleteMany` dentro de `apagarValorPadrao`.
- **`lib/projecao.js`:** nada muda ainda — o parâmetro `consolidacoes` de `comporMes` só é renomeado na Task 78, quando passa a existir um segundo. Manter aqui evitaria um rename em duas etapas, mas misturaria refatoração com mudança de regra.
- Tasks 73 e anteriores em spec-03 **mantêm o nome antigo** no texto, como registro histórico — mesmo padrão dos renames de rota (Tasks 20 e 68).

*(Checkpoint: lint + testes + build. QA de interface leve — consolidar e remover uma receita padrão na Visão mensal continua funcionando exatamente como antes; nenhum comportamento novo a validar.)*

**Task 77. `ValorPadrao` ganha categoria**
✅ **Concluída** — commit `bc2d6a6`
Prepara a consolidação de despesa (Task 79), que precisa de uma categoria pra criar o lançamento — `Transacao.categoria` é obrigatória e `ValorPadrao` não tinha nenhuma. Reabre parcialmente um item listado como fora do escopo no spec-01 (só categoria; a conta continua sendo escolhida na hora de consolidar). Design §3 e §15.4 revisados.

- **Schema/migration:** `ValorPadrao.categoria Categoria?` — nulável, usada só quando `tipo = SAIDA`.
- **`valores-padrao-client.jsx`:** o `FormularioInline` de despesa ganha um `Select` de Categoria (mesmas opções de `CATEGORIA_LABELS` já usadas em `/lancamento`), ao lado do seletor Crédito/Débito. Receita padrão não exibe o campo. Default `OUTROS` ao criar.
- **`LinhaValorPadrao`:** o subtexto da despesa passa a exibir a categoria junto do meio (ex.: `R$ 1.500,00 · Débito · Mercado`).
- **Server Actions:** `criarValorPadrao`/`editarValorPadrao` passam a aceitar e validar `categoria` — obrigatória quando `tipo = SAIDA`, forçada a `null` quando `ENTRADA` (mesmo padrão já usado para `meio`).
- Nenhuma mudança em `comporMes` — a categoria não participa de cálculo nenhum, só de exibição e do pré-preenchimento futuro.

*(Checkpoint: critério de aceite de Valores padrão — spec-01 §6. QA de interface: criar uma despesa padrão com categoria, editar trocando a categoria, e confirmar que receita padrão não pede o campo.)*

**Task 78. Schema da consolidação de despesa e a virada da regra do débito**
✅ **Concluída** — commit `bc2d6a6`
Entrega o modelo de dados e a regra de negócio, **sem superfície de uso** — nada ainda cria consolidações. Requisitos 3.5 (revisado) e 3.9, Design §3, §13.3, §13.4 e §13.6.

- **Schema/migration:** novo model `ConsolidacaoDespesaPadrao` (`valorPadraoId`, `mesReferencia`, `anoReferencia`, `transacaoId String? @unique` com `onDelete: Cascade`, `@@unique([valorPadraoId, mesReferencia, anoReferencia])`). **Sem coluna `valor`** — quando há transação, o valor é o dela (ver Design §3 pro porquê). `Transacao` ganha a relação inversa `consolidacaoDespesa`.
- **`comporMes` (`lib/projecao.js`):** `comporSaidas(meio)` se divide em `comporCredito()` e `comporDebito()`. Crédito mantém a regra de teto, idêntica. Débito passa a `real` = todos os lançamentos de débito do mês; `estimado` = soma dos itens padrão de débito **sem** consolidação naquele mês (zero se `debitoAindaEstimavel` for falso). Nenhum lançamento consome nada no débito.
- **Parâmetros:** `consolidacoes` vira `consolidacoesReceita`, e entra `consolidacoesDespesa` (ambos com o mesmo padrão de lista bruta filtrada internamente).
- **`visao-mensal/page.jsx` e `projecao/page.jsx`:** passam a buscar e repassar `consolidacoesDespesa` (Visão mensal pelo mês exibido; Projeção pela janela de 12 meses).
- **`apagarValorPadrao`:** o `deleteMany` dentro da `$transaction` passa a apagar também as consolidações de despesa do item. As transações vinculadas **sobrevivem** (Requisitos 3.9) — e, por deixarem de ser consolidações, voltam a aparecer no agrupamento por dia.
- **`lib/projecao.test.js`:** 9 casos novos (16 a 24 do Design §13.4), cobrindo a inversão no débito (avulso/recorrência não consomem, real acima da previsão não zera), item consolidado, consolidação por R$ 0, vazamento entre meses e a não-contaminação do crédito. Os casos 2-5 existentes ganham a marcação de que valem **só para crédito**.

> **Atenção ao deploy:** entre esta task e a 79 o total de Saídas no débito fica **inflado** nos meses com gasto real — a previsão passa a somar cheia, mas ainda não existe como consolidar nada. Publicar as duas juntas, ou publicar a 79 logo em seguida.

*(Checkpoint: critérios de aceite revisados de valores padrão — spec-01 §6. Sem QA de interface — não há tela nova; lint + testes + build bastam, e os 9 casos novos do Vitest são a evidência principal.)*

**Task 79. Checklist de despesas padrão na Visão mensal**
✅ **Concluída** — commit `bc2d6a6`
A superfície da funcionalidade: consolidar, editar, desfazer e acompanhar o que falta pagar. Layout **fiel ao mock validado com o usuário** (Design §13.6, que descreve cada elemento).

- **Server Actions (`lib/actions/valores-padrao.js`):** `consolidarDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia, valor, data, contaId, categoria })` e `removerConsolidacaoDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia })`. A primeira valida sessão, `tipo === "SAIDA" && meio === "DEBITO"`, conta `CONTA_CORRENTE` e **data dentro do mês exibido** (sem isso o lançamento nasce em outro mês e some da lista, sem erro aparente). Cria/atualiza a `Transacao` e faz `upsert` do registro numa `$transaction`; com valor zero não cria transação e apaga a que existir. Ambas revalidam `/visao-mensal`, `/projecao` e `/transacoes`.
- **`buscarSaidasDebito` (`lib/consolidacao.js`):** ganha `consolidacaoDespesa: null` no `where` — tira os lançamentos consolidados do agrupamento por dia. `/transacoes` **não** filtra.
- **`visao-mensal/page.jsx`:** monta `itensDespesaPadraoDebito` (`id`, `descricao`, `categoria`, `valorPadrao`, e quando consolidado `valor`/`data`/`contaId` vindos da transação — `contaId` pré-preenche a conta no formulário ao editar), na mesma composição que já monta `itensReceitaPadrao`.
- **`visao-mensal-client.jsx`:** `BlocoPorDia` do débito passa a renderizar a lista **antes** dos grupos por dia, com rótulo de seção `Despesas padrão`, seguida do divisor tracejado. `LinhaEstimado` deixa de ser usada no débito (continua no crédito, sem mudança). Cada linha: botão-ícone `Circle`/`CheckCircle2` (estado **e** gatilho), descrição, data (só quando pago com lançamento), valor — item pago inteiro em `text-muted-foreground`, pendente na cor normal. Em mês encerrado, pendente exibe `não registrado` no lugar do valor.
- **Formulário inline:** valor (`CampoValor`), data, conta corrente (`Select` só de `CONTA_CORRENTE`) e categoria (`Select` pré-preenchido pelo item). Ações `Cancelar`/`Consolidar`; quando o item já está resolvido, o primário vira `Salvar` e aparece à esquerda **`Apagar lançamento`** (ou **`Desfazer`**, quando resolvido por R$ 0 — não há lançamento a apagar). O rótulo é explícito de propósito: um "Apagar" solo se leria como apagar o item padrão, que é global.
- **Confirmações (`window.confirm`):** antes de apagar o lançamento, e antes de salvar com R$ 0 um item que tinha lançamento — este é uma exclusão de transação disparada por edição de valor, destrutiva demais pra acontecer em silêncio.
- Despesa padrão no **crédito** não ganha nada disso; o bloco de crédito fica idêntico.

*(Checkpoint: critérios de aceite da seção 3.9 — spec-01 §6. QA de interface obrigatório, cobrindo: consolidar um item e ver o lançamento sair do agrupamento por dia mas aparecer em /transações; editar o valor consolidado; apagar o lançamento e ver o item voltar a pendente; apagar o mesmo lançamento por /transações e confirmar o mesmo efeito; consolidar por R$ 0 e confirmar que nenhuma transação foi criada; data fora do mês rejeitada; e um mês encerrado exibindo "não registrado" sem somar ao total.)*

## M19 — Lançamento: persistência de Tipo/Conta/Data após salvar ✅

**Task 80. Formulário de lançamento mantém Tipo, Conta e Data ao salvar**
✅ **Concluída** — commit `08ff96c`
Reduz a repetição ao lançar várias transações seguidas com a mesma conta/data (ex.: várias compras no mesmo cartão, no mesmo dia). Requisitos item 2 (revisado), Design §8.1 (revisado).

- **`lancamento-client.jsx`:** `handleSubmit`, ao concluir com sucesso, deixa de resetar pra `FORM_INICIAL` fixo — passa a resetar pro padrão preservando `tipo`, `contaId` e `dataCompra` do estado atual (os demais campos, incluindo checkboxes de investimento/parcelado/recorrente e seus campos dependentes, voltam ao padrão).
- Nenhuma mudança de validação ou nas Server Actions — é só o valor inicial do próximo preenchimento.

*(Checkpoint: critério de aceite do item 2 — spec-01 §6. QA de interface: salvar um lançamento e confirmar que Tipo/Conta/Data continuam preenchidos, e que valor/categoria/descrição/checkboxes voltam ao padrão.)*

## M20 — Correção: agrupamento por dia herdava horário de lançamento antigo ✅

**Task 81. `agruparPorDia` deriva o dia exibido da chave, não da data bruta de uma transação**
✅ **Concluída** — commit `0da0777`
Bug reportado pelo usuário — investigado, causa raiz confirmada por reprodução controlada, corrigido e revalidado antes desta task. Design §1 revisado (nova subseção logo após "Fuso do servidor").

- **Causa:** `agruparPorDia` (`lib/consolidacao.js`, usada por Entradas/Débito/Crédito) agrupa por `dataCompra.toISOString().slice(0,10)` (chave estável), mas exibe `dia: transacao.dataCompra` da **primeira** transação (por `dataCompra` crescente) que cria o grupo. Lançamentos gravados **antes** da Task 74 continuam em meia-noite UTC literal (`T00:00:00.000Z`) — sempre ordenam antes de um lançamento novo e correto do mesmo dia (`T03:00:00.000Z`) — e, exibida em `toLocaleDateString("pt-BR")` no fuso de São Paulo, meia-noite UTC literal volta um dia. O cabeçalho do grupo inteiro herda essa data errada, mesmo pra transações do grupo gravadas certinho. Reproduzido consultando os dados reais de produção (só leitura, credenciais rotacionadas logo em seguida).
- **Correção:** `agruparPorDia` reconstrói o `dia` exibido a partir da própria chave (`"YYYY-MM-DD"` → `new Date(ano, mes-1, dia)`, construção local, mesmo padrão de `paraData`) em vez de reaproveitar a data bruta de uma transação do grupo. Nenhuma mudança na chave de agrupamento em si, em `mesReferencia`/`anoReferencia`, ou em qualquer Server Action.
- Sem migração de dados — os valores antigos (`T00:00:00.000Z`) continuam gravados como estão; a correção torna a **exibição agrupada** robusta a essa mistura, sem depender de corrigir cada linha antiga.

*(Checkpoint: reprodução controlada — replicação de `agruparPorDia` rodada contra os dados reais de produção (mês/ano do caso relatado), confirmando o cabeçalho errado antes da correção e o cabeçalho correto depois, com o mesmo conjunto de dados. Suite de testes completa. QA de interface leve — criar dois lançamentos de crédito no mesmo dia com horários UTC distintos (simulando a mistura antigo/novo) e confirmar que o cabeçalho do dia exibe a data correta.)*

---

## M21 — Acompanhamento de fatura por cartão na Visão mensal ✅

Duas tasks entregando a funcionalidade descrita em Requisitos 3.1 (revisado) e Design §8.3.7/§8.3.16, validadas com o usuário numa entrevista de requisitos + mock em HTML interativo (duas rodadas: mecanismo de alternância, depois o card por seção) antes de qualquer código. Ordem de dependência: o container visual (card por seção) primeiro, a funcionalidade nova (alternância por cartão) depois — a Task 83 já assume que "Saídas no crédito" é um card.

**Task 82. Cada seção da Visão mensal vira um card independente**
✅ **Concluída** — commit `bd0ef78`
Puramente visual — **sem mudança de comportamento, dado ou lógica**. Design §8.3.7 revisado.

- **`visao-mensal-client.jsx`:** o container `<div className="flex flex-col divide-y divide-border mt-8">` que hoje envolve os quatro blocos (`BlocoPorDia`×3 + `BlocoInvestimentos`) é substituído por `<div className="flex flex-col gap-6 mt-8">` (mesmo `gap-6` já usado no grid do resumo, seção 8.3.2). Cada bloco (`BlocoPorDia`, `BlocoInvestimentos`) passa a renderizar sua própria `<section>` como um `Card` do shadcn/ui (`components/ui/card.jsx`, já usado no resumo) em vez do `<section className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0">` atual — cabeçalho (`CabecalhoBloco`) e corpo continuam com a mesma estrutura interna, só a casca visual muda (borda + `rounded-lg` + padding do `Card`/`CardContent`, no lugar do `divide-y`/`py-6`).
- **Sem mudança em:** `CabecalhoBloco`, `ListaReceitaPadrao`, `ListaDespesaPadrao`, `DetalheDiario`, `LinhaEstimado`, nenhuma Server Action, nenhuma query. É troca de wrapper, não de conteúdo.

*(Checkpoint: critério de aceite revisado da Visão mensal — spec-01 §6 (novo bullet "cada bloco é um card independente"). QA de interface: confirmar visualmente os quatro blocos como cards distintos (borda + espaçamento entre eles, sem `divide-y`), expandir/recolher cada um, e conferir que nenhum dado/total mudou — é regressão pura de layout.)*

---

**Task 83. Alternância "Por dia" / "Por cartão" no bloco Saídas no crédito**
✅ **Concluída** — commit `e71445c`
A funcionalidade em si: apoiar a conferência manual dos lançamentos do app contra a fatura do banco. Design §8.3.16 (que descreve cada elemento fielmente ao mock validado com o usuário).

- **`visao-mensal-client.jsx`:** o corpo do bloco "Saídas no crédito" ganha duas abas construídas à mão ("Por dia" / "Por cartão", sem nova dependência — Design §8.3.16), estado local (`useState`) controlando qual vista está ativa, default "Por dia". A vista "Por dia" é o `DetalheDiario` já existente, sem mudança. A vista "Por cartão" é um componente novo (`ListaPorCartao` ou nome equivalente) que reagrupa as mesmas `saidasCredito` já recebidas via prop — **sem nova busca** — por `transacao.conta.id`/`conta.nome`, omitindo cartões sem lançamento no mês. Cada subgrupo: cabeçalho com ícone `CreditCard` (`text-muted-foreground`, não a cor de destaque do bloco) + nome do cartão + total do subgrupo em destaque; lista de lançamentos (descrição, `DD/MM`, valor) em ordem crescente por `dataCompra`, sem agrupar por dia; divisor tracejado entre subgrupos consecutivos.
- **`LinhaEstimado` ("Estimado restante"):** permanece fora da área que alterna, ao final do bloco, idêntica nas duas vistas — não reagrupada por cartão.
- **Sem mudança em:** `buscarSaidasCredito` (já traz `conta` via `include`), `comporMes`, nenhuma Server Action, nenhum schema.

*(Checkpoint: critério de aceite da seção 3.1 revisada — spec-01 §6. QA de interface: alternar entre as duas abas e conferir que os totais por cartão somam o total do bloco; um cartão sem lançamento no mês não aparece na vista "Por cartão"; a ordem cronológica dentro de um subgrupo; e que "Estimado restante" não muda ao trocar de aba.)*

---

**Task 84. Tag de parcela nas duas visões do bloco Saídas no crédito**
✅ **Concluída** — commit `dd6d2e2`
Mock em HTML interativo validado com o usuário antes da implementação. Design §8.3.4 e §8.3.16 revisados.

- **Visão "Por dia":** `visao-mensal-client.jsx` passa a fornecer `renderTag` no `BlocoPorDia` de Saídas no crédito (hoje só Entradas usa esse prop, pra `TagResgate`) — retorna a mesma tag pill de `/transacoes` ("X de Y") quando `transacao.numeroParcela` existe, senão `null`. Nenhuma mudança em `DetalheDiario`.
- **Visão "Por cartão":** cada linha de `ListaPorCartao` (Task 83) ganha a mesma tag, ao lado da descrição, com a mesma condição (`numeroParcela` existe).
- Reaproveita o componente/estilo de tag já existente (`BadgeTransacao` em `transacoes-client.jsx`, ou uma cópia local idêntica caso não seja exportável de lá) — sem inventar um novo visual.

*(Checkpoint: critério de aceite revisado da Visão mensal — spec-01 §6. QA de interface: um lançamento parcelado exibe a tag "X de Y" no popover/sheet do dia e, ao trocar pra visão "Por cartão", a mesma tag aparece na linha correspondente; um lançamento não-parcelado não exibe tag em nenhuma das duas visões.)*

---

## M22 — Redução de fricção no lançamento de transações ✅

Três tasks resolvendo Requisitos §3 itens 2, 6, 8 e 11 (revisados) e Design §8.2.4, validadas com o usuário numa entrevista de requisitos + mock em HTML interativo (várias rodadas — mecanismo de alternância de Tipo/Meio, posição do stepper de parcelas, Tipo Investimento) antes de qualquer código. Motivação: o uso mais comum não é um lançamento isolado, é uma sequência de vários lançamentos de crédito em conjunto, olhando a fatura do cartão — cada clique evitável pesa multiplicado pela sequência. Ordem: reorganização geral primeiro (86 e 87 partem do formulário já reorganizado); Investimento e remoção de Recorrência depois, cada uma isolada por tocarem áreas de risco diferentes (schema, em Recorrência).

**Task 85. Reorganização geral do formulário de lançamento**
✅ **Concluída** — commit `5e22765`
Puramente o formulário em si — sem tocar em Investimento (Task 86) nem em Recorrência (Task 87), que continuam exatamente como estão até suas próprias tasks. Design §8.2.4 (que descreve cada elemento fielmente ao mock validado com o usuário).

- **Tipo e Meio viram toggles de um clique** (`lancamento-client.jsx`), substituindo o `Select` de Tipo e introduzindo Meio como campo novo — mesmo padrão de segmented control já usado nesta sessão (crédito/débito da despesa padrão, Tarefa 77). Meio esconde a opção Crédito e força Débito quando Tipo = Entrada (regra de negócio já vigente — "só existe entrada no débito" — hoje só implícita, sem nenhum feedback visual quando violada).
- **Conta e Categoria viram chips** de um clique, substituindo os dois `Select`. Conta continua filtrada pelo Meio (equivalente ao filtro por tipo de conta já existente); trocar o Meio pré-seleciona o primeiro chip visível.
- **Categoria passa a persistir** entre lançamentos — entra no reset seletivo já existente da Task 80 (Tipo/Conta/Data), que passa a incluir Categoria também.
- **Valor e Parcelas se fundem num único campo:** o checkbox "Parcelado" e os campos separados "Nº de parcelas"/"Valor da parcela" saem. Nasce um stepper de parcelas (`−`/`+`) embutido dentro do próprio campo Valor (canto direito, via `position: relative`/`absolute`), visível só quando Meio = Crédito, começando em 1. `parcelas > 1`: rótulo do campo vira "Valor da parcela", nasce uma legenda abaixo do campo com o total calculado em tempo real (`Nx de R$ X = R$ Y`), força Tipo = Saída, e trava (desabilita, via `pointer-events: none` + opacidade reduzida) o toggle de Tipo enquanto ativo. **Nenhuma mudança** em `criarTransacaoParcelada` nem no algoritmo de `gerarParcelas` (Design §5.1) — só a decisão "isso é parcelado" migra do estado do checkbox pro estado do stepper (`parcelas > 1` no lugar de `form.parcelado`).
- **Data ganha navegação rápida:** botões `‹`/`›` (dia anterior/seguinte) flanqueando o `<input type="date">`, mesmo padrão visual do seletor de período da Visão mensal (sem reaproveitar o componente em si, só o padrão visual — contextos diferentes).
- **Ordem dos campos:** Tipo → Meio → Conta → Categoria → Valor (+ parcelas) → Descrição → Data → "Lançar" (Categoria muda de posição — hoje vem depois de Valor).
- **Foco automático:** após salvar com sucesso, o foco do teclado volta pro campo Valor (hoje fica parado no botão "Lançar").
- **Sem menu avançado:** nenhuma opção fica escondida atrás de um accordion/"Mais opções" — tudo permanece visível no fluxo do formulário (o bloco de Parcelado/Recorrente/Investimento que hoje existe dentro de um `<div className="rounded-md border p-4">` condicional sai dessa estrutura).
- **Sem mudança em:** schema, Server Actions (além do já citado não-uso do parâmetro de recorrência, que sai só na Task 87), `/transacoes`, `/visao-mensal`.

*(Checkpoint: critério de aceite revisado do item 2 — spec-01 §6. QA de interface: alternar Tipo/Meio/Conta/Categoria só de clique; lançar uma saída simples e confirmar reset seletivo (Valor/Descrição limpos, Tipo/Conta/Categoria/Data mantidos) e foco de volta no Valor; lançar uma compra parcelada (parcelas > 1) e confirmar o total calculado, o Tipo travado em Saída, e que `criarTransacaoParcelada` recebe os valores certos; navegar a Data pelos botões ‹ ›.)*

---

**Task 86. Tipo "Investimento" substitui o checkbox "É investimento"**
✅ **Concluída** — commit `5395a62`
Puramente de apresentação — **sem mudança de schema** (decisão do usuário: manter `TipoTransacao` como `ENTRADA | SAIDA`, gravando aporte exatamente como já é gravado hoje). Parte do formulário já reorganizado pela Task 85. Design §8.2.4.

- **Tipo ganha uma terceira opção, "Investimento"** (ícone `PiggyBank`, mesmo do bloco Investimentos da Visão mensal), ao lado de Entrada/Saída no toggle. Selecioná-la: força Meio = Débito e esconde a opção Crédito (mesma mecânica já usada pra Entrada na Task 85); nasce um campo novo, **"Conta de destino"**, logo abaixo de Conta, com os mesmos chips que hoje ficam sob o checkbox "É investimento" — sempre visíveis nesse contexto, não atrás de mais uma marcação. O rótulo do campo "Conta" vira **"Conta de origem"** enquanto Tipo = Investimento (volta a "Conta" nos outros dois Tipos).
- **Mapeamento interno:** Tipo = Investimento no formulário → `criarTransacao({ tipo: "SAIDA", ehInvestimento: true, contaId: <conta de origem>, contaInvestimentoId: <conta de destino>, ... })` — idêntico ao que o checkbox já produzia. Nenhuma Server Action muda de assinatura.
- **Checkbox "É investimento" e seu campo condicional saem** do formulário — junto com o `marcarInvestimento`/estado `ehInvestimento` do form local (a informação agora vem do Tipo escolhido, não de uma marcação à parte).
- **Resgate não ganha nada dedicado.** Fica sem superfície de uso — `ehInvestimento`/`contaInvestimentoId` numa transação `ENTRADA` continuam existindo no schema (usados pelo lado do aporte, não removíveis), mas a tela de lançamento não oferece mais essa marcação pra entrada. A tag "Resgate de investimento" (Visão mensal, bloco Entradas) só volta a aparecer pra lançamentos antigos que já tinham essa marcação — comportamento aceito explicitamente pelo usuário.

*(Checkpoint: critério de aceite revisado do item 6 — spec-01 §6. QA de interface: escolher Tipo = Investimento, confirmar que "Conta"/"Conta de investimento" viram "Conta de origem"/"Conta de destino", lançar um aporte e confirmar no banco que gravou `tipo: SAIDA, ehInvestimento: true` com as duas contas corretas — idêntico ao que o checkbox antigo gravava; confirmar que uma Entrada comum não tem mais nenhuma opção de conta de investimento.)*

---

**Task 87. Remoção completa de Recorrência**
✅ **Concluída** — commit `4bd9ebe`
A mais arriscada das três — schema, backend e telas. Sem substituto imediato (Requisitos §3, item 11, revisado). Design §5.2 e §8.2.4.

- **Schema/migration:** remove `Transacao.numeroOcorrencia`, `totalOcorrencias`, `recorrenciaId` (+ `@@index([recorrenciaId])`) via `ALTER TABLE ... DROP COLUMN`. Confirmado com o usuário: sem recorrência no débito em produção (nada a preservar ali); no crédito, existem séries já lançadas, mas a única funcionalidade vinculada às três colunas é a tag "X de Y ↻" em `/transacoes` (Design §12.1) — o usuário aceita explicitamente perdê-la. As transações em si (valor, descrição, categoria, data, conta) **não são apagadas**, só a marcação de série.
- **`lib/recorrencia.js`** — arquivo inteiro removido (`gerarOcorrenciasRecorrencia`, `proximaDataMensal`; `ultimoDiaDoMes` continua em `lib/parcelamento.js`, usada só por ele).
- **`lib/actions/transacoes.js`:** `criarTransacaoRecorrente` removida por completo. `grupoDaTransacao` perde o ramo `recorrenciaId` (só considera `parcelamentoId` daqui em diante). `editarTransacao`/`apagarTransacao` simplificam — `propagarParaRestantes` só se aplica a parcelamento.
- **`lancamento-client.jsx`:** checkbox "Recorrente" e campo "Quantidade de meses" saem (já não apareciam mais no crédito desde a revisão intermediária do mock desta sessão — agora saem também do débito, e o código é removido, não só escondido).
- **`transacoes-client.jsx`:** remove a tag "X de Y ↻" (`t.numeroOcorrencia`), o texto "Ocorrência X de Y de uma entrada/saída recorrente..." no modal de edição, e o checkbox "Aplicar às ocorrências restantes" (`ehRecorrencia`) — só a variante de parcela desse texto/checkbox continua.
- **Testes:** `lib/recorrencia.test.js` removido junto com o arquivo que testa.

*(Checkpoint: critério de aceite revisado do item 11 (removido) — spec-01 §6. Migration aplicada e `npx prisma migrate status` confirmando sincronia; suite de testes completa (sem `lib/recorrencia.test.js`); QA de interface: `/lancamento` não oferece mais "Recorrente" em nenhum meio; `/transacoes` não exibe mais a tag "X de Y ↻" nem o texto/checkbox de propagação de recorrência, inclusive numa transação antiga que já era parte de uma série (a tag simplesmente não aparece mais, a transação continua editável/visível normalmente).)*

---

## M23 — Widgets nativos coerentes com o tema escuro ✅

**Task 88. `color-scheme: dark` no `:root`**
✅ **Concluída** — commit `9672ad0`
Fecha uma lacuna do M15: os tokens definem o tema para o *app*, mas nunca informaram o *navegador*, que é quem desenha o interior dos widgets nativos. Design §16.1.

- **`app/globals.css`:** adiciona `color-scheme: dark;` ao bloco `:root`.
- **`lancamento-client.jsx`:** remove o `[color-scheme:dark]` escopado no `<input type="date">` do campo Data, que vira redundante.
- **Efeito medido:** o ícone de calendário dos `<input type="date">` de `/projecao`, `/visao-mensal` e `/transacoes` sai de brilho 48 (sobre fundo 36 — invisível na prática) para 255. O popup do calendário desses campos deixa de abrir branco no meio da aplicação escura. Scrollbars e o preenchimento automático do Chrome no login passam a acompanhar o tema.
- **Sem mudança de comportamento:** `color-scheme` não sobrepõe cor definida pelo autor. Nenhum componente, token ou classe muda além do citado acima.

*(Checkpoint: requisito de tema — spec-01 §4, complementando o M15. QA de interface: comparar o brilho do ícone nos date inputs antes/depois por asserção, não por inspeção visual; confirmar por asserção que `body`, superfície de card, fundo/borda de `Input` e cor de texto permanecem idênticos — a mudança não pode vazar para superfície estilizada pelo app.)*

---

## M24 — Correção: toggle de Tipo estourava a largura no mobile ✅

**Task 89. `ToggleSegmentado` que não vaza com três opções**
✅ **Concluída** — commit `83dad93`
Regressão introduzida pela Task 86, que acrescentou a terceira opção ("Investimento") ao toggle de Tipo sem revisar o comportamento em telas estreitas. Design §8.2.4.

- **Causa raiz:** os botões são itens flex com `flex-1`, mas `min-width` continua no default `auto` — que impede um item flex de encolher abaixo da largura do próprio conteúdo. Com três rótulos, o grupo passava a exigir mais largura do que a coluna tinha e transbordava à direita. Medido: a 320px o container tem 206px e os botões exigiam 274px; **o vazamento começava já em 390px** (4px), ou seja, atingia celulares atuais, não só telas pequenas.
- **Correção estrutural:** `min-w-0` nos botões, que devolve ao flex a permissão de encolher, e rótulo dentro de um `<span className="truncate">`, para degradar com reticências em vez de vazar caso o espaço ainda falte.
- **Ícone só a partir de `sm:`, apenas no toggle de Tipo:** medido que **o ícone é o que não cabe, não a fonte** — com ele, "Investimento" trunca em toda largura de celular testada (320/360/375/390), mesmo reduzindo a fonte a 11px; sem ele, cabe inteiro a 12px a partir de 360px. O rótulo carrega o significado sozinho; o ícone permanece onde há espaço. A supressão é **opt-in** (prop `ocultarIconeNoMobile`) porque `ToggleSegmentado` é compartilhado: o toggle de **Meio** tem só dois rótulos curtos, cabe com ícone inclusive a 320px, e **mantém os ícones em toda largura**.
- **Fonte do toggle para `text-xs`** (12px), aplicada aos dois toggles do formulário (Tipo e Meio) por serem o mesmo componente — mantém a consistência visual entre eles e dá folga para as métricas de fonte de aparelhos reais, diferentes das do ambiente de teste.
- **Limite conhecido e aceito:** a 320px (iPhone SE de 1ª geração) "Investimento" ainda trunca com reticências. O layout permanece íntegro e sem rolagem horizontal — apenas o rótulo aparece cortado. Resolver também esse caso exigiria encurtar o rótulo, decisão de conteúdo que não cabe a esta correção.

*(Checkpoint: QA de interface por asserção em 320/360/375/390/412/1100px — o último botão não pode ultrapassar a borda direita do container, a página não pode ganhar rolagem horizontal, e de 360px para cima nenhum rótulo pode truncar; confirmar que o ícone do Tipo reaparece a partir de `sm:` e que o toggle de Meio mantém o ícone e não trunca em nenhuma largura.)*

---

## M25 — Categorias gerenciáveis pelo usuário ✅

Substitui o `enum Categoria` por uma tabela com CRUD próprio. Requisitos item 4 revisado e §3.10; Design §18.

O marco segue **expandir → migrar → contrair** (Design §18.2): a coluna antiga só é removida na última task, depois que todo o código já usa a nova. Cada task é deployável de forma independente — importante porque o `build` roda `prisma migrate deploy` antes de a nova versão entrar no ar, e uma remoção precoce deixaria produção com código antigo sobre schema novo.

**Task 90. Modelo `Categoria`, seed e backfill (expandir)**
✅ **Concluída** — commit `a646422`
Puramente aditivo — nenhuma tela muda, o enum continua sendo a fonte da verdade. Design §18.1 e §18.2.

- Cria o model `Categoria` (`nome` único, `cor`, `ativa`, `criadoEm`) e os tokens `--categoria-<slug>` da paleta (Design §18.4) em `globals.css` e `tailwind.config.js`.
- Migration semeia as **sete categorias atuais** com os nomes já usados em `CATEGORIA_LABELS` e na ordem do enum (Mercado, Lazer, Saúde, Transporte, Moradia, Salário, Outros), atribuindo uma cor da paleta a cada uma.
- Adiciona `categoriaId` **anulável** em `Transacao` e `ValorPadrao`, com índice, e faz o **backfill** por correspondência com o enum.
- A coluna `categoria` e o `enum Categoria` **permanecem intactos**.

*(Checkpoint: sem QA de interface — nenhuma tela muda. `npx prisma migrate status` sincronizado; verificar por consulta que **nenhuma** `Transacao` ficou com `categoriaId` nulo e que a contagem por categoria antes e depois bate exatamente, categoria a categoria — é a prova de que o histórico foi preservado.)*

---

**Task 91. Tela `/categorias` (CRUD)**
✅ **Concluída** — commit `302f567`
Requisitos §3.10; Design §18.3 e §18.5.

- Rota `/categorias` e entrada na navegação junto de Contas e Valores padrão (Design §8.1).
- Server Actions em `lib/actions/categorias.js`: criar, editar (nome e cor), alternar `ativa`, excluir. `revalidatePath` para `/categorias`, `/lancamento`, `/transacoes`, `/visao-mensal` e `/valores-padrao`.
- Nome único validado na action, com mensagem clara no conflito.
- Exclusão **bloqueada** quando houver `Transacao` ou `ValorPadrao` referenciando a categoria; a mensagem informa **quantos** lançamentos impedem e sugere desativar.
- Inativas aparecem na listagem visualmente distintas, não escondidas.
- Seletor de cor pela paleta fixa (Design §18.4) — sem input de cor livre.

*(Checkpoint: critério de aceite do item 4 revisado. QA de interface: criar, renomear, trocar cor, desativar e reativar; tentar criar nome duplicado e conferir a mensagem; tentar excluir uma categoria em uso e confirmar o bloqueio com a contagem correta; excluir uma categoria sem uso e confirmar a remoção no banco.)*

---

**Task 92. Telas passam a usar `categoriaId` (migrar)**
✅ **Concluída** — commit `9884b77`
O núcleo do marco. Design §18.3.

- `/lancamento`: chips de categoria vêm da tabela, filtrando `ativa = true`; grava `categoriaId`.
- `/transacoes`: coluna e filtro passam a usar a categoria relacionada, **sem** filtrar por `ativa` (histórico precisa continuar consultável). No modal de edição, a categoria atual da transação continua selecionável mesmo se inativa (Design §18.3).
- `/visao-mensal` e `detalhe-diario.jsx`: exibem a categoria relacionada.
- `/valores-padrao` e a consolidação de despesa padrão: passam a usar `categoriaId`, filtrando `ativa` nos formulários.
- Server Actions validam contra a tabela; `CATEGORIA_LABELS` e a lista `CATEGORIAS_VALIDAS` duplicada em `lib/actions/transacoes.js` são removidas.
- Escrita passa a preencher **as duas** colunas enquanto a antiga existir, para não quebrar um eventual rollback desta task.

*(Checkpoint: QA de interface cobrindo as quatro telas — lançar uma transação e conferir no banco `categoriaId` correto; filtrar por categoria em `/transacoes`; confirmar que categoria inativa **não** aparece no formulário de lançamento mas **continua** aparecendo na coluna e no filtro do histórico; editar uma transação de categoria inativa sem trocar a categoria e confirmar que salva sem erro.)*

---

**Task 93. Cor da categoria nas listagens**
✅ **Concluída** — commit `3495944`
Design §18.4.

- Marcador de cor ao lado do nome da categoria na coluna de `/transacoes`, no detalhe diário da Visão mensal e nos chips de `/lancamento`.
- O nome acompanha sempre o marcador — cor nunca é a única portadora de informação (mesmo princípio do §16.2).

*(Checkpoint: QA de interface: confirmar por asserção de cor computada que o marcador reflete a cor da categoria e que trocar a cor em `/categorias` se propaga para as listagens — validando de passagem o `revalidatePath` da Task 91.)*

---

**Task 94. Remoção do enum (contrair)**
✅ **Concluída** — commit `b6058be`
Só depois que as Tasks 92 e 93 estiverem em produção e verificadas. Design §18.2.

- `categoriaId` vira **obrigatório** em `Transacao` (segue anulável em `ValorPadrao`, espelhando a regra atual: obrigatória quando `tipo = SAIDA`, nula quando `ENTRADA`).
- Remove a coluna `categoria` de `Transacao` e `ValorPadrao` e o `enum Categoria` do schema.
- Remove a escrita dupla introduzida na Task 92.

*(Checkpoint: antes de aplicar, confirmar por consulta que nenhuma linha tem `categoriaId` nulo onde ele passará a ser obrigatório — a migration falharia no meio do deploy. `npx prisma migrate status` sincronizado; suite completa; QA de interface rápido nas quatro telas confirmando que nada regrediu.)*

---

## M26 — Instalação como app na tela inicial (PWA instalável) ✅

Resolve o requisito de instalabilidade da spec-01 §4; Design §19. Escopo restrito ao app instalável: **sem service worker, sem offline, sem push** (decisões do usuário registradas nos Requisitos).

Alvo é **iPhone**, por Safari e por Chrome — que no iOS roda sobre WebKit e herda o mesmo comportamento. Isso descarta de saída o prompt automático de instalação (`beforeinstallprompt` é de Chromium e nunca dispara no iOS): instalar é sempre manual, pelo menu Compartilhar.

**Task 95. Manifest, ícones e liberação no middleware**
✅ **Concluída** — commit `b18f39d`
As três coisas numa task só porque, separadas, produziriam um estado quebrado: manifest sem ícone não instala, e qualquer um dos dois bloqueado pelo middleware falha em silêncio. Design §19.1–19.3.

- **Ícones**, gerados a partir de uma fonte única: `apple-touch-icon` 180×180 **opaco** (iOS compõe fundo branco sob transparência, o que num tema escuro criaria moldura branca), mais 192 e 512 para o manifest.
- **`app/manifest.js`** com `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color`/`theme_color` vindos dos tokens do tema (§16.1) e os ícones acima.
- **Meta tags do iOS** no `layout.jsx`: `apple-touch-icon` (o que o iPhone de fato lê — ele **ignora** os `icons` do manifest), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` e `theme-color`. Mantidas junto com o `display` do manifest, não no lugar dele (Design §19.2).
- **`middleware.js`** libera `manifest.webmanifest` e os ícones. Sem isso o navegador recebe um redirecionamento para `/login` no lugar do manifest e a instalação falha sem mensagem alguma.
- **Renomeação do app**, que esta task não tem como evitar — o manifest precisa de `name` e `short_name`. Passa a ser **"Pode Comprá?"**, abreviado **"Pó Comprá?"** sob o ícone (spec-01 §4), no manifest e no `title` do `layout.jsx`. A funcionalidade de simulação perde o apelido `("Can I Buy It?")`, que só existia para ecoar o nome antigo do app — mantê-lo sugeriria que só aquela tela é o "Pode Comprá?". **Repositório e pacote não mudam:** renomear o repositório alteraria a URL do remote e a integração de deploy, risco desproporcional para um nome que ninguém vê.

*(Checkpoint: requisito de instalabilidade — spec-01 §4. QA por asserção: `/manifest.webmanifest` responde 200 com `Content-Type` de manifest e **não** 3xx para o login, tanto autenticado quanto **deslogado**; o JSON traz os campos obrigatórios; cada ícone declarado responde 200, tem as dimensões prometidas e o apple-touch-icon é opaco — verificar o canal alfa, não confiar no arquivo estar certo; as meta tags do iOS aparecem no HTML servido.)*

---

**Task 96. Área segura em modo standalone**
✅ **Concluída** — commit `e81f13a`
Só se manifesta depois de instalado, quando o app passa a ocupar a tela inteira e a moldura do navegador deixa de reservar espaço para a barra de status e o indicador de home. Design §19.4.

- `viewport-fit=cover` no viewport.
- `env(safe-area-inset-top)` no cabeçalho mobile e `env(safe-area-inset-bottom)` na barra de navegação inferior (§15.3) — os dois elementos `fixed` que hoje encostariam nas bordas do sistema.
- Sem tratamento, a barra inferior fica sob o indicador de home, que é exatamente onde estão os alvos de toque mais usados ("Nova", "Dados", "Ajustes").

*(Checkpoint: QA por asserção simulando o recorte — aplicar valores de `safe-area-inset` e confirmar que o preenchimento dos dois elementos fixos responde, e que sem eles nada regride no navegador comum, onde os insets valem zero. A conferência final do recorte real fica no iPhone do usuário, ver Design §19.5.)*

---

## M27 — Estorno no crédito ✅

Resolve Requisitos §3.11 (novo), §3.1 revisado (bloco Entradas só no débito; valores negativos), §3.3 revisado (indicador de estorno) e §3.5 revisado (estorno não devolve teto). Design §6, §8.2.4, §8.3.2, §8.3.16, §8.3.17 (novo), §12.1, §13.3, §13.4.

**Sem migration e sem mudança de Server Action.** Um estorno é uma `Transacao` de `tipo: ENTRADA` com `contaId` de um cartão — já representável, e `criarTransacao` já aceita a combinação (Design §8.2.4). O marco é regra de composição + apresentação.

**A ordem das tasks importa.** A tela de Lançamento vem **por último**, de propósito: até ela, não há como criar um estorno pela interface, então cada task intermediária entrega uma camada correta sem expor um estado meio-pronto ao usuário. As tasks 97-98 mexem só em funções puras/queries e não pedem QA de interface; as 99-103 pedem.

Decisões do usuário registradas antes da primeira task, todas validadas em mock: (1) estorno **não** devolve teto de despesa padrão no crédito; (2) agregado negativo sai em verde com sinal em **todos** os níveis; (3) tag "Estorno" só em `/transacoes`; (4) não existe estorno parcelado.

---

**Task 97. `comporMes`: estorno sai de Entradas e abate o crédito**
✅ **Concluída** — commit `0a457be`

Só `lib/projecao.js` e `lib/projecao.test.js` — função pura, nenhuma tela. Design §13.3.

- `ehEstorno(t)` local à função: `t.tipo === "ENTRADA" && t.conta.tipo === "CARTAO_CREDITO"`.
- `entradaReal` passa a excluir estornos.
- `comporCredito` ganha o termo `estornos`, subtraído **só** de `real` (e portanto de `total`). O `consumidor` continua bruto, então `estimado` não muda — é a decisão do usuário sobre o teto (Requisitos §3.5).
- `real` e `total` do crédito podem ficar negativos; nada é truncado em zero.
- Casos 25-32 de §13.4 adicionados a `lib/projecao.test.js`. O caso 29 (`disponivel` sobe exatamente o valor do estorno) é o que trava a contagem dupla, e o 27 (estimado inalterado) é o que trava a decisão do teto.

*(Checkpoint: `npm run lint` + `npm run test` + build. Sem Playwright — não há tela nova. A Projeção herda a regra sem tocar em `projecao/page.jsx`, já que consome `comporMes`.)*

---

**Task 98. Camada de dados: helper de sinal e queries dos dois blocos**
✅ **Concluída** — commit `60c4e53`

`lib/estorno.js` (novo), `lib/estorno.test.js` (novo) e `lib/consolidacao.js`. Design §6 e §8.3.17.

- `lib/estorno.js` com `ehEstorno(transacao)` e `valorComSinal(transacao)` — módulo sem `import { db }`, justamente pra poder ser importado por Client Component (ao contrário de `lib/consolidacao.js`).
- `buscarEntradas` ganha `conta: { tipo: "CONTA_CORRENTE" }` no `where`.
- `buscarSaidasCredito` perde o filtro `tipo: "SAIDA"`, passando a trazer estornos junto.
- `lib/estorno.test.js` cobrindo: saída em cartão → positivo; entrada em cartão → negativo; entrada em conta corrente → positivo (o caso que garante que o helper é seguro no bloco Entradas); transação sem `conta` carregada → não quebra.

*(Checkpoint: lint + test + build. Sem Playwright. Estado intermediário conhecido e aceito: a partir desta task o bloco de crédito já recebe estornos, mas ainda os soma como positivos — as tasks 99-100 resolvem, e nada disso é alcançável pelo usuário antes da 103.)*

---

**Task 99. Saídas no crédito, visão "Por dia": soma com sinal e verde no negativo**
✅ **Concluída** — commit `563459d`

`app/(protegido)/visao-mensal/visao-mensal-client.jsx` (`somarGrupo`) e `components/visao-mensal/detalhe-diario.jsx`. Design §8.3.17.

- `somarGrupo` passa a somar por `valorComSinal` — vale pros três blocos agrupados por dia, e é seguro nos outros dois porque só estorno é negativo.
- `ListaTransacoes` (dentro do popover/sheet): valor de cada linha por `valorComSinal`, e `text-entrada` quando negativo.
- Total do dia dentro do popover/sheet e `LinhaResumoDia` (linha fechada): mesma regra de cor.
- `formatarReais` já emite `-R$ …` — nenhum sinal montado à mão.

*(Checkpoint: QA de interface. Cenário com um dia de total positivo, um dia contendo estorno e um dia de total negativo. Asserções sobre `textContent()` dos totais e `getComputedStyle().color` das linhas — a cor é computável, não vai a screenshot. `:visible` desde a primeira tentativa: a tela tem popover desktop e sheet mobile simultâneos no DOM.)*

---

**Task 100. Saídas no crédito, visão "Por cartão": total líquido por cartão**
✅ **Concluída** — commit `0003c0e`

`ListaPorCartao`, em `visao-mensal-client.jsx`. Design §8.3.16 e §8.3.17.

- `totalCartao` soma por `valorComSinal`.
- Linha do estorno com valor negativo e `text-entrada`; posição cronológica e ausência de tag inalteradas.
- Cor do total do cartão pela mesma regra, quando negativo.

*(Checkpoint: QA de interface na aba "Por cartão", com dois cartões — um só com gastos, outro com gasto e estorno — confirmando por asserção que o total do segundo é o líquido, e que a soma dos dois bate com o `real` do cabeçalho do bloco.)*

---

**Task 101. Agregados negativos em verde no cabeçalho do bloco e no resumo**
✅ **Concluída** — commit `98543ed`

`CabecalhoBloco` e `CardResumo`, em `visao-mensal-client.jsx`. Design §8.3.17.

Fecha a regra "verde em todos os níveis" nos dois agregados que as tasks 99-100 não alcançam: o total no cabeçalho de um bloco e os cards Entradas/Saídas/Disponível do topo. Condição única `valor < 0 → text-entrada`, sem o componente precisar saber por que ficou negativo.

*(Checkpoint: QA de interface com um mês de crédito líquido negativo, assertando cor e texto no cabeçalho do bloco e no card de Saídas. O card Disponível já podia ser negativo antes desta task por outros motivos — verificar que ele passa a seguir a mesma regra é parte do escopo.)*

---

**Task 102. `/transacoes`: badge "Estorno"**
✅ **Concluída** — commit `ed16915`

`app/(protegido)/transacoes/transacoes-client.jsx`. Design §12.1.

- Badge "Estorno" ao lado da descrição quando `ehEstorno(t)`, no mesmo `BadgeTransacao` já usado por parcela e investimento.
- Coluna Valor **inalterada**: continua `+ R$ …` em `text-entrada`. Mudar o sinal aqui contradiria o tipo do registro — a composição da fatura é da Visão mensal.

*(Checkpoint: QA de interface filtrando a tabela pela descrição exclusiva do registro de QA antes de qualquer asserção — a tela mistura dados reais e de teste. Confirmar badge presente no estorno e ausente numa entrada em conta corrente.)*

---

**Task 103. Lançamento: Meio Crédito liberado para Entrada**
✅ **Concluída** — commit `eff2440`

`app/(protegido)/lancamento/lancamento-client.jsx`. Design §8.2.4. **Última do marco** — é ela que torna o estorno alcançável.

- O toggle de Meio passa a oferecer Crédito e Débito com Tipo = Entrada (hoje filtra pra Débito). Investimento continua forçando Débito.
- `selecionarTipo` deixa de embutir "Entrada ⇒ Débito"; Entrada preserva o Meio corrente e a lógica de pré-seleção de conta já existente cuida do resto.
- Stepper de parcelas ganha a condição `Tipo !== "ENTRADA"` além de `Meio === "CREDITO"`.
- Nenhuma Server Action muda de assinatura.

*(Checkpoint: QA de interface + **confirmação no banco**. Lançar um estorno pela tela e ler a linha via Prisma: `tipo: ENTRADA`, `contaId` do cartão, `ehInvestimento: false`, `parcelamentoId: null` e `mesReferencia`/`anoReferencia` batendo com o que `calcularFatura` daria pra aquela data e aquele cartão — incluindo um caso com data **posterior ao fechamento**, que deve cair na fatura seguinte. Depois, navegar até a Visão mensal do mês de referência e assertar o efeito ponta a ponta: bloco Entradas sem o estorno, crédito abatido, Disponível somando o valor uma vez só. Apagar as linhas de QA por `usuarioId` ao final.)*

---

## M28 — Percentual do disponível na Projeção ✅

Resolve Requisitos §3.12 (nova) e o bullet acrescentado em §3.6. Design §14.4 (nova) e §16.1 (tokens).

Sem migration, sem Server Action, sem mudança de leitura de dados: `comporMes` já devolve `entradas.total` e `disponivel` para os doze meses, e a Projeção já os recebe. O marco é uma função pura mais apresentação.

Régua e formato validados com o usuário via mock em HTML antes da primeira task, incluindo três decisões dele: rótulo **curto** (`31%`, sem complemento textual, em todos os viewports), **sem rótulo** quando as Entradas são zero, e percentual **acompanhando o valor simulado** quando há simulação ativa.

---

**Task 104. Funções puras de percentual e faixa**
✅ **Concluída** — commit `9e26be5`

`lib/disponivel.js` (novo) e `lib/disponivel.test.js` (novo). Sem UI, sem Playwright. Design §14.4.

- `percentualDoDisponivel(disponivel, entradas)` — devolve o percentual, ou **`null`** quando não há base (`!(entradas > 0)`, cobrindo zero, negativo, `null` e `NaN`). Null e não zero: zero é um percentual legítimo, e confundir os dois faria um mês sem renda parecer um mês sem folga.
- `faixaDoPercentual(percentual)` — `"otimo" | "bom" | "atencao" | "baixo" | "critico"`, limites inclusivos no piso.
- Testes cobrindo: cada uma das cinco faixas; os quatro limites exatos (40, 25, 10, 5) caindo na faixa superior; percentual negativo → `critico`; acima de 100% → `otimo`; e as quatro entradas sem base (`0`, negativa, `null`, `NaN`) devolvendo `null`.

*(Checkpoint: lint + test + build. Nenhuma tela consome as funções ainda — a Task 105 é que as liga.)*

---

**Task 105. Tokens da régua e rótulo no card da Projeção**
✅ **Concluída** — commit `0479ca9`

`app/globals.css`, `tailwind.config.js` e `app/(protegido)/projecao/projecao-client.jsx`. Design §14.4 e §16.1.

- Cinco tokens `--disponivel-otimo` … `--disponivel-critico` em `globals.css`, e o grupo `disponivel` correspondente em `tailwind.config.js`. Quatro reaproveitam hexadecimais já na paleta; só `--disponivel-critico` (`#F43F5E`) é valor novo.
- **Mapa literal de classe** no componente (`{ otimo: "text-disponivel-otimo", ... }`), nunca `text-disponivel-${faixa}` — o JIT do Tailwind descarta nome montado em runtime, mesma armadilha já registrada em `CLASSE_COR_CATEGORIA` (Design §18.4). Sem isso o rótulo sai sem cor, e só na build de produção.
- `DisponivelComDelta` passa a receber `entradas` e renderizar o rótulo: `text-xs`, `font-semibold` só nas faixas `otimo` e `critico`, alinhado pela linha de base do valor.
- Com simulação ativa, o percentual sai do `disponivelSimulado` e aparece **uma vez só**, ao fim da linha.
- Rótulo ausente quando `percentualDoDisponivel` devolve `null`.

*(Checkpoint: QA de interface. Cenário com meses cobrindo as cinco faixas, um mês de Entradas zeradas e um mês de Disponível negativo — asserção de `textContent()` e `getComputedStyle().color`/`fontWeight`, sem screenshot: cor e peso são computáveis. Verificar também com uma simulação ativa que existe **um** percentual na linha e que ele corresponde ao segundo valor. Como a régua depende de agregados do mês num banco sem isolamento por usuário, os valores padrão globais entram na conta — montar o cenário conferindo o número que a tela exibe, não o que o script criou isoladamente.)*

---

## Detalhamento de investimentos — M29 a M33

> **Estas cinco seções registram o escopo acordado.** O **M29 já tem Requisitos
> (spec-01 §3.13), Design (spec-02 §20) e tasks escritas** — aguardando validação do
> usuário antes da implementação. Os **M30 a M33 seguem sem tasks**, e sem seção
> correspondente em Requisitos e Design. Nada aqui está pronto para codar: cada marco precisa
> passar pelo ciclo normal — Requisitos, Design, tasks — antes da primeira linha de
> código. O objetivo deste bloco é não perder as decisões tomadas na entrevista de
> 2026-08-25.

**O modelo, em uma frase:** a conta de investimento deixa de ser um saco só e passa a
ter **saldo em conta** (dinheiro parado na corretora) e **saldo investido** (dentro de
ativos), com uma entidade nova — **Ativo** — representando cada posição.

**Quatro fluxos, dois deles novos:**

| Fluxo | De → Para | Existe hoje? |
|---|---|---|
| Aporte | Conta corrente → saldo em conta | Sim (transação) |
| Compra de ativo | Saldo em conta → saldo investido | **Novo** |
| Liquidação do ativo | Saldo investido → saldo em conta | **Novo** |
| Resgate | Saldo em conta → conta corrente | Existe, mas perdeu o vínculo com a conta na Task 86 |

**Decisões do usuário, tomadas na entrevista:**

- O que a área responde: quanto tenho hoje, quanto rendeu, histórico por conta e evolução no tempo — as quatro.
- Rendimento **calculado por indexador**, com as séries públicas do Banco Central. Três estratégias: **Pós-fixado** (%CDI, %Selic, CDI+, Selic+), **Pré-fixado** (% fixo a.a.) e **Inflação** (IPCA+).
- Liquidar um ativo e resgatar para a conta corrente são **duas operações separadas** — permite reinvestir sem passar pelo banco.
- Rendimento exibido **bruto e líquido lado a lado**.
- **Saldo em conta não rende** — dinheiro parado é dinheiro parado.
- **Resgate volta a ser vinculado** a uma conta de investimento (reabre a superfície removida na Task 86).
- Posições já existentes entram por **cadastro manual**, com data e valor de aquisição reais.
- Área nova no grupo **Dados**, com a navegação mobile passando a usar **ícones** nas abas.

**Atributos de um ativo de renda fixa** (definidos pelo usuário): Conta, Mercado (só "Renda
fixa" por ora), Estratégia, Produto (CDB, LCA, LCI, Tesouro Direto), Emissor, Indexador
(restrito pela estratégia), Taxa, Data de aquisição, Valor de aquisição, Vencimento.

---

### M29 — Modelo de investimentos: ativos e os dois saldos

**Status:** mock validado pelo usuário; Requisitos §3.13 e Design §20 escritos. Tasks abaixo **aguardando validação** antes de qualquer implementação.

Duas decisões vindas da revisão do schema, depois da primeira versão destas tasks: os **movimentos avulsos** entram no M29 (sem eles o saldo desencontra do extrato real em seis meses de Tesouro Direto), e **transferência entre corretoras não ganha operação própria** — quem precisar registra dois ajustes, um de cada lado.

Primeira fatia: o ativo passa a existir, os dois saldos aparecem, e as duas operações novas funcionam — **sem rendimento**. Enquanto vivo, um ativo vale o que custou.

**Ordem e uma amarração:** o usuário pediu a aba como primeiro passo. Uma aba apontando para uma rota inexistente daria 404, então a **Task 106 cria também a rota mínima** que ela aponta — só o título, sem conteúdo. É o menor acréscimo que evita entregar um link quebrado, e está explícito aqui para não parecer escopo esticado.

---

**Task 106. Navegação: quarta aba e rótulos por breakpoint**

`components/navegacao/navegacao-principal.jsx`, `components/navegacao/abas-dados.jsx` e uma rota `/investimentos` mínima. Design §20.5, Requisitos §3.13.4.

- `GRUPO_DADOS` ganha o destino `/investimentos` e cada item passa a ter `label` (desktop) e `labelCurto` (mobile).
- Barra lateral do desktop inalterada em estrutura — só o sexto item, rotulado **"Investimentos"**.
- `AbasDados` passa a ícone + rótulo curto: **"Mês"**, "Transações", "Projeção", **"Investir"**.
- Rota `/investimentos` só com o título "Investimentos", para a aba não apontar para o vazio.

*(Checkpoint: QA de interface. A 390px, as quatro abas cabem sem transbordar e sem truncar rótulo — assertar `boundingBox()` das abas e `scrollWidth` do container, não screenshot. Confirmar que o item ativo acompanha a rota nos dois breakpoints, e que os outros cinco destinos seguem funcionando.)*

---

**Task 107. Schema: enums, o modelo Ativo e os movimentos**

`prisma/schema.prisma` e migration. Design §20.1. Sem UI.

- Enums `MercadoAtivo`, `EstrategiaAtivo`, `ProdutoAtivo`, `IndexadorAtivo`, `NaturezaMovimento` e `MotivoMovimento`.
- Modelo `Ativo`, com a relação `AtivosDaConta` em `Conta`.
- Modelo `LiquidacaoAtivo`: liquidação é **evento**, não coluna. Guarda `data`, `valorRecebido` e **`valorRemanescente`** — é este último que torna o rendimento calculável depois de um resgate parcial, e liquidação total é o caso em que ele é zero.
- Modelo `MovimentoInvestimento`, com `natureza` e `motivo` em campos separados e a relação `MovimentosDaConta`.
- Índices por `usuarioId`, `contaId` e `vencimento`.

As tabelas na mesma migration: nascem juntas, e separá-las deixaria a Task 108 sem metade da fórmula de saldo.

*(Emenda feita durante a implementação, com `Ativo` ainda vazia: a primeira versão guardava a liquidação como duas colunas anuláveis em `Ativo`, o que suportaria só liquidação total. Ao revisar como um resgate parcial se comporta numa corretora, ficou claro que o valor que segue rendendo é a base remanescente a partir da data do resgate — e sem esse campo o M30 não conseguiria corrigir uma posição parcialmente resgatada. Como a migration anterior já estava aplicada no banco de desenvolvimento, a correção entrou como uma segunda migration em vez de reescrever a primeira.)*

*(Checkpoint: lint + test + build; `npx prisma migrate status` sincronizado. Sem Playwright — não há tela. Nenhum dado existente é tocado: a tabela nasce vazia.)*

---

**Task 108. Cálculo de saldos e agrupamento**

`lib/investimentos.js` e `lib/investimentos.test.js`, ambos novos. Design §20.2. Sem UI.

- `saldoInvestido`, `saldoEmConta`, `patrimonio` e a função de agrupamento por chave (`estrategia` ou `mercado`), mais o percentual sobre o patrimônio.
- **Saldo investido é a soma da base atual de cada posição viva** — `valorRemanescente` do último evento de liquidação, ou `valorAquisicao` quando não houve nenhum. Não é mais "soma do valor de aquisição dos não liquidados": essa forma quebra depois de um resgate parcial.
- Uma posição está **viva** quando não tem liquidação alguma, ou quando a última tem remanescente maior que zero. Uma posição encerrada some da listagem (Requisitos §3.13.2).
- A fórmula do saldo em conta inclui os movimentos avulsos, somando os de natureza crédito e subtraindo os de débito.
- **A agregação roda no banco** (`groupBy`/`aggregate`), devolvendo uma linha por conta — não o histórico carregado na aplicação. É o ponto que responde à objeção de "consolidar toda a história a cada leitura" (Design §20.2).
- Testes cobrindo as duas sutilezas que a fórmula esconde: **a compra debita para sempre** (o somatório de aquisições inclui os já liquidados, senão o caixa reaparece na liquidação) e **vencido não liquidado continua investido** (a condição é `dataLiquidacao == null`, não o vencimento).
- Mais: conta sem ativo algum; liquidação com valor maior e menor que o de aquisição; grupos não somando 100% quando há dinheiro parado; e movimentos de crédito e débito alterando o saldo em conta nos dois sentidos.

*(Checkpoint: lint + test + build. Sem Playwright — função pura.)*

---

**Task 109. Rota `/investimentos`: resumo e disponível para investir**

`app/(protegido)/investimentos/`. Requisitos §3.13.3, Design §20.3.

- Server Component lendo contas, ativos e transações de investimento; `Decimal` convertido na fronteira.
- Card de resumo: linha única com divisor de 1px no desktop, **sempre** duas linhas sem divisor no mobile.
- Card "Disponível para investir": uma linha por conta, com saldo parado e os dois botões (ainda sem ação — as ações chegam nas Tasks 111 e 112).

*(Checkpoint: QA de interface nos dois breakpoints, assertando que o divisor existe só no desktop e que a quebra do mobile independe do tamanho dos números — testar com valor curto e com valor de 6 dígitos.)*

---

**Task 110. Detalhamento agrupado por estratégia ou mercado**

`investimentos-client.jsx`. Requisitos §3.13.3, Design §20.3.

- Alternância "Por estratégia" / "Por mercado", com **estratégia como padrão**.
- Cards de grupo recolhidos, com percentual e nome à esquerda e valor bruto à direita.
- Expandido: uma seção por conta com posição no grupo, e a tabela Produto / Vencimento / Taxa / Saldo bruto.
- Posição vencida com destaque e marcação "Vencido" (o botão Liquidar entra na Task 112).

*(Checkpoint: QA de interface. Cenário com duas contas dentro da mesma estratégia, para provar o sub-agrupamento; um ativo vencido, para o destaque; e conferir que a soma dos percentuais dos grupos mais o parado fecha o patrimônio.)*

---

**Task 111. Compra de ativo**

`lib/actions/investimentos.js` e o formulário. Requisitos §3.13.1 e §3.13.2, Design §20.4.

- `criarAtivo`, validando conta de investimento, indexador pertencente à estratégia e valor dentro do saldo em conta.
- Formulário com o indexador filtrado pela estratégia e o rótulo da taxa mudando junto — "110" significa coisas diferentes em `%CDI` e em `CDI+`.
- Revalida só `/investimentos`.

*(Checkpoint: QA de interface + confirmação no banco. Comprar debita o saldo em conta e credita o investido; uma compra acima do saldo é recusada com mensagem; e **nenhuma linha nova aparece em `/transacoes`** nem muda o Disponível do mês — asserção explícita, é a decisão mais fácil de quebrar sem perceber.)*

---

**Task 112. Liquidação**

`liquidarAtivo` e o formulário. Requisitos §3.13.2, Design §20.4.

- Botão Liquidar na linha da posição, em destaque quando vencida.
- Formulário com data e **valor recebido informado pelo usuário**.
- Devolve ao saldo em conta daquela corretora; a posição sai do detalhamento.

*(Checkpoint: QA de interface + banco. Liquidar com valor maior que o de aquisição e conferir que o saldo em conta reflete o valor recebido, não o aplicado. Confirmar de novo que nada apareceu em `/transacoes`.)*

---

**Task 113. Registrar movimento avulso**

`lib/actions/investimentos.js`, o `DropdownMenu` na linha da conta e o formulário. Requisitos §3.13.3, Design §20.3 e §20.4.

- `registrarMovimento`, validando a conta, que o motivo pertence à natureza, e que um débito não excede o saldo em conta.
- Menu de mais ações na linha da conta, dentro do card "Disponível para investir" — `DropdownMenu` do shadcn, já instalado e em uso no menu do usuário.
- Formulário com natureza, motivo (filtrado pela natureza), data, valor e descrição opcional. Sem vínculo com ativo.
- Revalida só `/investimentos`.

*(Checkpoint: QA de interface + banco. Um crédito de cupom aumenta o saldo em conta e um débito de taxa diminui; um débito acima do saldo é recusado; cupom não aparece como opção quando a natureza é Débito. E, de novo, a asserção que mais importa: **nada aparece em `/transacoes`** e o Disponível do mês não muda.)*

---

**Task 114. Resgate volta a vincular a conta de investimento**

`app/(protegido)/lancamento/lancamento-client.jsx` e `lib/actions/transacoes.js`. Requisitos §3.13.5.

Reabre a superfície removida na Task 86: uma entrada marcada como resgate volta a pedir a conta de investimento de origem. Sem isso o saldo em conta só cresce, e nenhuma conta fecha.

*(Checkpoint: QA de interface + banco — a transação nasce com `contaInvestimentoId` preenchido, e o saldo em conta da corretora cai no valor resgatado. Conferir que uma entrada comum, sem marcação de resgate, continua sem pedir conta de investimento.)*

---

### M30 — Rendimento pós-fixado: integração com o Banco Central (planejado)

**Status:** escopo acordado; tasks **a escrever**. Depende do M29.

Primeira chamada externa do projeto. Cobre as quatro variações de pós-fixado: %CDI, %Selic,
CDI+ e Selic+.

- Séries SGS: **12** (CDI) e **11** (Selic), ambas em **% ao dia**.
- **Achado que reduz o risco, verificado contra a API em 2026-08-25:** a série já vem **só com dias úteis** — fim de semana e feriado simplesmente não aparecem. Não será preciso manter tabela de feriados ANBIMA; o rendimento é o produtório dos fatores que a série devolver.
- Séries passadas nunca mudam, então cabe guardá-las no banco e buscar só o que falta.

A decidir na spec: o que a tela mostra quando o BC não responde (valor de custo, último
cálculo conhecido, ou erro), e onde o cálculo roda (a cada leitura, com cache, ou um job).

---

### M31 — Pré-fixado e IPCA+ (planejado)

**Status:** escopo acordado; tasks **a escrever**. Depende do M30.

- **Pré-fixado:** `(1 + taxa)^(du/252)`, usando o mesmo calendário implícito da série do M30.
- **IPCA+:** série SGS **433**, mensal.

O ponto difícil é a **defasagem**: o IPCA sai com cerca de dez dias de atraso, e o mercado
usa o índice defasado (15 dias ou um mês, conforme o papel). Enquanto o índice do mês não
sai, um IPCA+ não tem valor exato — vai exigir uma convenção explícita na spec e um aviso
na tela de que o número é provisório.

---

### M32 — Rendimento bruto e líquido lado a lado (planejado)

**Status:** escopo acordado; tasks **a escrever**. Depende do M31.

- Tabela regressiva de IR (22,5% até 15%, pelo prazo).
- IOF nos primeiros 30 dias.
- **LCI e LCA são isentos**, o que cria dois caminhos de cálculo por produto.

É o único dos quatro marcos que ramifica a matemática por **produto**, não por estratégia.
### M35 — Parcelamento com controle fundido ao Valor ✅

**Status:** ✅ **concluído.** Requisitos §3.15, Design §22.

**Mock normativo:** https://claude.ai/code/artifact/a2c1a106-f737-4d78-b041-dfd457e488fe
Traz os **seis estados** (repouso, parcelado, foco, aberto, "Outro", valor longo), uma tabela de **medidas** com as classes exatas, e as **regras** da interface. Quem implementar deve abrir o mock antes de escrever CSS — ele é a fonte, não este texto.

Nasce de feedback de uso real: lançar saída parcelada no crédito é pouco intuitivo. Substitui o stepper `− 1x +` da Task 85 (M22) por um dropdown fundido ao campo, com **"À vista"** como rótulo padrão.

**Nenhuma Server Action é tocada** e nenhuma regra muda — `criarTransacaoParcelada` recebe o mesmo `numeroParcelas` de sempre. É mudança de controle, não de comportamento.

---

**Task 123. `CampoValor` troca `extra` por `prefixo`**
✅ **Concluída** — commit `86319fe`

`components/campo-valor.jsx`. Design §22.1.

Separada da 124 porque `CampoValor` é usado em **9 lugares** e as outras 8 telas não podem regredir — é a task de risco do marco, e o risco é de regressão silenciosa, não de bug visível.

- `extra` (slot absoluto dentro do campo, com `pr-24` no input) **sai**; `prefixo` (irmão flex, `flex-none`, `border-r border-input`) entra. Só `/lancamento` passava `extra`, então não fica consumidor órfão.
- O contêiner vira `flex h-9 rounded-md border border-input overflow-hidden`, e o input perde borda e anel próprios (`border-0 focus-visible:ring-0`).
- **O anel de foco sobe para o contêiner** via `focus-within:ring-1 ring-ring`. Sem isso o anel envolve só a metade direita e a costura quebra.
- Sem `prefixo`, renderiza **idêntico a hoje**.

*(Checkpoint: QA de interface nas telas que usam `CampoValor` **sem** prefixo — `/valores-padrao`, `/projecao` e o modal de edição de `/transacoes` bastam como amostra. Medir `boundingBox()` do campo antes e depois: altura, largura e posição não podem mudar. Conferir que o anel de foco aparece ao focar o input.)*

---

**Task 124. Dropdown de parcelas com "À vista"**
✅ **Concluída** — commit `40a546e`

`app/(protegido)/lancamento/lancamento-client.jsx`. Requisitos §3.15, Design §22.2 e §22.3.

Vai inteira, com o "Outro…" junto: sem ele o app perderia a capacidade de lançar acima de 12x entre um commit e outro — hoje o stepper vai até 99.

- `DropdownMenu`, **não `Select`** — o typeahead e o `Esc` do `Select` brigam com o campo livre de "Outro". O QA da Task 112 já esbarrou nisso.
- Lista: `À vista` · separador · `2x` a `12x` roláveis · separador · `Outro…`. "À vista" fora da área rolável, para o caminho de volta ser sempre alcançável.
- Cada opção mostra **o total da compra** naquele número de vezes (`valorCentavos * n`). Com valor zero, só o número de parcelas.
- **O gatilho nunca exibe `1x`** — é "À vista". É o ponto da mudança.
- Saem `BOTAO_PARCELA` e `ajustarParcelas`. Rótulo alternado, legenda do total, `numeroParcelas`, `podeParcelar` e `ehParcelado` ficam **como estão**.

*(Checkpoint: QA de interface nos dois viewports, conferindo contra o mock. O gatilho diz "À vista" em repouso e "12x" após escolher; o rótulo vira "Valor da parcela" e a legenda mostra o total; "Outro" aceita 18 e o gatilho passa a "18x"; escolher "À vista" volta o rótulo para "Valor" e some a legenda. No banco: uma compra 12x cria 12 parcelas com o mesmo `numeroParcelas` de antes — a prova de que nenhuma regra mudou. Medir a 390px que o grupo não estoura a largura com um valor de cinco dígitos.)*

---

### M33 — Liquidação parcial (planejado)

**Status:** escopo acordado; tasks **a escrever**. Depende do M30.

O schema já comporta desde a Task 107: `LiquidacaoAtivo` é um evento com `data`, `valorRecebido` e `valorRemanescente`, e liquidação total é o caso em que o remanescente é zero. O que falta é a funcionalidade — **hoje o modelo suporta e nenhum marco constrói**, lacuna identificada pelo usuário ao revisar as tasks.

**Por que depois do M30, e não antes.** No M29 um resgate parcial seria só dois números digitados — "tirei R$ 5.000, sobraram R$ 5.500" — sem o app calcular nada. É com o rendimento do M30 que o remanescente vira base de cálculo e a funcionalidade se paga. Construir antes significaria fazer o formulário duas vezes: uma sem cálculo, outra com.

Escopo previsto:

- O formulário de liquidação ganha o campo de **saldo remanescente**, e deixa de assumir zero.
- Liquidar deixa de ser um botão que encerra a posição e passa a ser um **evento repetível** — a posição continua na listagem enquanto o remanescente for maior que zero.
- A listagem passa a exibir a **base atual** no lugar do valor de aquisição para posições com eventos (o cálculo já nasce assim na Task 108; aqui ele deixa de ser um caso que nunca acontece).
- O rendimento passa a ser calculado **por trechos**: base do último evento corrigida a partir da data dele.

**Interação com o M32:** o IR de um resgate parcial é proporcional — cada parcela resgatada tem seu próprio prazo na tabela regressiva, contado da aplicação original. Se o M33 vier depois do M32, herda essa maquinaria pronta; se vier antes, o imposto do resgate parcial fica adiado junto com o resto do cálculo líquido.

**Fora de escopo também aqui:** a mecânica de **quantidade × preço unitário** do Tesouro Direto. Modelar em reais é uma aproximação que serve para acompanhar patrimônio, mas não reproduz um extrato que fala em títulos e PU.

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
| M14 | Requisitos não funcionais — segurança (spec-01 §4) e correção do achado do Design §17 |
| M15 | Requisitos não funcionais — tema escuro (spec-01 §4) |
| M16 | Escopo itens 12, 13, 14 (valores padrão, projeção de 12 meses, simulação) |
| M17 | Escopo item 10 (navegação agrupada em Dados e Ajustes) |
| M18 | Escopo item 12 revisado — consolidação de despesa padrão no débito e acompanhamento de pagamentos (spec-01 §3.5 revisado e §3.9) |
| M19 | Escopo item 2 revisado — formulário de lançamento mantém Tipo/Conta/Data ao salvar |
| M20 | Correção — agrupamento por dia na Visão mensal herdava horário de lançamento antigo |
| M21 | Escopo item 7 revisado — cada seção da Visão mensal em card, e acompanhamento de fatura por cartão em Saídas no crédito |
| M22 | Escopo itens 2, 6, 8, 11 revisados — redução de fricção no lançamento (Tipo/Meio/Conta/Categoria em toggles e chips, parcelas integradas ao Valor), Tipo Investimento, e remoção completa de Recorrência |
| M23 | Requisitos não funcionais — tema escuro (spec-01 §4), complementando o M15: widgets nativos do navegador coerentes com o tema |
| M24 | Correção — toggle de Tipo estourava a largura da coluna no mobile após ganhar a terceira opção na Task 86 |
| M25 | Escopo item 4 revisado — categorias deixam de ser lista fixa em código e viram entidade gerenciável pelo usuário, com cor e desativação (spec-01 §3.10) |
| M26 | Requisitos não funcionais — instalação na tela inicial do iPhone (spec-01 §4), sem offline e sem push |
| M27 | Escopo item 2 revisado — estorno no crédito (spec-01 §3.11), com os ajustes decorrentes na Visão mensal (§3.1), na tabela de transações (§3.3) e na regra do teto de despesa padrão no crédito (§3.5) |
| M28 | Escopo item 13 revisado — percentual do disponível em relação às Entradas, na Projeção (spec-01 §3.12) |
| M29 | *(planejado)* Detalhamento de investimentos — ativos, saldo em conta e saldo investido. Seção de Requisitos ainda a escrever |
| M30 | *(planejado)* Rendimento pós-fixado via séries do Banco Central. Seção de Requisitos ainda a escrever |
| M31 | *(planejado)* Rendimento pré-fixado e IPCA+. Seção de Requisitos ainda a escrever |
| M32 | *(planejado)* Rendimento bruto e líquido lado a lado. Seção de Requisitos ainda a escrever |
| M33 | *(planejado)* Liquidação parcial de posição. Schema já pronto desde a Task 107; seção de Requisitos ainda a escrever |
| M35 | Escopo item 8 revisado — parcelamento deixa de ser um stepper embutido e vira dropdown fundido ao campo Valor, com "À vista" como padrão (spec-01 §3.15). Substitui o controle criado na Task 85 |
