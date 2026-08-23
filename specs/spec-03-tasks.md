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

## M14 — Endurecimento de segurança

Vem antes de tudo: a aplicação está publicada com dados financeiros reais e, hoje, qualquer pessoa que descubra a URL pode se cadastrar e ler, editar e apagar tudo (Design §17.1). A **Task 46 é a urgente** — fecha o vazamento. As Tasks 47 a 49 devolvem, de forma controlada, a capacidade de criar usuários; as demais fecham o restante dos achados.

**Task 46. Fechar o cadastro público**
Remove a rota `/cadastro`, sua página e a Server Action `criarUsuario`. Ajusta o matcher do `middleware.js` para excluir apenas `/login` e os assets do Next (Design §17.2). Depois desta task, não deve existir nenhum caminho na aplicação que crie um usuário. **Pode e deve ser publicada isoladamente**, antes das seguintes.

**Task 47. Coluna `ehAdmin` e propagação na sessão**
Adiciona `ehAdmin Boolean @default(false)` ao model `Usuario` (Design §3). A migration inclui um passo de dados que marca **o usuário mais antigo** como administrador — em produção, o seu —, evitando qualquer `UPDATE` manual no console do provedor. Os callbacks `jwt` e `session` do NextAuth passam a carregar o campo, de modo que `session.user.ehAdmin` fique disponível no servidor e no cliente (Design §17.2).

**Task 48. Server Actions de gestão de usuários**
`criarUsuario` e `editarUsuario` em `lib/actions/usuarios.js`, ambas iniciando por um helper `exigirAdmin()` que rejeita quem não for administrador (Design §17.2). Valida e-mail único, senha mínima e nome obrigatório; o hash usa bcrypt custo 10, igual ao login. Duas travas contra auto-bloqueio: o administrador **não pode remover o próprio `ehAdmin`** nem **alterar o próprio e-mail** por esta via. Sem exclusão de usuários — revogar acesso é trocar a senha.

**Task 49. Tela `/usuarios`**
Lista os usuários e oferece criação e edição, restrita ao administrador (Design §17.2). A guarda é aplicada em **três camadas**: matcher do middleware, verificação no Server Component antes do render, e `exigirAdmin()` dentro de cada action — esconder o link no cliente não é proteção, já que Server Actions são endpoints HTTP. A tela exibe um aviso explícito de que qualquer usuário criado ali enxerga e edita **todos** os dados financeiros da família (spec-01 §2). Link temporário na navegação; ~~a entrada definitiva no grupo Ajustes vem na Task 65~~ — **decisão revista no M17**: o Design §15.1 (que prevalece sobre versões anteriores) fixou os cinco destinos da navegação agrupada sem incluir `/usuarios`. Em vez de expandir esse escopo, `/usuarios` permanece acessível só pelo menu do usuário logado (já com as três camadas de guarda), e o link temporário na barra principal é removido na Task 65 sem substituto.

**Task 50. Limitação de taxa no login**
Contador em memória por e-mail no `authorize` do Credentials Provider: 5 tentativas malsucedidas bloqueiam novas tentativas por 15 minutos (Design §17.3). A mensagem de erro **não distingue** senha incorreta de bloqueio, para não confirmar a existência da conta.

**Task 51. Travar tipo e fechamento de contas com transações**
`editarConta` passa a rejeitar alteração de `tipo`, `diaFechamento` e `diaVencimento` quando a conta possui transações vinculadas — esses valores originaram o `mesReferencia` já gravado, e alterá-los corrompe a consolidação silenciosamente (Design §17.4). O nome continua editável. A UI desabilita os campos e explica o motivo, em vez de deixar o usuário tentar e receber erro.

**Task 52. Duração explícita da sessão e avaliação das dependências**
Declara `session.maxAge` em `authOptions` (7 dias) em vez de herdar o padrão de 30 (Design §17.5). Na mesma task, trata as dependências vulneráveis conforme o Design §17.6 — **avaliando antes de atualizar**: `npm audit fix --force` sugere um *downgrade* do `next-auth` e um salto de major do Next que quebra `visao-geral/page.jsx` (no Next 15 `searchParams` é assíncrono). Verificar quais avisos se aplicam a um deploy na Vercel, tratar primeiro o que é explorável neste contexto, e rodar QA completo em todas as rotas depois de qualquer atualização.

*(Checkpoint sugerido: critérios de aceite de autenticação — spec-01 §6.)*

---

## M15 — Tema escuro

Os marcos seguintes criam três telas novas, e construí-las já no tema definitivo evita revisar contraste duas vezes.

**Task 53. Tokens do tema escuro**
Substitui os valores do bloco `:root` de `app/globals.css` pela paleta escura da tabela do Design §16.1 e **remove o bloco `.dark`** — hoje código morto, já que nada nunca aplica essa classe. Adiciona os tokens semânticos novos (`--entrada`, `--investimento`, `--saida-debito`, `--saida-credito`, `--periodo-bg`, `--periodo-fg`, `--estimado`) e registra todos em `tailwind.config.js`, seguindo o padrão `{ DEFAULT, foreground }` já usado por `primary`/`secondary`. Nenhum componente muda nesta task — só o sistema de tokens.

