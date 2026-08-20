# Spec — Requisitos: App de Finanças Pessoais (Familiar)

**Fase:** 1/3 — Requisitos
**Status:** Rascunho para revisão
**Próxima fase:** Design técnico

---

## 1. Visão geral

Aplicação web para acompanhamento de finanças pessoais de uso familiar, substituindo uma planilha do Google Sheets atualmente usada para esse fim. Cada membro da família lança suas próprias transações, mas todos enxergam os mesmos dados (visão compartilhada).

## 2. Usuários

- Uso familiar (não é um produto multi-tenant para o público).
- Cada pessoa tem login próprio (email + senha, cadastro manual).
- Todos os usuários autenticados veem os mesmos dados financeiros (não há dados privados por usuário no MVP).

## 3. Escopo do MVP

### Dentro do escopo
1. **Autenticação**
   - Cadastro e login por email + senha.
   - Sessão autenticada obrigatória para acessar qualquer dado.
   - Após um login bem-sucedido, o usuário é redirecionado para a Visão geral (`/visao-geral`).
2. **Lançamento manual de transações**
   - Tela para registrar transações de **entrada** (receita) e **saída** (despesa).
   - Campos: valor, data, descrição, tipo (entrada/saída), categoria.
   - Transações são atribuídas ao usuário que as criou, mas visíveis a todos.
3. **Edição e exclusão**
   - Qualquer transação já lançada pode ser editada ou apagada livremente (sem histórico de alterações no MVP).
4. **Categorias**
   - Lista fixa de categorias, definida no código (ex: Mercado, Lazer, Saúde, Transporte, Moradia, Salário, Outros).
   - Sem criação de categorias pelo usuário nem sugestão automática no MVP.
5. **Conta (entidade polimórfica)**
   - Toda transação (entrada ou saída) é vinculada a uma **Conta**.
   - Uma Conta tem um **tipo**: Conta corrente, Cartão de crédito ou Conta de investimento.
   - Cada tipo tem atributos próprios: Cartão de crédito tem dia de fechamento e dia de vencimento; Conta corrente e Conta de investimento não têm atributos extras no MVP (apenas nome/apelido).
   - A distinção **débito/crédito** (antes um campo separado) agora é **deduzida do tipo da conta**: saída vinculada a Conta corrente = débito; saída vinculada a Cartão de crédito = crédito.
   - CRUD simples para as contas: nome/apelido, tipo, e atributos específicos do tipo.
   - A criação de uma conta ocorre em duas etapas: o usuário primeiro escolhe o tipo (Conta corrente, Cartão de crédito ou Conta de investimento) e, em seguida, preenche o formulário específico daquele tipo.
   - Contas são compartilhadas entre os membros da família, assim como as transações.
6. **Marcação de investimento (aporte/resgate)**
   - Uma transação pode ser marcada como **investimento**, indicando que representa um aporte ou resgate, e não um gasto/renda comum.
   - Aporte: saída vinculada à Conta corrente, marcada como investimento, referenciando a Conta de investimento de destino.
   - Resgate: entrada vinculada à Conta corrente, marcada como investimento, referenciando a Conta de investimento de origem.
7. **Visão geral (tela de acompanhamento financeiro mensal)**
   - Resumo mensal (total de entradas, total de saídas, disponível).
   - Sem gráficos ou análises visuais no MVP — foco em acompanhamento operacional e consulta das movimentações consolidadas do período.
   - Ver especificação detalhada na seção 3.1 abaixo.
8. **Parcelamento de compras no crédito**
   - Ao lançar uma saída no crédito, o usuário pode definir quantidade de parcelas e valor da parcela.
   - Ver especificação detalhada na seção 3.2 abaixo.
9. **Tela de listagem de transações (tabela)**
   - Visualização tabular de todas as transações lançadas, uma linha por registro.
   - Ver especificação detalhada na seção 3.3 abaixo.