**Task 54. Substituir cores literais por tokens**
Troca as classes cravadas na paleta clara pelos tokens da Task 53 (Design §16.1): `text-emerald-600`, `text-blue-600`, `text-amber-600` e `text-rose-600` em `visao-geral-client.jsx`; `bg-indigo-50`/`text-indigo-600` em `seletor-periodo.jsx`; `text-emerald-600` em `transacoes-client.jsx`. Depois desta task, nenhuma cor semântica deve estar fora do sistema de tokens.

**Task 55. Revisão de contraste dos componentes**
Percorre a lista do Design §16.3 — `Button` (todas as variantes), `Input`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Table`, `Card`, `Skeleton`, os quatro blocos da Visão geral, a pílula do seletor de período e os badges de parcela/recorrência/investimento — verificando cada um sobre o novo fundo e corrigindo o que não atingir **WCAG AA** (4.5:1 para texto normal, 3:1 para texto grande e elementos de interface). Atenção específica ao `Skeleton`, que tende a sumir no escuro. QA com captura de tela de cada rota.

*(Checkpoint sugerido: "A aplicação é exibida em tema escuro, com todos os elementos legíveis sobre o novo fundo" — spec-01 §6.)*

---

## M16 — Valores padrão e Projeção

**Task 56. Modelo `ValorPadrao` e migration**
Adiciona o enum `MeioPagamento` e o model `ValorPadrao` ao `schema.prisma` conforme o Design §3, com a relação em `Usuario`. Gera e aplica a migration. Sem UI nesta task.

**Task 57. Server Actions de valores padrão**
CRUD em `lib/actions/valores-padrao.js`: criar, editar e apagar. Valida que `meio` é obrigatório quando `tipo = SAIDA` e nulo quando `ENTRADA` (Design §3), e que o valor é positivo. `revalidatePath` para `/valores-padrao`, `/visao-geral` e `/projecao` — omitir alguma reproduz o bug de cache já ocorrido com contas.

**Task 58. Tela `/valores-padrao`**
Tela única com as duas listas (Receitas padrão e Despesas padrão), cada uma com CRUD inline (Design §15.4). O formulário de despesa tem seletor Crédito/Débito; o de receita, não. Reaproveita `CampoValor`. Adiciona um link temporário na navegação existente para a tela ficar alcançável — a estrutura definitiva vem no M17.

**Task 59. `lib/projecao.js` — fronteiras da estimativa**
Implementa `dataFechamentoDaReferencia`, `creditoAindaEstimavel` e `debitoAindaEstimavel` conforme o Design §13.1 e §13.2 — a inversa de `calcularFatura`. Testes no Vitest cobrindo os casos 6, 7, 8 e 11 da lista do Design §13.4 (fatura fechada, dois cartões com fechamentos distintos, nenhum cartão cadastrado, fechamento dia 31 em mês de 30 dias). Função pura, sem banco.

**Task 60. `lib/projecao.js` — composição de um mês**
Implementa `comporMes` conforme o Design §13.3, devolvendo `real` e `estimado` separados por bloco. Testes cobrindo os casos 1 a 5, 9 e 10 do Design §13.4 — com atenção aos dois que a spec mudou no meio do caminho: ocorrência de recorrência **consome** o teto, parcela **soma por cima**, e receita padrão nunca é consumida.

**Task 61. Composição real + estimado na Visão geral**
`visao-geral/page.jsx` passa a usar `comporMes` em vez de somar transações direto. Os blocos exibem a estimativa como **linha própria com borda tracejada e rótulo "estimado"** (Design §16.2), e os cards de resumo ganham o subtexto de composição (`R$ 800 real + R$ 400 estimado`). Primeira tela a consumir os valores padrão.

**Task 62. Tela `/projecao`**
Rota nova com `export const dynamic = "force-dynamic"` (Design §14.1 — sem isso a projeção congela na data do build). Server Component busca transações da janela, valores padrão e contas, chama `comporMes` doze vezes e converte `Decimal` para `Number` antes de passar ao cliente. Renderiza o gráfico de 12 barras em CSS puro e a lista de meses — cards empilhados no mobile. Link temporário na navegação, como na Task 58.

**Task 63. Simulação de compra**
Formulário client-side na `/projecao` com cartão, data, valor **total** e nº de parcelas (Design §14.3). Deriva o valor da parcela, distribui via `gerarParcelas` e soma cada parcela ao mês de referência correspondente. Efêmera, em `useState`. Exibe o delta ao lado do número e sinaliza quando o parcelamento ultrapassa a janela ("10 de 24 parcelas dentro da janela").

*(Checkpoint sugerido: critérios de aceite de valores padrão, projeção e simulação — spec-01 §6.)*

---

## M17 — Navegação agrupada

Fecha o ciclo: só agora os cinco destinos existem, e a estrutura definitiva pode substituir os links temporários das Tasks 58 e 62.

**Task 64. Barra lateral do desktop em dois grupos**
`NavegacaoPrincipal` passa a listar os cinco destinos na ordem do Design §15.1, com um divisor entre Dados e Ajustes e sem rótulos de grupo (Design §15.2). Botão "+ Nova transação" e menu do usuário permanecem onde estão.

**Task 65. Menu inferior de três alvos no mobile**
Reduz a barra inferior a Dados · Nova · Ajustes (Design §15.3). "Dados" navega para `/visao-geral`; "Nova" continua indo para `/lancamento`; "Ajustes" abre um `Sheet` inferior com Contas e Valores padrão. Remove os links temporários.

**Task 66. Abas do grupo Dados no mobile**
Novo componente cliente `components/navegacao/abas-dados.jsx`, renderizado por `app/(protegido)/layout.jsx` acima de `{children}`, alternando Visão geral / Transações / Projeção em um único toque. Auto-oculta no desktop e fora das três rotas do grupo, sem reorganizar diretórios (Design §15.3). **Cuidado com o `tailwind-merge`:** não repetir utilitário de `display` sem prefixo de breakpoint em constante compartilhada — foi esse padrão que duplicou o seletor de período no mobile.

*(Checkpoint sugerido: critérios de aceite de navegação — spec-01 §6.)*

**Task 67. Card do mês em `/projecao` vira link pra Visão geral**
Cada card da lista de 12 meses passa a ser um link para `/visao-geral?mes=X&ano=Y` (Requisitos 3.6, Design §14.2), com hover destacando borda/fundo/sombra do card como affordance de clique. Usa tokens sólidos do tema (`border-ring`, `bg-muted`) em vez da sintaxe de opacidade `/NN` do Tailwind, que não gera CSS nos tokens deste projeto (achado registrado em spec-01 §7, correção mais ampla não priorizada).

**Task 68. Renomear "Visão geral" → "Visão mensal" (rota `/visao-geral` → `/visao-mensal`)**
Renomeação de tela e rota, terceira da linhagem depois de `/acompanhamento` → `/visao-geral` (Task 20) — ver spec-02 §8.5 e a linha da tabela de rotas em §8.2. Nenhuma mudança de comportamento, só identidade:

- **Pastas/arquivos**: `app/(protegido)/visao-geral/` → `app/(protegido)/visao-mensal/` (`page.jsx`, `visao-geral-client.jsx` → `visao-mensal-client.jsx`, `loading.jsx`, `error.jsx`); `components/visao-geral/` → `components/visao-mensal/` (`seletor-periodo.jsx`, `detalhe-diario.jsx`).
- **Componentes/funções**: `VisaoGeralClient` → `VisaoMensalClient`, `VisaoGeralPage` → `VisaoMensalPage`, `VisaoGeralLoading` → `VisaoMensalLoading`, `VisaoGeralError` → `VisaoMensalError`, e os imports que os referenciam (inclui os imports de `seletor-periodo`/`detalhe-diario` a partir do novo caminho `@/components/visao-mensal/...`).
- **String de rota `/visao-geral` → `/visao-mensal`** em: `navegacao-principal.jsx` (entrada do grupo Dados no sidebar + link "Dados" da barra inferior), `abas-dados.jsx` (aba "Visão geral"), redirect pós-login (`app/(auth)/login/page.jsx`), redirect de fallback em `app/(protegido)/usuarios/page.jsx`, `revalidatePath` em `lib/actions/transacoes.js` (5 Server Actions) e `lib/actions/valores-padrao.js`, `router.push` do `useNavegacaoPeriodo` em `seletor-periodo.jsx`, link dos cards em `projecao-client.jsx` (Task 67).
- **Texto "Visão geral" → "Visão mensal"**: label de navegação (sidebar + abas) e os três H1 (`page.jsx`, `loading.jsx`, `error.jsx`).

Specs atualizadas nesta mesma task (spec-01 e spec-02 já refletem "Visão mensal"/`/visao-mensal` em toda referência ao estado atual; tasks já concluídas que citam `/visao-geral` — Task 20 e as que vieram depois dela — permanecem como estão, registro histórico do que era verdade quando foram escritas, mesmo padrão já usado no rename anterior).

**Task 69. Receita padrão não é tratada como estimativa no bloco Entradas**
`entradas.estimado` (de `comporMes`) carrega a receita padrão — um valor garantido, nunca reduzido pelo real (Requisitos 3.5) — mas hoje é exibido com a mesma linguagem visual de "estimativa" usada nas Saídas, o que sugere uma incerteza que não existe. Design §16.2 revisado com o tratamento diferenciado; aplicar em ambas as telas que consomem o campo (Design §13.3: "a mesma função serve as duas telas"):

- **Visão mensal** (`visao-mensal-client.jsx`): no bloco Entradas expandido, a linha de receita padrão passa a vir **antes** dos lançamentos reais agrupados por dia (não mais depois), com rótulo "Receita padrão", borda sólida (`border-b`, não tracejada) e cor `text-entrada` (não `text-estimado`). O bloco recebe uma prop (ex.: `ehEntradas`) pra `BlocoPorDia` escolher entre esse tratamento e o de "Estimado" já existente (mantido, sem mudança, para Saídas no débito/crédito). No card de resumo "Entradas", o subtexto inverte a ordem: receita padrão primeiro, real depois.
- **Projeção** (`projecao-client.jsx`): `ValorComposto` recebe uma prop equivalente pra aplicar o mesmo subtexto invertido e a mesma cor só na chamada de Entradas de cada card de mês; a chamada de Saídas mantém o comportamento atual.
- Nenhuma mudança em `lib/projecao.js` — `comporMes` continua devolvendo `{real, estimado, total}` com a mesma chave para os dois casos (nota já registrada em Design §13.3 sobre por que a chave não foi renomeada); só a camada de exibição muda.

*(Checkpoint sugerido: critérios de aceite revisados de Visão mensal e Projeção — spec-01 §6.)*

**Task 70. Cards de mês da Projeção — layout enxuto**
Os cards da lista de 12 meses (`projecao-client.jsx`) estavam poluídos: cada mês repetia o mesmo nível de detalhe (composição real/estimado) que já existe na Visão mensal, destino do clique. Requisitos 3.6 e Design §14.2/§16.2 revisados (validados com o usuário via mock em HTML antes desta task, decisão registrada aqui):

- Remove `ValorComposto` (subtexto de composição real/estimado) e `LinhaMes`'s grid de 3 colunas iguais. Cada card passa a ter: mês à esquerda (nome em destaque, ano em `text-muted-foreground`) — no desktop empilhado em duas linhas com largura fixa pra padronizar o card, no mobile lado a lado numa linha só separado por ponto (`Agosto · 2026`), mesmas cores/tamanhos nos dois casos; três indicadores compactos ícone + valor ao centro — Entradas (`ArrowDownCircle`, `text-entrada`), Saídas (`ArrowUpCircle`, `text-muted-foreground` — sem token de cor único pra "saída" combinada de débito+crédito, ver justificativa em Design §14.2), Investimentos (`PiggyBank`, `text-investimento`), mostrando `R$ 0` quando o mês não teve nenhum; Disponível em destaque à direita (`text-xl font-semibold`, mantendo `DisponivelComDelta` — cor `text-destructive` só quando negativo, seta de simulação quando houver).
- Cada indicador usa `title` no elemento (nome do indicador) como alternativa textual ao ícone, já que o rótulo em texto sai do layout.
- `mes.investimentos` (já devolvido por `comporMes`, Design §13.3) passa a ser consumido nesta tela pela primeira vez — nenhuma mudança em `lib/projecao.js`.
- Sem mudança na tela "Antes" (Visão mensal) nem na simulação (§14.3) — só o card de mês da Projeção muda.

*(Checkpoint sugerido: critérios de aceite revisados da Projeção — spec-01 §6.)*

**Task 71. Simetria dos indicadores no mobile e rótulo do Disponível — card de mês da Projeção**
Achado do usuário em uso real: no mobile, os três indicadores (Entradas/Saídas/Investimentos) do card de mês quebravam em duas linhas assimétricas (2 numa linha, 1 sozinho embaixo), e o valor de Disponível não tinha nenhuma indicação textual do que representava. Design §14.2 revisado com as duas correções, validadas com o usuário via mock em HTML (comparação de alternativas + validação em escala real no pior caso) antes desta task:

- **`Indicador` (`projecao-client.jsx`):** fonte e ícone ganham valores menores só no mobile, mantendo o desktop inalterado — `text-[11px] md:text-sm`, `h-3.5 w-3.5 md:h-4 md:w-4`, `gap-1 md:gap-1.5`. O valor mantém `tabular-nums`.
- **Container dos indicadores em `LinhaMes`:** troca `flex-wrap gap-x-5 gap-y-1.5` por `flex-nowrap gap-x-2 md:gap-x-5` — nunca mais quebra entre os três, em nenhum breakpoint. `gap-y-1.5` sai (não há mais wrap, não há mais segunda linha).
- **`DisponivelComDelta`:** ganha uma legenda `text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-0.5` com o texto "Disponível", numa linha própria acima do valor (`text-xl font-semibold`, mantendo a regra de `text-destructive` quando negativo e o delta de simulação quando houver). Alinhamento herdado do container pai (`md:ml-auto md:text-right` em `LinhaMes`, já existente) — sem classe nova de alinhamento na legenda.
- Sem mudança em `lib/projecao.js` nem nos outros cards/telas — só o `LinhaMes` da Projeção.

*(Checkpoint sugerido: critérios de aceite revisados da Projeção — spec-01 §6. QA de interface obrigatório — mudança de UI — cobrindo especificamente o viewport 393px com um mês de valores de 5 dígitos, pra confirmar visualmente o que já foi validado por medição.)*

**Task 72. Gráfico de Disponível da Projeção migra pra Recharts**
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
Bug reportado pelo usuário — investigado, causa raiz confirmada por reprodução controlada (servidor com `TZ=UTC` forçado + navegador simulando fuso do Brasil), corrigido e revalidado com o mesmo cenário antes desta task. Design §1 revisado (nova subseção "Fuso do servidor").

- **Causa:** `paraData()` (`lib/actions/transacoes.js`) constrói a data com `new Date(ano, mes-1, dia)`, que resolve no fuso do processo. Servidor na Vercel roda em UTC; a exibição/edição acontece em Client Components, no fuso do navegador (Brasil). O valor gravado é tecnicamente correto (meia-noite UTC do dia certo), mas toda leitura no navegador mostra o dia anterior — e o modal de edição reenvia essa data já errada se salva sem alteração, andando a data real pra trás a cada edição.
- **Correção:** `process.env.TZ = "America/Sao_Paulo"` fixado em `lib/db.js` (módulo importado por toda Server Action/Server Component que lida com data) — não como variável de ambiente, porque a **Vercel bloqueia `TZ` por ser reservada internamente**. Nenhuma mudança em `paraData`, `calcularFatura`, ou qualquer lógica de data existente — só o fuso do processo em si.
- Reversão das tentativas anteriores de configurar `TZ` via `.env`/`.env.example` (não teriam efeito de qualquer forma — `.env` não sobrescreve uma variável já presente no processo, e a Vercel não aceita a variável).
- Sem mudança em `mesReferencia`/`anoReferencia` — já eram calculados corretamente no servidor a partir da data original, antes de qualquer releitura; o bug era só na data de calendário exibida/gravada, não na lógica financeira de qual mês cada transação conta.

*(Checkpoint: reprodução controlada — servidor iniciado com `TZ=UTC` forçado no shell (simulando o runtime da Vercel) + Playwright com `timezoneId: "America/Sao_Paulo"` — confirmando que uma data digitada é gravada e exibida de volta como o mesmo dia, sem a correção depender de nenhuma variável de ambiente. Suite de testes completa, sem mudança de comportamento nela — os testes de `lib/` são funções puras sem I/O, não importam `lib/db.js`.)*

---

**Task 75. Ícones no lugar de botões de texto e ações de criar/editar mais acessíveis — Valores padrão e Contas**
Os botões "Editar"/"Apagar" (texto + cor sólida) por linha poluem visualmente as duas telas, e o gatilho de criar item fica escondido — no fim de cada lista em Valores padrão, atrás de um wizard de 2 etapas em Contas. Design §8.2.3 e §15.4 revisados, validados com o usuário via mock em HTML interativo (antes/depois nas duas telas) antes desta task:

- **Ícones (`valores-padrao-client.jsx` e `contas-client.jsx`):** `LinhaValorPadrao` e `SecaoContas` trocam os `Button` de texto ("Editar" outline, "Apagar" destructive) por botões-ícone discretos — `Pencil`/`Trash2` (`lucide-react`), `text-muted-foreground` em repouso; hover leva editar a `text-foreground` e apagar a um tom vermelho suave (não mais o vermelho sólido do botão antigo). `window.confirm` antes de apagar continua idêntico — só o gatilho visual muda.
- **Valores padrão — "+" no cabeçalho:** `ListaValoresPadrao` move o gatilho de adicionar do fim do `CardContent` pro `CardHeader` (`justify-between`, "+" ao lado do título "Receitas padrão"/"Despesas padrão"). Quando `adicionando`, `FormularioInline` passa a renderizar **antes** de `itens.map(...)` (topo da lista), não depois.
- **Contas — edição vira inline:** `EditarContaDialog`/`EditarContaConteudo` saem; `SecaoContas` ganha um estado de "qual conta está em edição" (mesmo espírito de `editandoId` em `ListaValoresPadrao`) e troca a linha da conta por um formulário inline reaproveitando `CamposConta`, mesma estrutura de `FormularioInline`. A regra de campos bloqueados quando a conta tem transações (Design §17.4) continua idêntica, só muda o container visual (inline em vez de dentro de um `Dialog`).
- **Contas — criação vira por seção, sem escolha de tipo:** o botão global "+ Nova conta" (`flex justify-end` no topo da página) e `NovaContaDialog` (com sua etapa `escolherTipo`) saem. Cada `SecaoContas` (Contas correntes, Cartões de crédito, Contas de investimento) ganha seu próprio "+" no `CardHeader`, que abre `CamposConta` **inline, no topo da lista daquela seção**, já com o `tipo` implícito pela seção clicada — sem tela/etapa intermediária de escolha.
- Nenhuma mudança nas Server Actions (`criarConta`, `editarConta`, `apagarConta`, `criarValorPadrao`, `editarValorPadrao`, `apagarValorPadrao`) nem no schema — a task é inteiramente de UI/mecanismo de interação nos dois Client Components.

*(Checkpoint sugerido: critérios de aceite revisados de Contas — spec-01 item 5 e §6. QA de interface obrigatório — mudança de UI e mutação de dado — cobrindo: criar uma conta de cada tipo pelo "+" da seção correta (confirmando que o tipo vem certo, sem etapa de escolha), editar uma conta bloqueada (campos desabilitados) e uma não bloqueada, apagar uma conta, e o mesmo roteiro (criar via "+" do cabeçalho, editar, apagar) para receita padrão e despesa padrão em Valores padrão.)*

---

## M18 — Consolidação de despesa padrão no débito

Quatro tasks que entregam a funcionalidade descrita em Requisitos 3.9 e Design §13.6, validada com o usuário numa entrevista de requisitos aprofundada + mock em HTML interativo antes de qualquer código. A ordem é de dependência: refatoração e campo novo primeiro, regra e schema depois, superfície da funcionalidade por último.

**Task 76. Renomear `ConsolidacaoValorPadrao` → `ConsolidacaoReceitaPadrao`**
Refatoração pura, **sem nenhuma mudança de comportamento**, preparando terreno pra `ConsolidacaoDespesaPadrao` (Task 78): com duas consolidações de naturezas diferentes, o nome genérico atual (que na prática é receita-only) vira ambíguo. Design §3 e §13.5 revisados.

- **Schema/migration:** renomeia o model e a tabela. A relação em `ValorPadrao` passa de `consolidacoes` para `consolidacoesReceita`.
- **Server Actions (`lib/actions/valores-padrao.js`):** `consolidarValorPadrao` → `consolidarReceitaPadrao`; `removerConsolidacaoValorPadrao` → `removerConsolidacaoReceitaPadrao`.
- **Chamadas:** `visao-mensal-client.jsx` (os dois imports e usos em `LinhaItemReceitaPadrao`), `db.consolidacaoValorPadrao.findMany` em `visao-mensal/page.jsx` e `projecao/page.jsx`, e o `deleteMany` dentro de `apagarValorPadrao`.
- **`lib/projecao.js`:** nada muda ainda — o parâmetro `consolidacoes` de `comporMes` só é renomeado na Task 78, quando passa a existir um segundo. Manter aqui evitaria um rename em duas etapas, mas misturaria refatoração com mudança de regra.
- Tasks 73 e anteriores em spec-03 **mantêm o nome antigo** no texto, como registro histórico — mesmo padrão dos renames de rota (Tasks 20 e 68).

*(Checkpoint: lint + testes + build. QA de interface leve — consolidar e remover uma receita padrão na Visão mensal continua funcionando exatamente como antes; nenhum comportamento novo a validar.)*

**Task 77. `ValorPadrao` ganha categoria**
Prepara a consolidação de despesa (Task 79), que precisa de uma categoria pra criar o lançamento — `Transacao.categoria` é obrigatória e `ValorPadrao` não tinha nenhuma. Reabre parcialmente um item listado como fora do escopo no spec-01 (só categoria; a conta continua sendo escolhida na hora de consolidar). Design §3 e §15.4 revisados.

- **Schema/migration:** `ValorPadrao.categoria Categoria?` — nulável, usada só quando `tipo = SAIDA`.
- **`valores-padrao-client.jsx`:** o `FormularioInline` de despesa ganha um `Select` de Categoria (mesmas opções de `CATEGORIA_LABELS` já usadas em `/lancamento`), ao lado do seletor Crédito/Débito. Receita padrão não exibe o campo. Default `OUTROS` ao criar.
- **`LinhaValorPadrao`:** o subtexto da despesa passa a exibir a categoria junto do meio (ex.: `R$ 1.500,00 · Débito · Mercado`).
- **Server Actions:** `criarValorPadrao`/`editarValorPadrao` passam a aceitar e validar `categoria` — obrigatória quando `tipo = SAIDA`, forçada a `null` quando `ENTRADA` (mesmo padrão já usado para `meio`).
- Nenhuma mudança em `comporMes` — a categoria não participa de cálculo nenhum, só de exibição e do pré-preenchimento futuro.

*(Checkpoint: critério de aceite de Valores padrão — spec-01 §6. QA de interface: criar uma despesa padrão com categoria, editar trocando a categoria, e confirmar que receita padrão não pede o campo.)*

**Task 78. Schema da consolidação de despesa e a virada da regra do débito**
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
A superfície da funcionalidade: consolidar, editar, desfazer e acompanhar o que falta pagar. Layout **fiel ao mock validado com o usuário** (Design §13.6, que descreve cada elemento).

- **Server Actions (`lib/actions/valores-padrao.js`):** `consolidarDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia, valor, data, contaId, categoria })` e `removerConsolidacaoDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia })`. A primeira valida sessão, `tipo === "SAIDA" && meio === "DEBITO"`, conta `CONTA_CORRENTE` e **data dentro do mês exibido** (sem isso o lançamento nasce em outro mês e some da lista, sem erro aparente). Cria/atualiza a `Transacao` e faz `upsert` do registro numa `$transaction`; com valor zero não cria transação e apaga a que existir. Ambas revalidam `/visao-mensal`, `/projecao` e `/transacoes`.
- **`buscarSaidasDebito` (`lib/consolidacao.js`):** ganha `consolidacaoDespesa: null` no `where` — tira os lançamentos consolidados do agrupamento por dia. `/transacoes` **não** filtra.
- **`visao-mensal/page.jsx`:** monta `itensDespesaPadraoDebito` (`id`, `descricao`, `categoria`, `valorPadrao`, e quando consolidado `valor`/`data`/`contaId` vindos da transação — `contaId` pré-preenche a conta no formulário ao editar), na mesma composição que já monta `itensReceitaPadrao`.
- **`visao-mensal-client.jsx`:** `BlocoPorDia` do débito passa a renderizar a lista **antes** dos grupos por dia, com rótulo de seção `Despesas padrão`, seguida do divisor tracejado. `LinhaEstimado` deixa de ser usada no débito (continua no crédito, sem mudança). Cada linha: botão-ícone `Circle`/`CheckCircle2` (estado **e** gatilho), descrição, data (só quando pago com lançamento), valor — item pago inteiro em `text-muted-foreground`, pendente na cor normal. Em mês encerrado, pendente exibe `não registrado` no lugar do valor.
- **Formulário inline:** valor (`CampoValor`), data, conta corrente (`Select` só de `CONTA_CORRENTE`) e categoria (`Select` pré-preenchido pelo item). Ações `Cancelar`/`Consolidar`; quando o item já está resolvido, o primário vira `Salvar` e aparece à esquerda **`Apagar lançamento`** (ou **`Desfazer`**, quando resolvido por R$ 0 — não há lançamento a apagar). O rótulo é explícito de propósito: um "Apagar" solo se leria como apagar o item padrão, que é global.
- **Confirmações (`window.confirm`):** antes de apagar o lançamento, e antes de salvar com R$ 0 um item que tinha lançamento — este é uma exclusão de transação disparada por edição de valor, destrutiva demais pra acontecer em silêncio.
- Despesa padrão no **crédito** não ganha nada disso; o bloco de crédito fica idêntico.

*(Checkpoint: critérios de aceite da seção 3.9 — spec-01 §6. QA de interface obrigatório, cobrindo: consolidar um item e ver o lançamento sair do agrupamento por dia mas aparecer em /transações; editar o valor consolidado; apagar o lançamento e ver o item voltar a pendente; apagar o mesmo lançamento por /transações e confirmar o mesmo efeito; consolidar por R$ 0 e confirmar que nenhuma transação foi criada; data fora do mês rejeitada; e um mês encerrado exibindo "não registrado" sem somar ao total.)*

## M19 — Lançamento: persistência de Tipo/Conta/Data após salvar

**Task 80. Formulário de lançamento mantém Tipo, Conta e Data ao salvar**
Reduz a repetição ao lançar várias transações seguidas com a mesma conta/data (ex.: várias compras no mesmo cartão, no mesmo dia). Requisitos item 2 (revisado), Design §8.1 (revisado).

- **`lancamento-client.jsx`:** `handleSubmit`, ao concluir com sucesso, deixa de resetar pra `FORM_INICIAL` fixo — passa a resetar pro padrão preservando `tipo`, `contaId` e `dataCompra` do estado atual (os demais campos, incluindo checkboxes de investimento/parcelado/recorrente e seus campos dependentes, voltam ao padrão).
- Nenhuma mudança de validação ou nas Server Actions — é só o valor inicial do próximo preenchimento.

*(Checkpoint: critério de aceite do item 2 — spec-01 §6. QA de interface: salvar um lançamento e confirmar que Tipo/Conta/Data continuam preenchidos, e que valor/categoria/descrição/checkboxes voltam ao padrão.)*

## M20 — Correção: agrupamento por dia herdava horário de lançamento antigo

**Task 81. `agruparPorDia` deriva o dia exibido da chave, não da data bruta de uma transação**
Bug reportado pelo usuário — investigado, causa raiz confirmada por reprodução controlada, corrigido e revalidado antes desta task. Design §1 revisado (nova subseção logo após "Fuso do servidor").

- **Causa:** `agruparPorDia` (`lib/consolidacao.js`, usada por Entradas/Débito/Crédito) agrupa por `dataCompra.toISOString().slice(0,10)` (chave estável), mas exibe `dia: transacao.dataCompra` da **primeira** transação (por `dataCompra` crescente) que cria o grupo. Lançamentos gravados **antes** da Task 74 continuam em meia-noite UTC literal (`T00:00:00.000Z`) — sempre ordenam antes de um lançamento novo e correto do mesmo dia (`T03:00:00.000Z`) — e, exibida em `toLocaleDateString("pt-BR")` no fuso de São Paulo, meia-noite UTC literal volta um dia. O cabeçalho do grupo inteiro herda essa data errada, mesmo pra transações do grupo gravadas certinho. Reproduzido consultando os dados reais de produção (só leitura, credenciais rotacionadas logo em seguida).
- **Correção:** `agruparPorDia` reconstrói o `dia` exibido a partir da própria chave (`"YYYY-MM-DD"` → `new Date(ano, mes-1, dia)`, construção local, mesmo padrão de `paraData`) em vez de reaproveitar a data bruta de uma transação do grupo. Nenhuma mudança na chave de agrupamento em si, em `mesReferencia`/`anoReferencia`, ou em qualquer Server Action.
- Sem migração de dados — os valores antigos (`T00:00:00.000Z`) continuam gravados como estão; a correção torna a **exibição agrupada** robusta a essa mistura, sem depender de corrigir cada linha antiga.

*(Checkpoint: reprodução controlada — replicação de `agruparPorDia` rodada contra os dados reais de produção (mês/ano do caso relatado), confirmando o cabeçalho errado antes da correção e o cabeçalho correto depois, com o mesmo conjunto de dados. Suite de testes completa. QA de interface leve — criar dois lançamentos de crédito no mesmo dia com horários UTC distintos (simulando a mistura antigo/novo) e confirmar que o cabeçalho do dia exibe a data correta.)*

---

## M21 — Acompanhamento de fatura por cartão na Visão mensal

Duas tasks entregando a funcionalidade descrita em Requisitos 3.1 (revisado) e Design §8.3.7/§8.3.16, validadas com o usuário numa entrevista de requisitos + mock em HTML interativo (duas rodadas: mecanismo de alternância, depois o card por seção) antes de qualquer código. Ordem de dependência: o container visual (card por seção) primeiro, a funcionalidade nova (alternância por cartão) depois — a Task 83 já assume que "Saídas no crédito" é um card.

**Task 82. Cada seção da Visão mensal vira um card independente**
Puramente visual — **sem mudança de comportamento, dado ou lógica**. Design §8.3.7 revisado.

- **`visao-mensal-client.jsx`:** o container `<div className="flex flex-col divide-y divide-border mt-8">` que hoje envolve os quatro blocos (`BlocoPorDia`×3 + `BlocoInvestimentos`) é substituído por `<div className="flex flex-col gap-6 mt-8">` (mesmo `gap-6` já usado no grid do resumo, seção 8.3.2). Cada bloco (`BlocoPorDia`, `BlocoInvestimentos`) passa a renderizar sua própria `<section>` como um `Card` do shadcn/ui (`components/ui/card.jsx`, já usado no resumo) em vez do `<section className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0">` atual — cabeçalho (`CabecalhoBloco`) e corpo continuam com a mesma estrutura interna, só a casca visual muda (borda + `rounded-lg` + padding do `Card`/`CardContent`, no lugar do `divide-y`/`py-6`).
- **Sem mudança em:** `CabecalhoBloco`, `ListaReceitaPadrao`, `ListaDespesaPadrao`, `DetalheDiario`, `LinhaEstimado`, nenhuma Server Action, nenhuma query. É troca de wrapper, não de conteúdo.