10. **Navegação principal**
    - A aplicação possui cinco áreas, organizadas em **dois grupos semânticos**:
      - **Dados** — Visão geral, Transações e Projeção.
      - **Ajustes** — Contas e Valores padrão.
    - Não há área independente para Investimentos (tratado como bloco dentro da Visão geral).
    - **No mobile**, o menu inferior tem três alvos: o grupo Dados, a ação "Nova transação" em destaque no centro, e o grupo Ajustes. Dentro do grupo Dados, as três telas são alternadas por **abas fixas no topo do conteúdo**, a um único toque de distância uma da outra. O grupo Ajustes abre uma folha inferior com seus dois destinos.
    - **No desktop**, a barra lateral exibe os cinco destinos simultaneamente, com os dois grupos separados apenas por um **divisor** (sem rótulos de grupo).
    - Uma ação global "+ Nova transação" fica acessível a partir de qualquer área, abrindo diretamente o formulário completo de lançamento (sem etapa de pré-seleção de tipo).
    - Um menu do usuário logado, acessível a partir de qualquer área, exibe o nome do usuário autenticado e permite fazer logoff da aplicação, redirecionando para a tela de login.
11. **Transação recorrente**
    - Uma saída (no débito ou no crédito) ou uma entrada (só em Conta corrente) pode ser marcada como recorrente, repetindo o mesmo valor, conta, categoria e descrição por uma quantidade de meses definida pelo usuário.
    - Ver especificação detalhada na seção 3.4 abaixo.
12. **Valores padrão (estimativas mensais)**
    - O usuário mantém duas listas de valores esperados por mês — uma de **receitas** e uma de **despesas** — usadas para projetar meses cujos lançamentos reais ainda não existem.
    - Ver especificação detalhada na seção 3.5 abaixo.
13. **Projeção de 12 meses**
    - Tela dedicada que consolida os 12 meses seguintes, combinando lançamentos reais, compromissos já assumidos (parcelas e recorrências) e os valores padrão.
    - Ver especificação detalhada na seção 3.6 abaixo.
14. **Simulação de compra ("Can I Buy It?")**
    - Na tela de Projeção, o usuário simula uma compra parcelada no crédito e vê o impacto imediato nos 12 meses.
    - Ver especificação detalhada na seção 3.7 abaixo.

### 3.1 Especificação — Visão geral

- A tela deve permitir **filtrar por mês/ano de referência**.
- **No mobile**, além dos botões de seta e do seletor de mês/ano, o usuário pode trocar de mês arrastando horizontalmente (swipe) em qualquer ponto da tela: deslizar para a esquerda avança para o próximo mês, para a direita volta ao mês anterior.
- Ao trocar de mês via swipe, a tela deve exibir uma transição visual (fade + slide na direção do gesto) entre o conteúdo do mês anterior e o do novo mês carregado, dando feedback imediato ao usuário.
- Os dados devem ser exibidos em **quatro blocos consolidados e separados**, nesta ordem de exibição:
  1. **Entradas (receitas)** — inclui entradas regulares e resgates de investimento, rotulados de forma distinta (ex: tag "Resgate de investimento") para não se confundirem com renda regular.
  2. **Investimentos** — total bruto aportado no mês, **separado por Conta de investimento** (não inclui resgates, que aparecem no bloco Entradas).
  3. **Saídas no débito** — saídas vinculadas a Conta corrente, **exceto** as marcadas como investimento (aportes não contam como gasto).
  4. **Saídas no crédito** — saídas vinculadas a Cartão de crédito.
- Nos blocos 1, 2 e 3, as transações são **agrupadas e exibidas por dia** dentro do mês filtrado.
- Quando aplicável (ver seção 3.5), os **valores padrão** entram nos blocos Entradas, Saídas no débito e Saídas no crédito como uma linha própria, **visualmente distinta dos lançamentos reais** — deixando claro qual parcela do total é estimativa e qual é fato consumado.
- **Regra de mês de referência:**
  - Para **Entradas**, **Saídas no débito** e **Investimentos**: o mês de referência é o mês da própria data da transação.
  - Para **Saídas no crédito**: o mês de referência é o **mês do vencimento da fatura** à qual a compra foi atribuída — não o mês da data da compra. Como o fechamento do cartão pode cair antes do fim do mês, uma compra feita, por exemplo, em fins de um mês pode cair na fatura (e portanto no mês de referência) do mês seguinte.
  - A atribuição de uma compra no crédito à fatura correta é calculada a partir da **data da compra** e do **dia de fechamento** do cartão vinculado (algoritmo exato a ser detalhado na fase de Design).
  - Dentro do bloco "Saídas no crédito" de um mês de referência filtrado, os gastos são **agrupados pelo dia da compra original**, mas **exibidos dentro do mês de referência da fatura** à qual foram atribuídos — não no mês da data da compra.
  - **Racional:** o objetivo da tela é mostrar, para um mês filtrado, o que de fato precisa ser pago naquele mês (valor da fatura), e não o que foi gasto no crédito naquele mês. Por isso a filtragem/agrupamento por mês segue sempre o mês de referência (vencimento da fatura), mesmo que o agrupamento por dia dentro do bloco use a data original da compra.

### 3.2 Especificação — Lançamento de compras parceladas no crédito

- Aplica-se apenas a saídas vinculadas a uma **Conta do tipo Cartão de crédito**.
- Na tela de lançamento, o usuário informa **quantidade de parcelas** (N ≥ 1) e **valor da parcela** (valor uniforme aplicado a cada uma das N parcelas — não há suporte a parcelas de valores diferentes entre si no MVP).
- Ao salvar, o sistema cria **N transações**, uma por parcela, todas compartilhando a mesma **data da compra** mas com **data efetiva** distinta, conforme a regra:
  - **Parcela 1:** data efetiva = data da compra.
  - **Parcelas 2 a N:** data efetiva = primeiro dia do range da fatura seguinte à fatura da parcela anterior (ou seja, o dia de abertura da próxima fatura do cartão — dia de fechamento + 1). Na prática, cada parcela subsequente "cai" no mês de referência imediatamente seguinte ao da parcela anterior.
  - O **mês de referência** de cada parcela é calculado normalmente a partir da sua data efetiva, usando a mesma regra de fechamento/vencimento da conta (cartão) descrita na seção 3.1 — ou seja, não há uma regra de cálculo separada, a data efetiva é que "direciona" a parcela para a fatura correta.
- Cada parcela deve registrar sua posição no parcelamento (ex: "2/6") e todas as parcelas de uma mesma compra compartilham um identificador de grupo, para permitir localizá-las e operar sobre o conjunto.
- Na Visão geral (3.1), cada parcela aparece no bloco "Saídas no crédito" do seu respectivo mês de referência, agrupada pelo **dia da compra original** (não pelo dia de abertura da fatura usado no cálculo).
- **Edição e exclusão de parcelas:**
  - Por padrão, editar ou apagar uma parcela afeta **apenas aquela parcela** isoladamente.
  - Tanto na edição quanto na exclusão, o usuário deve ter a opção adicional de propagar a ação para **todas as parcelas restantes** (as de data efetiva futura em relação à parcela selecionada) — ex: apagar as restantes ao cancelar uma compra, ou editar o valor das restantes se o valor da parcela mudou.

### 3.3 Especificação — Tela de listagem de transações (tabela)

- Exibe todas as transações lançadas, uma linha por registro, com as seguintes colunas visíveis:
  1. Data efetiva
  2. Descrição
  3. Categoria
  4. Conta (nome/apelido)
  5. Valor