*(Checkpoint: critério de aceite revisado da Visão mensal — spec-01 §6 (novo bullet "cada bloco é um card independente"). QA de interface: confirmar visualmente os quatro blocos como cards distintos (borda + espaçamento entre eles, sem `divide-y`), expandir/recolher cada um, e conferir que nenhum dado/total mudou — é regressão pura de layout.)*

---

**Task 83. Alternância "Por dia" / "Por cartão" no bloco Saídas no crédito**
A funcionalidade em si: apoiar a conferência manual dos lançamentos do app contra a fatura do banco. Design §8.3.16 (que descreve cada elemento fielmente ao mock validado com o usuário).

- **`visao-mensal-client.jsx`:** o corpo do bloco "Saídas no crédito" ganha duas abas construídas à mão ("Por dia" / "Por cartão", sem nova dependência — Design §8.3.16), estado local (`useState`) controlando qual vista está ativa, default "Por dia". A vista "Por dia" é o `DetalheDiario` já existente, sem mudança. A vista "Por cartão" é um componente novo (`ListaPorCartao` ou nome equivalente) que reagrupa as mesmas `saidasCredito` já recebidas via prop — **sem nova busca** — por `transacao.conta.id`/`conta.nome`, omitindo cartões sem lançamento no mês. Cada subgrupo: cabeçalho com ícone `CreditCard` (`text-muted-foreground`, não a cor de destaque do bloco) + nome do cartão + total do subgrupo em destaque; lista de lançamentos (descrição, `DD/MM`, valor) em ordem crescente por `dataCompra`, sem agrupar por dia; divisor tracejado entre subgrupos consecutivos.
- **`LinhaEstimado` ("Estimado restante"):** permanece fora da área que alterna, ao final do bloco, idêntica nas duas vistas — não reagrupada por cartão.
- **Sem mudança em:** `buscarSaidasCredito` (já traz `conta` via `include`), `comporMes`, nenhuma Server Action, nenhum schema.