- **Data efetiva**, não Data da compra: é a data que determina o mês/fatura em que a transação realmente é cobrada. Numa compra parcelada, a Data da compra é a mesma em todas as parcelas — só a Data efetiva distingue quando cada parcela ocorre.
- Cada linha usa **indicadores visuais compactos** (sem coluna própria) para comunicar, quando aplicável: tipo (entrada/saída), parcela ("X de X"), recorrência ("X de X") e marcação de investimento.
- Clicar em qualquer ponto da linha abre um **modal com o detalhe completo do registro** — todas as informações hoje em colunas (Tipo, Data do lançamento, Mês de referência **por extenso**, Parcela, Recorrência, É investimento, Conta de investimento vinculada) — e as ações de **editar e apagar**, reaproveitando as regras já definidas nas seções 2.3 (edição/exclusão livre), 3.2 (parcelas: apagar isolada vs. apagar as restantes) e 3.4 (recorrência: mesmo padrão).
- **Filtros:** uma busca geral por descrição, mais filtros específicos por Conta, Categoria e Mês/Ano de referência — substitui o filtro por coluna individual usado até então.
- Deve haver **paginação ou scroll** conforme o volume de dados crescer (detalhe de implementação, a definir no Design).

### 3.4 Especificação — Lançamento de transação recorrente

- Aplica-se a: saídas vinculadas a Conta corrente **ou** Cartão de crédito; e entradas, **apenas** vinculadas a Conta corrente.
- Na tela de lançamento, o usuário marca a transação como **Recorrente** e informa a **quantidade de meses** (N ≥ 2) pelos quais ela deve se repetir.
- **Recorrente** e **Parcelado** são mutuamente exclusivos — aplica-se apenas a saídas no crédito (parcelado não existe para entrada).
- Ao salvar, o sistema cria **N transações**, uma por ocorrência, todas com o mesmo valor, conta, categoria e descrição, cada uma no mesmo dia do mês da data original, avançando um mês por ocorrência (ex: lançada dia 5/ago, as ocorrências seguintes caem em 5/set, 5/out...).
  - Caso o dia da data original não exista em algum mês seguinte (ex: dia 31 num mês de 30 dias, ou 29/30/31 em fevereiro), a ocorrência daquele mês cai no último dia do mês — mesmo tratamento já usado no parcelamento (seção 3.2).
- O **mês de referência** de cada ocorrência segue a mesma regra já definida para o tipo de conta vinculada (seção 3.1): mês da própria data para débito; mês de vencimento da fatura, calculado a partir da data daquela ocorrência, para crédito.
- Cada ocorrência registra sua posição na recorrência (ex: "3 de 12") e todas as ocorrências de uma mesma recorrência compartilham um identificador de grupo — mecanismo análogo ao parcelamento, mas distinto dele (uma saída não é simultaneamente parcela e ocorrência recorrente).
- **Edição e exclusão de ocorrências:** mesmo padrão já definido para parcelas (seção 3.2) — por padrão, afeta apenas a ocorrência selecionada; o usuário tem a opção adicional de propagar a ação (edição ou exclusão) para todas as ocorrências futuras da mesma recorrência.
- Uma saída recorrente vinculada à Conta corrente pode também ser marcada como investimento (aporte), como qualquer saída no débito — as duas marcações são independentes.
- Uma **entrada recorrente não pode** ser marcada como investimento (resgate) — combinação fora do escopo do MVP.

### 3.5 Especificação — Valores padrão

- O usuário mantém **duas listas** de valores esperados por mês:
  - **Receitas padrão** — ex.: "Salário: R$ 8.000".
  - **Despesas padrão** — ex.: "Alimentação: R$ 1.000", "Combustível: R$ 200".
- Cada item tem **descrição livre** e **valor**. Itens de despesa indicam ainda se são **crédito ou débito**; itens de receita não têm essa distinção (assume-se Conta corrente).
- Os itens **não são vinculados a uma conta específica** nem a uma categoria — são estimativas difusas, não lançamentos.
- A mesma lista vale para **todos os meses projetados**; não há exceção por mês.
- Os valores são **informados pelo usuário**. O sistema não os calcula a partir do histórico de lançamentos.
- Valores padrão **não geram transações**: não aparecem na tela de Transações, não podem ser editados como lançamento e não possuem data.