*(Checkpoint: critério de aceite da seção 3.1 revisada — spec-01 §6. QA de interface: alternar entre as duas abas e conferir que os totais por cartão somam o total do bloco; um cartão sem lançamento no mês não aparece na vista "Por cartão"; a ordem cronológica dentro de um subgrupo; e que "Estimado restante" não muda ao trocar de aba.)*

---

**Task 84. Tag de parcela nas duas visões do bloco Saídas no crédito**
Mock em HTML interativo validado com o usuário antes da implementação. Design §8.3.4 e §8.3.16 revisados.

- **Visão "Por dia":** `visao-mensal-client.jsx` passa a fornecer `renderTag` no `BlocoPorDia` de Saídas no crédito (hoje só Entradas usa esse prop, pra `TagResgate`) — retorna a mesma tag pill de `/transacoes` ("X de Y") quando `transacao.numeroParcela` existe, senão `null`. Nenhuma mudança em `DetalheDiario`.
- **Visão "Por cartão":** cada linha de `ListaPorCartao` (Task 83) ganha a mesma tag, ao lado da descrição, com a mesma condição (`numeroParcela` existe).
- Reaproveita o componente/estilo de tag já existente (`BadgeTransacao` em `transacoes-client.jsx`, ou uma cópia local idêntica caso não seja exportável de lá) — sem inventar um novo visual.

*(Checkpoint: critério de aceite revisado da Visão mensal — spec-01 §6. QA de interface: um lançamento parcelado exibe a tag "X de Y" no popover/sheet do dia e, ao trocar pra visão "Por cartão", a mesma tag aparece na linha correspondente; um lançamento não-parcelado não exibe tag em nenhuma das duas visões.)*

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