**Regra do teto — como a estimativa se combina com o real:**

- Um valor padrão funciona como **teto esperado**, que os lançamentos reais vão consumindo. O valor projetado para um item é `máx(0, valor padrão − real avulso já lançado no período)`.
- Se o real ultrapassar a estimativa, **vale o real** — a estimativa apenas deixa de somar.
- **Apenas gastos avulsos consomem a estimativa.** Parcelas e ocorrências de recorrência não a consomem, pois já se projetam sozinhas para os meses futuros; contá-las duplicaria o mesmo compromisso.
- A estimativa deixa de ser aplicada quando o período não pode mais receber novos gastos:
  - **Despesas no crédito:** vale até o **fechamento mais tardio** entre os cartões cadastrados para aquele mês de referência. Depois disso a fatura está fechada, todos os gastos já ocorreram, e só o real vale.
  - **Despesas no débito e receitas:** valem até o **fim do mês** de referência.
- Como consequência, a composição de cada mês degrada naturalmente com o tempo: **meses passados** nunca exibem estimativa; o **mês corrente** exibe uma composição de real e estimado; **meses futuros** são majoritariamente estimados, somados aos compromissos já assumidos.

### 3.6 Especificação — Projeção de 12 meses

- Tela dedicada, **separada da Visão geral**, que consolida os **12 meses seguintes** a partir do mês atual (janela deslizante).
- Para cada mês projetado, exibe o consolidado de entradas, saídas e disponível, calculado a partir de três fontes somadas:
  1. **Lançamentos reais** já existentes naquele mês de referência.
  2. **Compromissos já assumidos** — parcelas e ocorrências de recorrência que caem naquele mês.
  3. **Valores padrão**, aplicando a regra do teto descrita na seção 3.5.
- A tela deve deixar visualmente distinto o que é **real** e o que é **estimado**, para que o usuário perceba o grau de confiança de cada mês.
- A Visão geral (3.1) **continua existindo e não é substituída** — permanece como o detalhe de um único mês.

### 3.7 Especificação — Simulação de compra ("Can I Buy It?")

- Disponível **apenas** na tela de Projeção (3.6).
- O usuário informa: **cartão de crédito**, **data da compra**, **valor** e **quantidade de parcelas**. Não há campo de descrição.
- Aplica-se **somente a compras no crédito** — não há simulação de gasto no débito.
- Ao simular, os números dos 12 meses são recalculados como se a compra existisse, distribuindo as parcelas pelos meses de referência conforme as mesmas regras de fechamento de fatura e parcelamento já definidas (seções 3.1 e 3.2).
- A simulação é **efêmera**: não é persistida, não gera transações e é descartada ao sair da tela.
- O sistema **não emite veredito** ("pode comprar" / "não pode") nem aplica reserva mínima — apenas apresenta os números recalculados, deixando a conclusão com o usuário.

### Fora do escopo (fases futuras)
- Upload/importação de CSV de fatura de cartão de crédito (lançamento de saídas no crédito continua manual no MVP).
- Sugestão automática de categoria (regras ou IA).
- Controle de orçamento (limite por categoria).
- Entrada recorrente marcada como investimento (resgate recorrente) — só saída recorrente pode ser aporte.
- Recorrência "sem data de término" — a quantidade de meses é sempre definida pelo usuário no lançamento. (A necessidade de projetar valores indefinidamente é atendida pelos **valores padrão** da seção 3.5, que são um mecanismo distinto e não geram transações.)
- Veredito automático da simulação ("pode comprar" / "não pode") e reserva mínima configurável.
- Salvar e comparar múltiplos cenários de simulação.
- Simulação de compra à vista no débito — a simulação cobre apenas o crédito.
- Converter uma simulação em lançamento real.
- Vincular valores padrão a uma conta específica ou a uma categoria.
- Exceções mensais nos valores padrão (ex.: um valor diferente só em dezembro).
- Cálculo automático dos valores padrão a partir do histórico de lançamentos.
- Alternância entre tema claro e escuro — a aplicação adota tema escuro único.
- Dados privados por usuário / permissões diferenciadas.
- Histórico de alterações (auditoria) em transações.
- Multi-moeda (assume-se BRL único).
- Limite de crédito, bandeira ou outras informações avançadas do cartão.
- Parcelas de valores diferentes entre si numa mesma compra parcelada (assume-se valor uniforme por parcela).

## 4. Requisitos não funcionais

- **Stack sugerida:** Next.js (full-stack) + banco de dados leve (SQLite via Prisma/Drizzle) + NextAuth (ou equivalente) para autenticação. A ser confirmado na fase de Design.
- **Hospedagem:** Vercel (plano hobby/gratuito).
- **Responsividade:** deve funcionar bem em desktop e mobile (uso familiar no dia a dia, provavelmente via celular).
- **Tema visual:** a aplicação adota um **tema escuro único**, sem alternância claro/escuro e sem seguir a preferência do sistema. Todas as cores devem vir do sistema de tokens — incluindo as cores semânticas hoje cravadas na paleta clara (entradas, investimentos, saídas no débito, saídas no crédito e o destaque do seletor de período) — e o contraste de cada elemento sobre o novo fundo precisa ser revisado, não apenas herdado.

## 5. Modelo de dados (preliminar — a refinar no Design)

**Usuário**
- id, nome, email, senha (hash)

**Transação**
- id, usuário_id (quem lançou), tipo (entrada/saída), valor, descrição, categoria
- conta_id — conta vinculada (obrigatório em toda transação, incluindo entradas)
- data_compra — data em que a transação/compra efetivamente ocorreu (igual para todas as parcelas de uma mesma compra)
- data_efetiva — data usada para calcular o mês de referência (ver regra na 3.1/3.2); igual a data_compra para entradas, débito e a 1ª parcela de crédito; calculada para parcelas 2+
- mês_referência (1–12) e ano_referência — calculados a partir de data_efetiva + regras de fechamento da conta (quando aplicável, ex: cartão de crédito). Juntos identificam de forma única o período (ex: mês 8 / ano 2026), evitando ambiguidade entre anos diferentes.
- numero_parcela, total_parcelas (opcional; null/1 quando não é compra parcelada)
- parcelamento_id (opcional; agrupa as N transações de uma mesma compra parcelada)
- numero_ocorrencia, total_ocorrencias (opcional; null quando não é uma transação recorrente)
- recorrencia_id (opcional; agrupa as N transações de uma mesma transação recorrente — mecanismo distinto de parcelamento_id)
- é_investimento (booleano; default false) — marca a transação como aporte (se saída) ou resgate (se entrada)
- conta_investimento_id (opcional; obrigatório quando é_investimento = true) — a conta de investimento envolvida na operação (destino do aporte ou origem do resgate)

**Conta (polimórfica)**
- id, usuário_id (dono/cadastrante), nome/apelido, **tipo** (conta_corrente | cartao_credito | conta_investimento)
- Atributos específicos por tipo:
  - `cartao_credito`: dia_fechamento, dia_vencimento
  - `conta_corrente`: nenhum atributo extra no MVP
  - `conta_investimento`: nenhum atributo extra no MVP
- A distinção débito/crédito de uma saída é deduzida do tipo da conta vinculada (conta_corrente → débito; cartao_credito → crédito).
- Padrão de modelagem polimórfica exato (single table com colunas nulas por tipo vs. tabela base + tabelas por tipo) — decisão de Design, sem impacto no comportamento observável.

**Categoria**
- Lista fixa (enum ou seed no banco), sem tabela de gestão via UI.

**Valor padrão**
- id, descrição, valor
- tipo (entrada | saída)
- meio (crédito | débito) — aplicável apenas quando tipo = saída; nulo para entradas
- Não possui data, conta vinculada nem categoria: vale para todos os meses projetados e nunca gera transações. É consumido pelos lançamentos reais conforme a regra do teto (seção 3.5), mas não é alterado por eles.

## 6. Critérios de aceite (MVP)

- [ ] Um usuário consegue se cadastrar e fazer login.
- [ ] Após um login bem-sucedido, o usuário é redirecionado para a Visão geral.
- [ ] Um usuário logado consegue lançar uma transação de entrada e uma de saída, com categoria e conta vinculada.
- [ ] Um usuário consegue cadastrar, editar e apagar contas dos três tipos (Conta corrente, Cartão de crédito, Conta de investimento), com os campos específicos de cada tipo.
- [ ] Ao lançar uma saída, o débito/crédito é deduzido automaticamente da conta escolhida (Conta corrente = débito, Cartão de crédito = crédito), sem exigir escolha manual separada.
- [ ] Um usuário consegue marcar uma saída como aporte (investimento), referenciando a conta de investimento de destino.
- [ ] Um usuário consegue marcar uma entrada como resgate (investimento), referenciando a conta de investimento de origem.
- [ ] Um usuário consegue editar e apagar qualquer transação, independente de quem a criou.
- [ ] Todos os usuários da família veem as mesmas transações e contas ao logar.
- [ ] A Visão geral permite filtrar por mês/ano de referência.
- [ ] A Visão geral exibe quatro blocos separados, nesta ordem: Entradas, Investimentos, Saídas no débito e Saídas no crédito.
- [ ] Um aporte não aparece no bloco "Saídas no débito", aparecendo apenas no bloco "Investimentos", separado por conta de investimento.
- [ ] Um resgate aparece no bloco "Entradas", rotulado distintamente de uma entrada regular.
- [ ] Uma saída no crédito lançada em um mês, mas cuja fatura vence no mês seguinte (por causa do dia de fechamento do cartão), aparece corretamente no bloco de crédito do mês de referência correto.
- [ ] Ao lançar uma saída no crédito com N parcelas e um valor de parcela, o sistema cria N transações, cada uma no mês de referência correto (parcela 1 na fatura da data da compra, parcelas seguintes em faturas consecutivas subsequentes).
- [ ] As N parcelas de uma compra parcelada aparecem, cada uma em seu respectivo mês de referência, agrupadas pelo dia da compra original.
- [ ] É possível apagar uma parcela isolada sem afetar as demais.
- [ ] É possível apagar uma parcela e, na mesma ação, optar por apagar também todas as parcelas restantes daquela compra.
- [ ] É possível editar uma parcela isolada sem afetar as demais.
- [ ] É possível editar uma parcela e, na mesma ação, optar por propagar a alteração para todas as parcelas restantes daquela compra.
- [ ] Ao lançar uma transação recorrente (entrada ou saída) com N meses, o sistema cria N transações, cada uma no mês de referência correto.
- [ ] Uma entrada recorrente só pode ser vinculada a Conta corrente, nunca a Cartão de crédito.
- [ ] Não é possível marcar uma entrada recorrente como investimento (resgate).
- [ ] As N ocorrências de uma transação recorrente aparecem, cada uma em seu respectivo mês de referência.
- [ ] É possível apagar uma ocorrência recorrente isolada sem afetar as demais, ou apagar e propagar para as ocorrências futuras.
- [ ] É possível editar uma ocorrência recorrente isolada sem afetar as demais, ou editar e propagar para as ocorrências futuras.
- [ ] Não é possível marcar uma mesma saída como Parcelada e Recorrente simultaneamente.
- [ ] A Visão geral mostra corretamente entradas, saídas e disponível do mês corrente.
- [ ] A tela de listagem em tabela exibe as colunas Data efetiva, Descrição, Categoria, Conta e Valor, com indicadores visuais compactos para tipo/parcela/recorrência/investimento.
- [ ] Clicar em qualquer linha da tabela abre um modal com o detalhe completo do registro (Tipo, Data do lançamento, Mês de referência, Parcela, Recorrência, É investimento, Conta de investimento) e as ações de editar/apagar.
- [ ] A tela permite buscar por descrição e filtrar por Conta, Categoria e Mês/Ano de referência.
- [ ] A navegação principal apresenta cinco áreas em dois grupos — Dados (Visão geral, Transações, Projeção) e Ajustes (Contas, Valores padrão) — e uma ação global "+ Nova transação" acessível a partir de qualquer uma delas, abrindo o formulário completo sem etapas de pré-seleção.
- [ ] A criação de uma conta ocorre em duas etapas: escolha do tipo, seguida do formulário específico.
- [ ] Um usuário logado consegue abrir o menu do usuário e fazer logoff, sendo redirecionado para a tela de login.
- [ ] O usuário consegue cadastrar, editar e apagar itens nas listas de receitas padrão e despesas padrão, informando descrição e valor.
- [ ] Um item de despesa padrão indica se é crédito ou débito; um item de receita padrão não pede essa informação.
- [ ] Valores padrão não aparecem na tela de Transações e não podem ser editados como lançamento.
- [ ] Num mês futuro sem lançamentos reais, a projeção exibe o valor padrão integral.
- [ ] Num mês cuja fatura ainda está aberta, com gastos reais avulsos já lançados, a projeção exibe apenas a diferença entre o valor padrão e o real já gasto.
- [ ] Quando o gasto real avulso ultrapassa o valor padrão, a projeção passa a exibir o valor real, sem somar a estimativa por cima.
- [ ] Parcelas e ocorrências de recorrência não consomem o valor padrão.
- [ ] Depois que a fatura mais tardia de um mês de referência fecha, a estimativa de crédito deixa de aparecer naquele mês.
- [ ] Num mês já encerrado, nenhuma estimativa é exibida — apenas lançamentos reais.
- [ ] A Visão geral distingue visualmente a parcela estimada da parcela real dos totais.
- [ ] A tela de Projeção exibe os 12 meses seguintes ao mês atual, com entradas, saídas e disponível de cada um.
- [ ] A tela de Projeção distingue visualmente valores reais de estimados.
- [ ] Na tela de Projeção, o usuário consegue simular uma compra informando cartão, data, valor e quantidade de parcelas, e vê os 12 meses recalculados.
- [ ] A simulação distribui as parcelas pelos meses de referência corretos, respeitando o dia de fechamento do cartão escolhido.
- [ ] A simulação não é persistida: ao sair e voltar à tela de Projeção, os números voltam ao estado sem simulação.
- [ ] A simulação não cria transações reais.
- [ ] No mobile, o menu inferior apresenta três alvos: grupo Dados, ação "Nova transação" ao centro e grupo Ajustes.
- [ ] Dentro do grupo Dados no mobile, alternar entre Visão geral, Transações e Projeção custa um único toque.
- [ ] No desktop, a barra lateral exibe os cinco destinos, com os dois grupos separados por um divisor.
- [ ] A aplicação é exibida em tema escuro, com todos os elementos legíveis sobre o novo fundo.
- [ ] A aplicação está publicada e acessível via Vercel.

## 7. Perguntas em aberto / decisões futuras

*(Decisões técnicas como o algoritmo de mapeamento compra→fatura, a representação de mês/ano de referência e o padrão de polimorfismo de Conta foram resolvidas na fase de Design — ver spec-02-design.md, seção 9.)*

- Se `Conta de investimento` vai precisar de atributos próprios (instituição, tipo de investimento, rendimento) em fases futuras — fora do MVP por ora.
- Formato exato do CSV de fatura de cartão (a definir quando essa fase for priorizada).
- Se e como implementar categorização automática (regras vs. IA) numa fase 2.
- Se o histórico de alterações (quem editou o quê) será necessário conforme o uso familiar evoluir.
