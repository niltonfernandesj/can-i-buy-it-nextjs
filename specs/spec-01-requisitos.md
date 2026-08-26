# Spec — Requisitos: App de Finanças Pessoais (Familiar)

**Fase:** 1/3 — Requisitos
**Status:** Rascunho para revisão
**Próxima fase:** Design técnico

---

## 1. Visão geral

Aplicação web para acompanhamento de finanças pessoais de uso familiar, substituindo uma planilha do Google Sheets atualmente usada para esse fim. Cada membro da família lança suas próprias transações, mas todos enxergam os mesmos dados (visão compartilhada).

## 2. Usuários

- Uso familiar (não é um produto multi-tenant para o público).
- Cada pessoa tem login próprio (email + senha).
- **Não há cadastro público.** Não existe rota de autoatendimento: novos usuários são criados **por um administrador**, de dentro da aplicação, numa tela restrita a ele.
- **Administrador** é um usuário marcado como tal. Além de tudo que um usuário comum faz, ele pode criar e editar usuários. Não há exclusão de usuários — revogar acesso é trocar a senha, o que preserva a autoria dos lançamentos já feitos.
- Todos os usuários autenticados veem os mesmos dados financeiros (não há dados privados por usuário no MVP).

> **Por que essas duas últimas regras são inseparáveis:** como qualquer sessão autenticada enxerga e altera todos os dados financeiros da família, **quem pode se cadastrar é quem pode ver tudo**. Um cadastro aberto transformaria o compartilhamento intencional numa exposição pública. A ausência de isolamento por usuário só é aceitável enquanto a criação de contas for controlada.

## 3. Escopo do MVP

### Dentro do escopo
1. **Autenticação e gestão de usuários**
   - Login por email + senha. **Sem rota de cadastro público** — ver seção 2.
   - Sessão autenticada obrigatória para acessar qualquer dado.
   - Após um login bem-sucedido, o usuário é redirecionado para a Visão mensal (`/visao-mensal`).
   - Tentativas de login são limitadas por taxa, para inviabilizar força bruta e uso de credenciais vazadas.
   - Uma tela de **gestão de usuários**, acessível apenas ao administrador, permite criar novos usuários e editar os existentes (nome e senha). A tela deve deixar explícito que qualquer usuário criado ali passa a enxergar e editar todos os dados financeiros da família.
   - O administrador não pode retirar a própria condição de administrador nem alterar o próprio e-mail por essa tela — do contrário perderia o acesso sem caminho de volta pela aplicação.
2. **Lançamento manual de transações**
   - Tela para registrar transações de **entrada** (receita) e **saída** (despesa).
   - Campos: valor, data, descrição, tipo, categoria.
   - Transações são atribuídas ao usuário que as criou, mas visíveis a todos.
   - Após salvar um lançamento com sucesso, o formulário limpa a maioria dos campos, mas mantém **Tipo, Conta, Categoria e Data** preenchidos — os campos mais prováveis de se repetir entre lançamentos consecutivos (ex.: registrar várias compras seguidas no mesmo cartão, no mesmo dia, na mesma categoria — revisado, Task 80 e Task 85).
   - **Tipo (revisado — Task 86):** o usuário escolhe entre três opções — **Entrada**, **Saída** ou **Investimento** — pra reduzir a fricção de marcar um aporte, hoje uma marcação secundária (checkbox) sobre Saída. A escolha de Tipo continua determinando internamente se a transação é uma entrada ou uma saída (seção 6, abaixo) — "Investimento" nesta tela sempre corresponde a uma saída (aporte); não há opção equivalente pra resgate, que continua sendo lançado como uma Entrada comum (seção 6).
   - **Entrada no crédito — estorno (M27):** a combinação Tipo = Entrada + Meio = Crédito passa a ser permitida, e representa um **estorno** (devolução, cancelamento de cobrança, crédito concedido pelo banco). Não é receita: abate da fatura do cartão. Ver especificação detalhada na seção 3.11 abaixo.
3. **Edição e exclusão**
   - Qualquer transação já lançada pode ser editada ou apagada livremente (sem histórico de alterações no MVP).
4. **Categorias** (revisado — M25)
   - ~~Lista fixa de categorias, definida no código.~~ Passa a ser **entidade no banco, gerenciada pelo usuário** numa tela própria (§3.10), no mesmo contexto de configuração de Contas e Valores padrão.
   - Cada categoria tem **nome** e **cor**, escolhida numa paleta fixa do tema (não um seletor livre — ver §3.10).
   - Categoria pode ser **desativada**: deixa de ser oferecida em novos lançamentos, mas continua válida e exibida normalmente nos lançamentos que já a usam. É o caminho para aposentar uma categoria sem perder histórico.
   - **Exclusão é bloqueada** enquanto houver transação ou valor padrão usando a categoria. Só categorias sem uso algum podem ser excluídas.
   - Um nível só — sem subcategorias.
   - As 7 categorias que existiam em código (Mercado, Lazer, Saúde, Transporte, Moradia, Salário, Outros) passam a ser linhas comuns da nova tabela, **preservando a categorização de todo o histórico** (ver Design §18.2). A partir daí são editáveis e desativáveis como qualquer outra.
   - Sem sugestão automática de categoria (segue fora do escopo).
5. **Conta (entidade polimórfica)**
   - Toda transação (entrada ou saída) é vinculada a uma **Conta**.
   - Uma Conta tem um **tipo**: Conta corrente, Cartão de crédito ou Conta de investimento.
   - Cada tipo tem atributos próprios: Cartão de crédito tem dia de fechamento e dia de vencimento; Conta corrente e Conta de investimento não têm atributos extras no MVP (apenas nome/apelido).
   - A distinção **débito/crédito** (antes um campo separado) agora é **deduzida do tipo da conta**: saída vinculada a Conta corrente = débito; saída vinculada a Cartão de crédito = crédito.
   - CRUD simples para as contas: nome/apelido, tipo, e atributos específicos do tipo.
   - A criação de uma conta acontece direto no formulário específico do tipo — o usuário inicia a criação a partir da seção daquele tipo (Contas correntes, Cartões de crédito ou Contas de investimento), que já define o tipo, sem uma etapa separada de escolha (revisado — Task 75; a versão original desta seção previa uma etapa de escolha de tipo antes do formulário, substituída por decisão do usuário visando consistência com a tela de Valores padrão).
   - Contas são compartilhadas entre os membros da família, assim como as transações.
6. **Marcação de investimento (aporte/resgate)**
   - Uma transação pode ser marcada como **investimento**, indicando que representa um aporte, e não um gasto comum.
   - Aporte: saída vinculada à Conta corrente, marcada como investimento, referenciando a Conta de investimento de destino. **Lançado escolhendo Tipo = Investimento (revisado — Task 86)** — deixa de existir como uma marcação secundária (checkbox) sobre uma saída comum; ao escolher esse Tipo, a tela pede diretamente a Conta de origem (a conta corrente) e a Conta de destino (a conta de investimento).
   - Resgate: uma entrada comum, vinda de uma conta de investimento — **sem marcação nem conta de investimento vinculada na tela de lançamento (revisado — Task 86)**. A capacidade de vincular uma entrada a uma conta de investimento de origem existe no modelo de dados mas não tem mais superfície de uso — na prática, o usuário registra um resgate como qualquer outra Entrada.
6.1 **Detalhamento de investimentos (M29)**
   - A conta de investimento deixa de ser um saldo único e passa a ter **saldo em conta** (dinheiro parado na corretora) e **saldo investido** (dentro de ativos).
   - Nasce a entidade **Ativo**: uma posição de renda fixa dentro de uma conta de investimento.
   - Uma área própria, `/investimentos`, consolida patrimônio, saldos e posições.
   - Ver especificação detalhada na seção 3.13 abaixo.
7. **Visão mensal (tela de acompanhamento financeiro mensal)**
   - Resumo mensal (total de entradas, total de saídas, disponível).
   - Sem gráficos ou análises visuais no MVP — foco em acompanhamento operacional e consulta das movimentações consolidadas do período.
   - Ver especificação detalhada na seção 3.1 abaixo.
8. **Parcelamento de compras no crédito**
   - Ao lançar uma saída no crédito, o usuário pode definir quantidade de parcelas e valor da parcela.
   - **Integrado ao campo Valor (revisado — Task 85):** a quantidade de parcelas deixa de ser uma marcação secundária (checkbox "Parcelado") com campos próprios — vira um controle sempre visível junto do campo Valor (só quando a conta escolhida é Cartão de crédito), começando em 1 (uma parcela = compra não parcelada, comportamento padrão). A partir de 2, o próprio campo Valor passa a significar "valor de cada parcela", e uma legenda mostra o total da compra calculado a partir do valor e da quantidade informados.
   - Ver especificação detalhada na seção 3.2 abaixo.
9. **Tela de listagem de transações (tabela)**
   - Visualização tabular de todas as transações lançadas, uma linha por registro.
   - Ver especificação detalhada na seção 3.3 abaixo.
10. **Navegação principal**
    - A aplicação possui cinco áreas, organizadas em **dois grupos semânticos**:
      - **Dados** — Visão mensal, Transações e Projeção.
      - **Ajustes** — Contas e Valores padrão.
    - Não há área independente para Investimentos (tratado como bloco dentro da Visão mensal).
    - **No mobile**, o menu inferior tem três alvos: o grupo Dados, a ação "Nova transação" em destaque no centro, e o grupo Ajustes. Dentro do grupo Dados, as três telas são alternadas por **abas fixas no topo do conteúdo**, a um único toque de distância uma da outra. O grupo Ajustes abre uma folha inferior com seus dois destinos.
    - **No desktop**, a barra lateral exibe os cinco destinos simultaneamente, com os dois grupos separados apenas por um **divisor** (sem rótulos de grupo).
    - Uma ação global "+ Nova transação" fica acessível a partir de qualquer área, abrindo diretamente o formulário completo de lançamento (sem etapa de pré-seleção de tipo).
    - Um menu do usuário logado, acessível a partir de qualquer área, exibe o nome do usuário autenticado e permite fazer logoff da aplicação, redirecionando para a tela de login.
11. ~~**Transação recorrente**~~ — **removido (Task 87).** A funcionalidade descrita originalmente na seção 3.4 (saída recorrente no débito ou crédito; entrada recorrente só em conta corrente) sai da aplicação por completo — schema, backend e tela de lançamento. No débito, já era redundante com despesa padrão (seção 3.5, que oferece conferência mensal de verdade, sem exigir comprometer valor/prazo de antemão) e receita padrão (mesma seção, pro lado da entrada). No crédito, era usada principalmente pra assinaturas — sem substituto imediato até que uma futura funcionalidade de gestão de assinaturas exista; até lá, uma assinatura no crédito volta a ser lançada manualmente, mês a mês, sem nenhum rastro de que é recorrente. Ver seção 3.4 (abaixo) e Design §5/§8.2.4 pro detalhe do que sai.
12. **Valores padrão**
    - O usuário mantém duas listas de valores mensais: **receitas padrão**, que entram integralmente em todo mês (renda perpétua, sem data de término), e **despesas padrão**, que estimam o gasto corrente dos meses ainda não realizados.
    - Ver especificação detalhada na seção 3.5 abaixo.
13. **Projeção de 12 meses**
    - Tela dedicada que consolida os 12 meses seguintes, combinando lançamentos reais, compromissos já assumidos (parcelas e recorrências) e os valores padrão.
    - Ver especificação detalhada na seção 3.6 abaixo.
14. **Simulação de compra**
    - Na tela de Projeção, o usuário simula uma compra parcelada no crédito e vê o impacto imediato nos 12 meses.
    - Ver especificação detalhada na seção 3.7 abaixo.

### 3.1 Especificação — Visão mensal

- A tela deve permitir **filtrar por mês/ano de referência**.
- **No mobile**, além dos botões de seta e do seletor de mês/ano, o usuário pode trocar de mês arrastando horizontalmente (swipe) em qualquer ponto da tela: deslizar para a esquerda avança para o próximo mês, para a direita volta ao mês anterior.
- Ao trocar de mês via swipe, a tela deve exibir uma transição visual (fade + slide na direção do gesto) entre o conteúdo do mês anterior e o do novo mês carregado, dando feedback imediato ao usuário.
- Os dados devem ser exibidos em **quatro blocos consolidados e separados**, nesta ordem de exibição:
  1. **Entradas (receitas)** — inclui entradas regulares e resgates de investimento, rotulados de forma distinta (ex: tag "Resgate de investimento") para não se confundirem com renda regular. **Somente entradas no débito** (revisado — M27): uma entrada vinculada a Cartão de crédito é um estorno e não aparece aqui, nem como linha, nem no total do bloco (seção 3.11).
  2. **Investimentos** — total bruto aportado no mês, **separado por Conta de investimento** (não inclui resgates, que aparecem no bloco Entradas).
  3. **Saídas no débito** — saídas vinculadas a Conta corrente, **exceto** as marcadas como investimento (aportes não contam como gasto).
  4. **Saídas no crédito** — saídas vinculadas a Cartão de crédito, **menos os estornos** do mês de referência (revisado — M27), que aparecem dentro deste bloco com valor negativo (seção 3.11).
- Cada um dos quatro blocos é exibido como um **card independente** — borda e cantos arredondados, mesmo tratamento visual dos cards do resumo financeiro do mês (revisado, Task 82; substitui o layout anterior de seções abertas separadas só por divisores sutis).
- Nos blocos 1, 2 e 3, as transações são **agrupadas e exibidas por dia** dentro do mês filtrado.
- Quando aplicável (ver seção 3.5), os **valores padrão** entram nos blocos Entradas, Saídas no débito e Saídas no crédito como uma linha própria, **visualmente distinta dos lançamentos reais**. A distinção não é a mesma nos três blocos — segue a diferença de natureza da seção 3.5:
  - Em **Saídas no débito** e **Saídas no crédito**, a linha representa uma **estimativa** (teto ainda não consumido) — o tratamento visual deve comunicar incerteza, e a linha vem **depois** dos lançamentos reais do dia.
  - Em **Entradas**, a linha representa a **receita padrão**, um valor **garantido, não uma estimativa** (seção 3.5) — o tratamento visual não pode sugerir incerteza que não existe, e a linha vem **antes** dos lançamentos reais do dia, como base sobre a qual as entradas pontuais somam.
- **Regra de mês de referência:**
  - Para **Entradas**, **Saídas no débito** e **Investimentos**: o mês de referência é o mês da própria data da transação.
  - Para **Saídas no crédito**: o mês de referência é o **mês do vencimento da fatura** à qual a compra foi atribuída — não o mês da data da compra. Como o fechamento do cartão pode cair antes do fim do mês, uma compra feita, por exemplo, em fins de um mês pode cair na fatura (e portanto no mês de referência) do mês seguinte.
  - A atribuição de uma compra no crédito à fatura correta é calculada a partir da **data da compra** e do **dia de fechamento** do cartão vinculado (algoritmo exato a ser detalhado na fase de Design).
  - Dentro do bloco "Saídas no crédito" de um mês de referência filtrado, os gastos são **agrupados pelo dia da compra original**, mas **exibidos dentro do mês de referência da fatura** à qual foram atribuídos — não no mês da data da compra.
  - **Racional:** o objetivo da tela é mostrar, para um mês filtrado, o que de fato precisa ser pago naquele mês (valor da fatura), e não o que foi gasto no crédito naquele mês. Por isso a filtragem/agrupamento por mês segue sempre o mês de referência (vencimento da fatura), mesmo que o agrupamento por dia dentro do bloco use a data original da compra.
- **Alternância de visão no bloco Saídas no crédito (Task 83):** o usuário pode alternar entre **por dia** (padrão, comportamento acima, inalterado) e **por cartão** — nesta segunda opção, os lançamentos do mês de referência aparecem organizados em subgrupos, um por cartão de crédito com movimentação naquele mês (cartões sem lançamento no período não aparecem), cada subgrupo com um **total próprio em destaque** e a lista de seus lançamentos (descrição, data da compra, valor) em ordem cronológica crescente — sem agrupar por dia dentro do subgrupo. Existe pra apoiar a **conferência manual** dos lançamentos registrados no app contra o valor mostrado pelo banco na fatura de um cartão específico. A linha de estimativa ("Estimado restante") não muda entre as duas visões.
- **Tag de parcela no crédito (Task 84):** um lançamento que pertence a um parcelamento exibe a mesma tag já usada em `/transacoes` ("X de X") ao lado da descrição — tanto no detalhamento por dia (dentro do popover/sheet do dia) quanto na visão por cartão.
- **Valores negativos (M27):** com estornos, um agregado desta tela pode ficar negativo — o total de um dia, o total de um cartão, o total do bloco Saídas no crédito, o card de resumo Saídas. Em **qualquer** desses casos o valor é exibido com sinal negativo e em verde (a mesma cor de entrada), a mesma regra aplicada ao estorno individual. Não há arredondamento para zero nem inversão de sinal em nenhum nível de agregação.
- **Exceção — o card Disponível** continua na cor padrão quando negativo. Ele não é um agregado de saída: negativo ali significa **déficit no mês**, contra o usuário, o oposto do que o verde comunica nos demais. (Ajuste feito durante a implementação; a decisão original dizia "todos os agregados", sem separar esse caso.)

### 3.2 Especificação — Lançamento de compras parceladas no crédito

- Aplica-se apenas a saídas vinculadas a uma **Conta do tipo Cartão de crédito**.
- Na tela de lançamento, o usuário informa **quantidade de parcelas** (N ≥ 1) e **valor da parcela** (valor uniforme aplicado a cada uma das N parcelas — não há suporte a parcelas de valores diferentes entre si no MVP).
- Ao salvar, o sistema cria **N transações**, uma por parcela, todas compartilhando a mesma **data da compra** mas com **data efetiva** distinta, conforme a regra:
  - **Parcela 1:** data efetiva = data da compra.
  - **Parcelas 2 a N:** data efetiva = primeiro dia do range da fatura seguinte à fatura da parcela anterior (ou seja, o dia de abertura da próxima fatura do cartão — dia de fechamento + 1). Na prática, cada parcela subsequente "cai" no mês de referência imediatamente seguinte ao da parcela anterior.
  - O **mês de referência** de cada parcela é calculado normalmente a partir da sua data efetiva, usando a mesma regra de fechamento/vencimento da conta (cartão) descrita na seção 3.1 — ou seja, não há uma regra de cálculo separada, a data efetiva é que "direciona" a parcela para a fatura correta.
- Cada parcela deve registrar sua posição no parcelamento (ex: "2/6") e todas as parcelas de uma mesma compra compartilham um identificador de grupo, para permitir localizá-las e operar sobre o conjunto.
- Na Visão mensal (3.1), cada parcela aparece no bloco "Saídas no crédito" do seu respectivo mês de referência, agrupada pelo **dia da compra original** (não pelo dia de abertura da fatura usado no cálculo).
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
- Cada linha usa **indicadores visuais compactos** (sem coluna própria) para comunicar, quando aplicável: tipo (entrada/saída), parcela ("X de X"), marcação de investimento e **estorno (M27)**. ~~Recorrência ("X de X")~~ — **removido (Task 87)**, junto com a funcionalidade em si.
- **Indicador de estorno (M27):** um estorno é uma entrada como qualquer outra nesta tela — mesmo sinal "+", mesma cor —, o que o tornaria indistinguível de um salário sem uma marcação própria. Por isso ele recebe indicador, **diferente da Visão mensal**, onde o valor negativo em verde já o distingue sozinho. O valor continua exibido com sinal "+", coerente com o tipo do registro: esta tela lista transações, não compõe a fatura.
- Clicar em qualquer ponto da linha abre um **modal com o detalhe completo do registro** — todas as informações hoje em colunas (Tipo, Data do lançamento, Mês de referência **por extenso**, Parcela, É investimento, Conta de investimento vinculada) — e as ações de **editar e apagar**, reaproveitando as regras já definidas nas seções 2.3 (edição/exclusão livre) e 3.2 (parcelas: apagar isolada vs. apagar as restantes).
- **Filtros:** uma busca geral por descrição, mais filtros específicos por Conta, Categoria e Mês/Ano de referência — substitui o filtro por coluna individual usado até então.
- Deve haver **paginação ou scroll** conforme o volume de dados crescer (detalhe de implementação, a definir no Design).

### 3.4 ~~Especificação — Lançamento de transação recorrente~~ (removida — Task 87)

Esta seção descrevia a funcionalidade de transação recorrente (saída no débito ou crédito; entrada só em conta corrente; N ocorrências geradas de uma vez, com posição "X de N" e propagação de edição/exclusão às ocorrências futuras — mesmo mecanismo do parcelamento, seção 3.2, mas um grupo distinto). O texto original é preservado no histórico do repositório; ver o motivo da remoção no item 11 (seção 3, acima) e o detalhe técnico do que sai em Design §5/§8.2.4.

### 3.5 Especificação — Valores padrão

- O usuário mantém **duas listas** de valores esperados por mês:
  - **Receitas padrão** — ex.: "Salário: R$ 8.000".
  - **Despesas padrão** — ex.: "Alimentação: R$ 1.000", "Combustível: R$ 200".
- Cada item tem **descrição livre** e **valor**. Itens de despesa indicam ainda se são **crédito ou débito**; itens de receita não têm essa distinção (assume-se Conta corrente).
- Os itens **não são vinculados a uma conta específica** nem a uma categoria — são estimativas difusas, não lançamentos.
- A mesma lista vale para **todos os meses projetados** por padrão; a única exceção é a **consolidação mensal de receita padrão** (seção 3.8), que ajusta um item específico de receita só para um mês, sem alterar a lista em si nem os demais meses. Despesa padrão não tem exceção por mês — o teto consumido pelo real (abaixo) já dá a flexibilidade mês a mês que a receita, puramente aditiva, não tem.
- Os valores são **informados pelo usuário**. O sistema não os calcula a partir do histórico de lançamentos.
- Valores padrão **não geram transações**: não aparecem na tela de Transações, não podem ser editados como lançamento e não possuem data.

As duas listas **não seguem a mesma regra** — receita padrão é um lançamento perpétuo, despesa padrão é uma estimativa com teto.

**Receitas padrão — valor cheio, sempre:**

- Uma receita padrão entra **integralmente em todo mês**, sem teto e sem ser consumida por nada. Ela não é uma estimativa: é a renda mensal do usuário, declarada uma vez e válida indefinidamente.
- **Entradas reais somam por cima**, sem descontar. Uma receita pontual (bônus, 13º, freelance) é um ganho adicional àquele mês, não parte da renda padrão.
- **Consequência operacional:** a mesma renda não deve existir nos dois lugares. Ao adotar receitas padrão, o usuário deixa de lançar entradas recorrentes para aquela renda — do contrário, os meses em que ambas existirem contarão o valor duas vezes.
- **Limitação aceita:** como uma receita padrão não tem vigência, alterar seu valor muda também os meses já passados. Para um app de uso pessoal com foco no futuro, isso é preferível à complexidade de versionar o valor no tempo.

**As duas despesas padrão não seguem mais a mesma regra** (revisado — Task 78): **crédito continua sendo um teto consumido pelo real**; **débito passa a ser uma previsão fixa por item**, resolvida individualmente via consolidação (seção 3.9). A divergência não é arbitrária — ela acompanha como o dinheiro sai em cada meio: no crédito os gastos pingam ao longo do mês, difusos, e a fatura fecha num total só (um teto que o real vai comendo descreve isso bem); no débito, as despesas padrão são contas nominais que se paga uma a uma (aluguel, internet, mercado), e o que o usuário quer saber é *quais já pagou*, não *quanto sobrou de um teto agregado*.

**Despesas padrão no crédito — teto consumido pelo real (inalterado):**

- Uma despesa padrão no crédito funciona como **teto esperado**, que os lançamentos reais vão consumindo. O valor projetado é `máx(0, total padrão do crédito − real já lançado que consome)`.
- Se o real ultrapassar a estimativa, **vale o real** — a estimativa apenas deixa de somar.
- **Consomem a estimativa:** gastos avulsos e **ocorrências de recorrência** — ambos representam o gasto corrente e previsível que a tabela modela.
- **Não consomem, somam por cima:** **parcelas**. Uma parcela é o compromisso pontual de uma compra específica, não parte do gasto do dia a dia — é exatamente o que o usuário quer ver somado à sua média.
- **Estorno não devolve teto (M27).** Um estorno abate o **real** do crédito, mas **não** entra no cálculo da estimativa: o teto continua sendo consumido pelo valor bruto dos gastos que o consomem, como se o estorno não existisse. Decisão explícita do usuário entre as duas alternativas: a rejeitada tratava o estorno como um avulso negativo, devolvendo teto e mantendo o total do mês inalterado enquanto a fatura não fechasse. Consequência da regra adotada: **estornar reduz o total do mês imediatamente**, mesmo com a fatura aberta.
- A estimativa vale até o **fechamento mais tardio** entre os cartões cadastrados para aquele mês de referência. Depois disso a fatura está fechada, todos os gastos já ocorreram, e só o real vale.

**Despesas padrão no débito — previsão fixa por item (revisado — Task 78):**

- Cada item de despesa padrão no débito entra no mês pelo **seu valor cheio**, individualmente — não há teto agregado.
- **Nenhum lançamento consome esses valores.** Gastos avulsos, ocorrências de recorrência e parcelas no débito **somam por cima**, como qualquer despesa. (Antes desta revisão, avulsos e recorrências consumiam o teto do débito.)
- Um item deixa de ser previsão e passa a valer pelo real quando é **consolidado** (seção 3.9) — aí ele sai da previsão e o lançamento correspondente entra como real.
- A previsão dos itens ainda não consolidados vale até o **fim do mês** de referência. Em meses já encerrados, um item não consolidado não soma nada (mas continua visível como não registrado — seção 3.9).

Em ambos os meios, a composição de despesas de cada mês degrada naturalmente com o tempo: **meses passados** nunca somam previsão; o **mês corrente** exibe uma composição de real e previsto; **meses futuros** são majoritariamente previstos, somados às parcelas já comprometidas.

### 3.6 Especificação — Projeção de 12 meses

- Tela dedicada, **separada da Visão mensal**, que consolida os **12 meses seguintes** a partir do mês atual (janela deslizante).
- Para cada mês projetado, exibe o consolidado de entradas, saídas, investimentos e disponível, calculado a partir de três fontes somadas:
  1. **Lançamentos reais** já existentes naquele mês de referência.
  2. **Compromissos já assumidos** — parcelas e ocorrências de recorrência que caem naquele mês.
  3. **Valores padrão**, aplicando a regra do teto descrita na seção 3.5.
- Cada card de mês resume **Entradas**, **Saídas** e **Investimentos** como ícone colorido + valor consolidado (sem rótulo em texto) e destaca o **Disponível** do mês — a Projeção é um resumo rápido de doze meses, não o lugar do detalhe. A distinção entre real e estimado, exigida na Visão mensal (3.1), **não aparece neste nível de resumo**; o grau de confiança de cada valor é visto ao entrar no mês (clique leva à Visão mensal, que mantém a distinção completa).
- A Visão mensal (3.1) **continua existindo e não é substituída** — permanece como o detalhe de um único mês.
- Ao lado do valor **Disponível** de cada mês, um rótulo discreto mostra **quanto ele representa das Entradas do mês**, colorido por faixa (M28). Ver especificação detalhada na seção 3.12 abaixo.
- Cada mês da lista funciona como **link** para a Visão mensal filtrada naquele mês/ano — a Projeção é um resumo de doze meses, o detalhe de cada um continua na Visão mensal.

### 3.7 Especificação — Simulação de compra

- Disponível **apenas** na tela de Projeção (3.6).
- O usuário informa: **cartão de crédito**, **data da compra**, **valor** e **quantidade de parcelas**. Não há campo de descrição.
- Aplica-se **somente a compras no crédito** — não há simulação de gasto no débito.
- Ao simular, os números dos 12 meses são recalculados como se a compra existisse, distribuindo as parcelas pelos meses de referência conforme as mesmas regras de fechamento de fatura e parcelamento já definidas (seções 3.1 e 3.2).
- A simulação é **efêmera**: não é persistida, não gera transações e é descartada ao sair da tela.
- O sistema **não emite veredito** ("pode comprar" / "não pode") nem aplica reserva mínima — apenas apresenta os números recalculados, deixando a conclusão com o usuário.

### 3.8 Especificação — Consolidação mensal de receita padrão

Resolve uma limitação da seção 3.5: como receita padrão é sempre o valor cheio em todo mês, não havia como representar um mês com renda **menor** que o padrão sem editar o item pra todos os meses (passados e futuros), e uma renda **maior** exigia calcular a diferença manualmente pra lançar como entrada real — pouco intuitivo.

- Cada item de **receita padrão** (não despesa) pode ser **consolidado** para um mês específico — um valor que substitui, só naquele mês, o valor genérico do item.
- A consolidação é **por item**, não pelo total agregado de receita padrão do mês — cada linha da lista de receitas padrão tem seu próprio ajuste, independente dos outros itens.
- Editada diretamente na **Visão mensal**, no bloco Entradas — não existe tela separada de gestão dessas exceções, e a lista de Valores padrão (seção 3.5) não é afetada nem exibe essas exceções.
- Uma vez consolidado, o valor substitui o valor genérico daquele item **só para aquele mês**; entradas reais lançadas no mês continuam somando por cima, sem mudança na regra da seção 3.5 (o problema da renda maior que o padrão, citado acima, **continua** exigindo lançar a diferença — fora do escopo desta consolidação).
- Vale tanto para **meses futuros** (planejamento) quanto para **meses já fechados** (correção retroativa) — mesmo mecanismo para os dois casos.
- Uma consolidação é **permanente até ser editada ou removida** — não expira quando o mês fecha (diferente da estimativa de despesa, seção 3.5).
- Remover uma consolidação faz o mês voltar a usar o valor genérico do item.

### 3.9 Especificação — Consolidação de despesa padrão no débito

Complementa a seção 3.5: além de prever o gasto, o usuário precisa **registrar que pagou** cada despesa padrão do débito e **acompanhar o que ainda falta pagar** no mês. Diferente da consolidação de receita (3.8), que só ajusta um valor, aqui a consolidação **gera um lançamento real**.

- Aplica-se **somente a despesas padrão no débito**. Despesas no crédito seguem o modelo de teto (3.5) e não são consolidáveis — a fatura já agrega os gastos do cartão.
- Consolidar um item significa: informar **valor, data, conta corrente e categoria**, e o sistema cria a **transação real** correspondente naquele mês. O item deixa de contar como previsão e passa a contar pelo lançamento.
- A **categoria vem pré-preenchida** a partir do item de despesa padrão, que passa a ter categoria própria (seção 3.5 — o item continua sem conta vinculada; a conta é escolhida na hora de consolidar).
- A data informada precisa cair **dentro do mês exibido** — é ela que determina em qual mês o lançamento entra.
- O usuário acompanha, no mesmo lugar, **quais itens já foram pagos e quais continuam pendentes** naquele mês.
- Um item consolidado pode ser **editado** (alterando o lançamento) ou ter o **lançamento apagado**, voltando a aparecer como pendente.
- **Consolidar com valor zero** é permitido e significa "neste mês não precisei pagar": o item conta como resolvido, mas **nenhum lançamento é criado**.
- Apagar o lançamento por qualquer caminho (inclusive pela tela de Transações) faz o item **voltar a pendente** automaticamente — não existe item marcado como pago sem o lançamento por trás.
- Em **meses já encerrados** os itens pendentes continuam visíveis, sinalizando um possível registro esquecido, mas **não somam** ao total do mês (coerente com 3.5).
- Apagar um item de despesa padrão **não apaga** os lançamentos já gerados por ele — o dinheiro foi gasto de fato; os lançamentos apenas deixam de estar vinculados ao item.

### 3.10 Especificação — Gestão de categorias (M25)

Resolve o item 4 revisado. Tela própria em `/categorias`, no mesmo agrupamento de navegação de Contas e Valores padrão.

- **Listagem** de todas as categorias, mostrando nome, cor e se está ativa. As inativas aparecem visualmente distintas, sem sumir da lista.
- **Criar** uma categoria exige nome e cor. O nome é único — duas categorias não podem ter o mesmo nome, para não gerar ambiguidade na hora de escolher.
- **Editar** permite trocar nome e cor. Renomear vale para todo o histórico, já que os lançamentos referenciam a categoria, não o texto.
- **Desativar / reativar** é a forma de aposentar uma categoria sem perder histórico:
  - uma categoria inativa **não é oferecida** ao lançar ou editar uma transação, nem ao definir um valor padrão;
  - os lançamentos que já a usam **continuam exibindo-a normalmente**, inclusive no filtro por categoria da tela de Transações — do contrário o histórico ficaria inconsultável;
  - a exceção é a transação que já está gravada com uma categoria inativa: ao editá-la, a categoria atual continua selecionável, para que salvar sem mexer na categoria não force uma troca.
- **Excluir** só é permitido quando a categoria **não tem nenhum uso** — nenhuma transação e nenhum valor padrão apontando para ela. Havendo uso, a exclusão é bloqueada com uma mensagem que explica o motivo e aponta o caminho: desativar.
- **Cor** vem de uma **paleta fixa** definida no tema, não de um seletor livre. Motivo: cores arbitrárias sobre o fundo escuro produzem combinações ilegíveis, e a paleta do app perderia coerência (ver Design §16 e §18.4).
- A cor é usada para **identificação visual rápida** nas listagens de transação — não carrega significado próprio (não indica receita/despesa nem gravidade).

### 3.11 Especificação — Estorno no crédito (M27)

Um **estorno** é dinheiro que volta para o cartão de crédito: devolução de produto, cancelamento de cobrança, crédito concedido pelo banco, cashback lançado na fatura. Antes desta especificação não havia como registrá-lo — a tela de lançamento forçava toda Entrada para o débito, e lançar a devolução como uma entrada em conta corrente inflava a renda do mês e deixava a fatura maior do que ela de fato era.

**O que é, no modelo de dados:** uma transação de tipo **Entrada** vinculada a uma **Conta do tipo Cartão de crédito**. Não há tipo novo, campo novo nem marcação secundária — a combinação Entrada + cartão *é* o estorno. Todo estorno tem descrição, categoria, valor e data como qualquer lançamento; o valor é informado **positivo**, e o sinal negativo é dado pelo tipo, exatamente como no resto da aplicação.

**Lançamento:**
- Na tela de Lançamento, escolher Tipo = Entrada passa a oferecer os dois Meios (Crédito e Débito), em vez de forçar Débito.
- Com Meio = Crédito, as contas oferecidas são os cartões de crédito.
- **Não existe estorno parcelado.** O controle de parcelas, hoje visível sempre que o Meio é Crédito, some quando o Tipo é Entrada.
- Nada na tela nomeia "estorno": a combinação já é autoexplicativa pra quem lança.

**Mês de referência:** o mesmo cálculo de qualquer lançamento no cartão (seção 3.1) — a partir da data do estorno e do dia de fechamento do cartão. Consequência aceita e desejada: um estorno registrado depois do fechamento entra na fatura **seguinte**, que é o comportamento real do banco.

**Efeito nos totais (Visão mensal e Projeção):**
- O estorno **não** entra em Entradas. Se entrasse ali *e* abatesse do crédito, o mesmo valor seria contado duas vezes e o Disponível do mês subiria pelo dobro do estorno.
- O estorno **abate das Saídas no crédito** do seu mês de referência, reduzindo o valor real do bloco.
- O estorno **não devolve teto** de despesa padrão no crédito (seção 3.5).
- Um estorno maior que os gastos do período é permitido: o total do bloco fica negativo e o Disponível do mês aumenta na mesma medida.

**Exibição na Visão mensal:**
- **Visão por dia:** o estorno subtrai do total do dia em que ocorreu, e aparece no detalhamento (popover/sheet) com sinal negativo e em verde.
- **Visão por cartão:** o estorno é listado junto ao cartão a que está vinculado, em ordem cronológica como os demais lançamentos, também com valor negativo e em verde; o total do cartão já vem líquido.
- **Sem tag própria** em nenhuma das duas visões — o valor negativo em verde já distingue o estorno de um gasto. (Em `/transacoes` a regra é outra, seção 3.3.)
- Agregados negativos seguem a regra da seção 3.1: sinal e cor verde em qualquer nível.

**Cancelamento de compra parcelada não é estorno.** Quando o parcelamento inteiro é cancelado, o caminho continua sendo apagar as parcelas ("apagar esta e as restantes", seção 3.2) — não lançar um estorno por cima. O estorno existe para a devolução em que a cobrança original permanece na fatura e o crédito entra ao lado dela.

**Estorno não é valor padrão.** Não há estorno recorrente nem item de estorno na lista de valores padrão (seção 3.5) — é sempre um lançamento pontual.

### 3.12 Especificação — Percentual do disponível na Projeção (M28)

Na tela de Projeção, o valor **Disponível** de cada mês é um número absoluto, e sozinho não diz se aquele mês é folgado ou apertado — R$ 3.000 de sobra significa coisas opostas para quem ganha R$ 6.000 e para quem ganha R$ 40.000. O rótulo traduz o valor em **proporção da renda daquele mês**.

- **O que é:** ao lado do valor Disponível, um texto menor e de menos destaque com o percentual que o Disponível representa das **Entradas** do mês.
- **Formato:** só o número e o símbolo — `31%`. Sem casas decimais (é um indicador de faixa, não uma medida precisa) e sem complemento textual, **em todos os viewports** (decisão do usuário sobre a alternativa "31% das entradas", comparada em mock).
- **Base do cálculo:** o **total de Entradas** do mês — o mesmo número já exibido no indicador de Entradas do card, incluindo a receita padrão. Entradas no crédito (estornos, §3.11) já não fazem parte desse total.
- **Escopo:** só a Projeção. A Visão mensal também tem um card Disponível, mas fica fora deste marco.

**Régua de cores** — um degradê do verde ao vermelho, em cinco faixas:

| Percentual | Tratamento |
|---|---|
| 40% ou mais | Verde, com destaque |
| 25% a 40% | Verde-lima, sem destaque |
| 10% a 25% | Amarelo |
| 5% a 10% | Vermelho |
| Abaixo de 5% | Vermelho, com destaque |

- Os limites são **inclusivos no piso**: exatamente 40% já é a primeira faixa, exatamente 25% é a segunda, e assim por diante.
- A faixa é decidida pelo **percentual já arredondado**, o mesmo que aparece na tela. Classificar pelo valor exato criaria contradição visível na fronteira: 39,65% é exibido como `40%`, e a régua diz que 40% é verde com destaque — pintar de verde-lima faria a cor desmentir o número. (Ajuste feito durante a implementação, ao ver o caso acontecer num mês real.)
- "Com destaque" nas duas pontas é **peso da fonte**, não um sexto tom — o degradê tem cinco cores, e as extremidades ganham reforço tipográfico.

**Casos de borda:**

- **Entradas iguais a zero:** o rótulo **não aparece**. Acontece de verdade — um mês sem receita padrão e sem entrada lançada — e a divisão não teria resultado definido. O valor Disponível continua exibido normalmente.
- **Disponível negativo:** o percentual é negativo e cai na última faixa (vermelho com destaque), sem tratamento especial. O valor em si segue a regra de cor que já existe.
- **Percentual acima de 100%:** possível quando as saídas do mês são negativas (mês dominado por estornos, §3.11). Entra na primeira faixa como qualquer valor acima de 40%.
- **Simulação ativa (§3.7):** o card mostra "antes → depois", e o percentual acompanha o **valor simulado** — o número que passa a valer. Não são exibidos dois percentuais.

### 3.13 Especificação — Detalhamento de investimentos (M29)

Hoje a conta de investimento tem só um nome, e o app sabe apenas **quanto foi aportado nela**. Não sabe se o dinheiro foi aplicado em alguma coisa, em quê, nem quanto ainda está parado. Esta seção cobre a **primeira fatia** do detalhamento — modelo, cadastro e as duas operações novas. **Rendimento não entra aqui**: enquanto vivo, um ativo vale o que custou. O cálculo por indexador vem nos marcos seguintes (M30 a M32).

#### 3.13.1 Modelo

Cada conta de investimento passa a ter **dois saldos**:

- **Saldo em conta** — dinheiro que chegou por aporte e ainda não foi aplicado. Não rende nada (decisão do usuário).
- **Saldo investido** — a soma das posições vivas naquela conta.

E quatro fluxos, dois deles novos:

| Fluxo | De → Para | Natureza |
|---|---|---|
| Aporte | Conta corrente → saldo em conta | Transação (já existe) |
| **Registro de ativo** | Saldo em conta → saldo investido | **Novo — não é transação** |
| **Liquidação do ativo** | Saldo investido → saldo em conta | **Novo — não é transação** |
| Resgate | Saldo em conta → conta corrente | Transação (existe; o vínculo com a conta volta nesta fatia) |
| **Movimento avulso** | Entra ou sai do saldo em conta | **Novo — não é transação** |

**Registro de ativo e liquidação não são transações** (decisão do usuário): são movimentos internos da corretora. Não aparecem em `/transacoes`, não têm categoria, e **não afetam Entradas, Saídas nem o Disponível de mês nenhum**. Só aporte e resgate cruzam a fronteira com a conta corrente, e esses já são transações.

**Integridade:** o registro de um ativo não pode exceder o saldo em conta daquela corretora, e um resgate também não. É a mesma classe de trava que já impede um aporte sem conta de destino.

#### 3.13.2 O ativo

Um ativo é uma posição de **renda fixa** dentro de uma conta de investimento, com:

| Campo | Regra |
|---|---|
| Conta | Uma conta de investimento existente |
| Mercado | Só **Renda fixa** nesta fase; o campo existe para abrir espaço depois |
| Estratégia | **Pós-fixado**, **Pré-fixado** ou **Inflação** |
| Produto | CDB, LCA, LCI ou Tesouro Direto |
| Emissor | Texto livre |
| Indexador | **Restrito pela estratégia:** pós-fixado oferece %CDI, %Selic, CDI+ e Selic+; pré-fixado, só % fixo a.a.; inflação, só IPCA+ |
| Taxa | O modificador do indexador. O significado muda com ele — em `%CDI`, "110" é *110% do CDI*; em `CDI+`, "2" é *2% a.a. acima do CDI* |
| Data de aquisição, Valor de aquisição, Vencimento | |

**Liquidação parcial está fora desta fatia** — nesta fatia, um ativo é liquidado inteiro. O **modelo**, porém, já a comporta: uma liquidação é um evento com data, valor recebido e **saldo remanescente**, e a liquidação total é simplesmente aquela em que o remanescente é zero.

O saldo remanescente não é enfeite: depois de um resgate parcial, `valor de aquisição × correção desde a aquisição` deixa de valer, porque a base encolheu e o trecho seguinte começa noutra data. Como o fator de correção é multiplicativo, quebrar o intervalo no dia do resgate é exato — a posição passa a valer *base nova × correção desde aquele evento*. Sem esse campo, o rendimento de uma posição parcialmente resgatada seria incalculável.

**Uma posição totalmente liquidada sai da listagem.** A tela mostra as posições vivas — o que ainda rende. O histórico de posições encerradas fica para depois (ver seção 7).

**Ativo vencido** (vencimento no passado, ainda não liquidado): **continua contando no saldo investido** pelo seu valor, e ganha destaque visual mais a ação de liquidar. A alternativa — tirá-lo do total no dia do vencimento — faria o patrimônio cair sozinho num dia em que nada aconteceu. Ele **para de render** a partir do vencimento, mas isso só passa a ter efeito quando o rendimento existir (M30+).

**Na liquidação o usuário informa o valor recebido.** É um dado conhecido — ele viu o número na corretora —, não uma estimativa. A partir do M30 esse campo vem pré-preenchido pelo cálculo, e continua editável.

#### 3.13.3 Movimentos avulsos da corretora

Nem todo dinheiro que entra ou sai do saldo em conta vem de aporte, resgate, registro de ativo ou liquidação. Com **Tesouro Direto** na lista de produtos, dois casos deixam de ser exóticos e viram rotina: o **cupom semestral** (Tesouro IPCA+ e Prefixado com juros) e a **taxa de custódia da B3**, cobrada semestralmente sobre posições acima de R$ 10 mil. Nos dois, o dinheiro se move **sem que nenhuma posição seja registrada ou liquidada**.

Sem uma forma de registrar isso, em até seis meses o saldo do app deixa de bater com o da corretora, e a única saída seria lançar um aporte falso para compensar — exatamente a gambiarra que corromperia a derivação em que o saldo se apoia.

Um **movimento avulso** tem:

| Campo | Regra |
|---|---|
| Conta | A conta de investimento afetada |
| **Natureza** | **Crédito** (entra) ou **Débito** (sai) — é ela que dá o sinal na soma |
| **Motivo** | Cupom, Taxa, Corretagem ou Ajuste — **restrito pela natureza**: cupom só existe como crédito; taxa e corretagem, só como débito; ajuste serve aos dois |
| Data | |
| Valor | Sempre positivo; o sinal vem da natureza, como em toda a aplicação |
| Descrição | Opcional |

**Natureza e motivo são campos separados**, e não um enum único combinando os dois: a natureza dá o sinal e o motivo descreve, então um motivo novo não multiplica as opções.

**O movimento é sempre da conta, nunca de uma posição.** Não há vínculo com um ativo específico — decisão do usuário: no M29 esse vínculo seria gravado e nunca lido, já que não existe rendimento nem relatório por ativo que o consumisse.

**Transferência entre corretoras não ganha operação própria** (decisão do usuário). Quem precisar registra **dois ajustes** — um débito numa conta, um crédito na outra —, sem amarração entre eles. O motivo `Ajuste` é, também, a válvula de escape para qualquer movimento que não previmos.

#### 3.13.4 A tela `/investimentos`

Título: **Investimentos**.

**Card de resumo**, no topo:
- **Desktop:** linha única — **Patrimônio** em destaque, separador de 1px, **Investido** e **Parado em conta**.
- **Mobile:** **sempre** em duas linhas — Patrimônio em destaque acima; Investido e Parado em conta abaixo. **O separador de 1px não existe no mobile.** A quebra é fixa, não depende do tamanho dos números.
- **Patrimônio** = investido + parado, somando todas as contas de investimento. **Não inclui conta corrente** — é o que está na corretora.

**Card "Disponível para investir"**, entre o resumo e o detalhamento: uma linha por conta de investimento, com o saldo parado e as ações **Registrar ativo** e **Resgatar**. Existe porque as duas ações são **por conta**, e no detalhamento a conta virou uma seção aninhada dentro do grupo — um botão de registro ali dentro sugeriria, erradamente, que o ativo herda a estratégia do grupo. O card também responde "de onde eu invisto" e "o que ainda não foi alocado" no mesmo lugar.

As duas ações frequentes de cada linha ficam visíveis; um **menu de mais ações** guarda o que é raro — é dele que sai **Registrar movimento**. A escolha do lugar tem motivo: esse card é o único que fala do caixa da corretora, e todo movimento avulso mexe nesse caixa. Como a conta já está escolhida na linha, o formulário nasce com um campo a menos.

**Detalhamento**, sob o título de seção **"Carteira"**, agrupado por **Estratégia** ou **Mercado**, à escolha do usuário. O título nomeia o bloco que começa ali — sem ele, o resumo, o card de disponível e o detalhamento ficam como três blocos visualmente equivalentes, sem hierarquia declarada. É **"Carteira"**, e não "Ativos", porque a seção termina no card "Disponível em conta", que não é ativo: "Carteira" cobre posição investida e dinheiro parado, que é exatamente o conjunto cujos percentuais fecham 100% do patrimônio. **Estratégia é o padrão** (por mercado, hoje, existe um card só). A estrutura é idêntica nas duas visões — só o critério de agrupamento muda.

Cada grupo é um **card recolhido**:
- À esquerda: **percentual de participação no patrimônio** e o nome do grupo.
- À direita: **valor bruto investido** no grupo.
- O percentual é sobre o **patrimônio**, não sobre o investido.
- **O dinheiro parado fecha a conta.** Depois de todos os grupos, quando houver saldo em conta, aparece um card **"Disponível em conta"** com o mesmo formato — percentual e nome à esquerda, valor à direita — mas **não expansível**: não tem posições dentro, então não tem o que abrir. Com ele, os cards somam **100% do patrimônio**, e a visão passa a ser uma alocação completa da carteira em vez de uma soma que não fecha.
- O card só existe quando há saldo parado. Zerado, ele não aparece.

Ao expandir, uma **seção por conta** que tenha posição naquele grupo:
- Título da seção: nome da conta e ícone à esquerda; à direita, o valor investido **daquela conta naquele grupo**.
- Tabela de posições: **Produto** (emissor em destaque, produto como subtítulo), **Vencimento**, **Taxa** e **Saldo bruto**.
- **Nesta fatia, saldo bruto = valor de aquisição.** No M30 a coluna passa a mostrar o valor corrigido.
- Uma posição vencida aparece destacada, com marcação "Vencido" e o botão **Liquidar** na própria linha.

#### 3.13.5 Operação de investimento não aceita data futura

**Investimento é registro do que aconteceu, não agendamento.** Aporte, resgate, registro de ativo, liquidação e movimento avulso passam a **recusar data futura**.

A regra nasce de um bug encontrado no uso: um aporte lançado para o dia seguinte já somava no saldo parado de hoje. Havia dois caminhos — filtrar o futuro na leitura, ou impedir que ele exista. **O segundo é mais simples e mais honesto:** a tela de Investimentos mostra "agora", e um lançamento com data futura é uma simulação, que não pertence a este contexto.

**As cinco operações, sem exceção.** Filtrar só uma parte seria pior que o bug: excluir um aporte futuro mas continuar debitando a compra de ativo feita com aquele dinheiro deixaria o saldo **negativo**.

**A tela de transações também fecha.** Editar a data de um aporte já existente para o futuro contornaria a regra, então `validarTransacao` passa a recusar data futura **quando `ehInvestimento` é verdadeiro**. Um lançamento comum continua aceitando data futura — a Projeção depende disso, e uma despesa agendada é legítima.

**Hoje conta.** O corte é o fim do dia corrente, não o instante atual: lançar algo com a data de hoje é o caso normal.

**Registros anteriores à regra não são alterados** (decisão do usuário). A validação vale para o que entra a partir daqui.

#### 3.13.6 Navegação

A área entra no grupo **Dados**, e os rótulos passam a **divergir por breakpoint**:

- **Desktop:** a barra lateral mantém a estrutura atual e ganha um sexto destino, **"Investimentos"**.
- **Mobile:** as abas do grupo Dados passam a ter **ícone + rótulo curto**. A aba nova chama-se **"Investir"**, e **"Visão mensal" passa a "Mês"** — com quatro abas dividindo a largura por igual, é o único outro rótulo que não cabe. "Transações" e "Projeção" continuam inteiros.

#### 3.13.7 Resgate volta a ter conta de origem

O resgate é uma entrada em conta corrente vinda de uma conta de investimento. A Task 86 removeu esse vínculo da tela de lançamento, e sem ele **nenhuma conta por conta fecha** — o saldo em conta ficaria sempre crescente. A tela de lançamento volta a pedir a conta de investimento de origem quando a entrada é um resgate.
### 3.14 Especificação — Movimentação de investimento concentrada em Investimentos (M34)

**A tela de Lançamento passa a ter uma responsabilidade declarada:** registrar dinheiro que **entra vindo de fora** e que **sai para fora** do conjunto de contas do app. Aporte e resgate não são nem uma coisa nem outra — o dinheiro apenas muda de conta dentro do próprio app —, então saem de lá e passam a ser lançados em `/investimentos`, junto das demais operações de investimento.

Isso desfaz duas decisões anteriores, conscientemente: o Tipo "Investimento" criado na Task 86 (M22) e o vínculo de resgate reaberto na Task 114 (M29). Nenhuma das duas estava errada quando foi tomada — o que mudou é a existência de `/investimentos`, que não havia.

#### 3.14.1 O que **não** muda: o modelo

Aporte e resgate continuam sendo `Transacao`, com `ehInvestimento` e a conta de investimento vinculada. **O Disponível continua subtraindo o aporte** e continua somando o resgate em Entradas.

Isso não é inércia: aporte e resgate passam no critério que separa transação de movimento interno (§3.13.1) — *isso muda quanto a família pode gastar neste mês?* Sim. Investir compromete dinheiro do mês. A mudança é de **onde se lança**, não de **o que se grava**, e nenhum número da Visão mensal ou da Projeção muda de valor.

A contradição de vocabulário — um aporte é gravado como `SAIDA` sem ser "saída para fora" — fica registrada e aceita. Modelá-lo como transferência de verdade seria mais correto, e mexeria em `comporMes`, na consolidação e na Projeção; é marco próprio, não parte deste.

#### 3.14.2 Categoria deixa de ser obrigatória

Aporte e resgate não têm categoria: investir não é uma despesa de consumo, e resgatar não é uma receita. Hoje o campo é obrigatório e vinha sendo preenchido com "Outros" por obrigação, não por significado.

`categoriaId` passa a ser **opcional** na transação. O efeito é só de escrita e exibição — **nenhum relatório muda**, porque todo agrupamento por categoria já exclui `ehInvestimento`. Um lançamento comum (entrada ou saída) continua **exigindo** categoria: a opcionalidade vale exclusivamente para aporte e resgate.

**As transações já existentes não são alteradas.** Os dois aportes atuais continuam em "Outros". Mexer em dado financeiro real para corrigir estética de histórico é risco sem retorno; a partir da mudança, os novos nascem sem categoria.

#### 3.14.3 As duas operações em Investimentos

**Aportar** e **Resgatar** nascem no card de contas de investimento. As duas cruzam a fronteira com a conta corrente — são as únicas de `/investimentos` que fazem isso — então pedem um campo que a tela não tinha: a **conta corrente** de origem (no aporte) ou de destino (no resgate). A conta de investimento vem da própria linha.

Travas, as mesmas que já valem para as demais operações da tela: um resgate não pode exceder o saldo em conta da corretora, e o aporte exige uma conta corrente escolhida.

#### 3.14.4 O card passa a se chamar "Contas de investimento"

Deixa de ser só "o que sobrou para investir" e passa a resumir a conta: **valor investido** e **parado em conta**, lado a lado, por linha.

Quatro ações por conta, com hierarquia por frequência:
- **Visíveis:** **Aportar** (primária) e **Registrar ativo** — as duas do dia a dia.
- **No menu de mais ações:** **Resgatar** e **Registrar movimento** — resgate acontece no vencimento ou numa necessidade; cupom e taxa, duas vezes por ano por posição. Precisam ser **acháveis**, não rápidas.

Assimetria aceita: Resgatar é o inverso de Aportar e não tem o mesmo peso visual. A frequência real justifica; quem procurar "o contrário de aportar" ao lado dele não vai achar.

#### 3.14.5 A porta lateral em Transações

O modal de edição de `/transacoes` tem hoje um checkbox "É investimento" que **converte uma saída comum em aporte** — uma terceira porta de criação para a mesma responsabilidade. O checkbox sai.

**Editar e apagar continuam em `/transacoes`**, inclusive para aporte e resgate: corrigir valor ou data de um lançamento é responsabilidade da tela de transações, não da de investimentos. O que deixa de existir é criar ou converter por lá. Consequência aceita: uma saída lançada por engano como comum não vira aporte por edição — apaga-se e lança-se de novo em `/investimentos`.

#### 3.14.6 O que fica no lugar em Lançamento

Nada. O toggle de Tipo volta a ter **dois** valores, Entrada e Saída, e some o checkbox de resgate. De brinde, resolve o aperto de largura no mobile que a Task 89 teve de consertar quando o terceiro Tipo entrou.

Sem ponteiro e sem atalho: usuário único, aprendizado de uma vez só, e um aviso de transição vira entulho em duas semanas.

### 3.15 Especificação — Parcelamento com controle fundido ao Valor (M35)

**Origem:** feedback de uso real — a esposa do usuário relatou que lançar uma saída parcelada no crédito é pouco intuitivo. O controle atual é um stepper `− 1x +` embutido dentro do campo Valor, criado na Task 85 (M22).

**Mock aprovado:** https://claude.ai/code/artifact/a2c1a106-f737-4d78-b041-dfd457e488fe — estados, medidas e regras. É a referência visual normativa deste marco.

#### 3.15.1 O que está errado hoje

Quatro problemas, encontrados na análise do código:

1. **O `1x` não anuncia nada.** Um número solto, em cinza, do tamanho de um ícone, encostado na borda do campo — lê-se como enfeite. Nada ali diz que dá para parcelar.
2. **O stepper não escala.** Chegar a 12x custa **onze toques**. Stepper serve para faixas de 1 a 5, não de 1 a 99.
3. **O campo muda de significado.** Em 1x o rótulo é "Valor"; a partir de 2x, "Valor da parcela".
4. **O controle disputa espaço com o número.** Sobreposto à direita do input, cuja reserva de `pr-24` é fixa enquanto o valor digitado cresce justamente naquela direção.

#### 3.15.2 A solução

**Controle e campo viram um retângulo só** — mesma altura, borda externa compartilhada, um fio de 1px separando as metades. O controle fica **à esquerda**, e a leitura da esquerda para a direita forma a frase: *12x · R$ 300,00*.

O botão é um **dropdown** cujo rótulo padrão é **"À vista"**. Esse rótulo é o centro da mudança: ele nomeia o estado na língua de quem compra e, por contraste, revela que existe a outra opção. **O botão nunca exibe `1x`** — é exatamente o rótulo que a mudança existe para eliminar.

A lista traz **À vista**, depois **2x a 12x**, depois **Outro…**, que abre um campo numérico livre no próprio menu para os casos raros (18x, 24x). Cada opção mostra **quanto a compra fica no total** naquele número de vezes, calculado a partir do valor já digitado — responde "em quantas eu ponho?" no instante da decisão.

#### 3.15.3 O que **não** muda

O rótulo continua alternando entre "Valor" e "Valor da parcela", e a **legenda com o total permanece abaixo do campo**, como já é hoje. O valor digitado segue sendo o **da parcela**.

Consequência aceita e consciente: quem conhece a compra pelo total ainda divide de cabeça antes de digitar. Inverter o campo para "Valor da compra" foi considerado e descartado — resolveria isso, mas obrigaria a decidir onde vai o centavo quando o total não divide exato (R$ 100 em 3x). Fica disponível como marco futuro se o atrito persistir.

O controle **só existe em Saída no crédito**, a mesma condição do stepper de hoje.

#### 3.15.4 O que fundir resolve de quebra

Duas coisas somem sem precisar de solução:

- **A reserva de padding calculada à mão.** O botão passa a ser irmão flex do campo: ocupa o que precisa, o campo fica com o resto. Nenhuma medida mágica atrelada ao rótulo mais largo.
- **A colisão com valores longos.** Sem sobreposição, o campo encolhe e o número continua legível, seja R$ 9 ou R$ 90.000.

> **Superado pelo M34 (§3.14).** O vínculo continua existindo, mas não na tela de lançamento: resgate passa a ser lançado em `/investimentos`. O problema que esta seção resolveu — o saldo em conta que só cresce — segue resolvido, por outra porta.

### Fora do escopo (fases futuras)
- Upload/importação de CSV de fatura de cartão de crédito (lançamento de saídas no crédito continua manual no MVP).
- Sugestão automática de categoria (regras ou IA).
- Controle de orçamento (limite por categoria).
- **Subcategorias** — a hierarquia de categorias tem um nível só (item 4, §3.10).
- **Ícone por categoria** — a identificação visual é feita só por nome e cor (§3.10).
- **Tipo atribuído à categoria** (marcar uma categoria como de receita ou de despesa, restringindo onde ela aparece) — qualquer categoria pode ser usada em qualquer lançamento.
- Entrada recorrente marcada como investimento (resgate recorrente) — só saída recorrente pode ser aporte.
- Recorrência "sem data de término" — a quantidade de meses é sempre definida pelo usuário no lançamento. (A necessidade de projetar valores indefinidamente é atendida pelos **valores padrão** da seção 3.5, que são um mecanismo distinto e não geram transações.)
- Veredito automático da simulação ("pode comprar" / "não pode") e reserva mínima configurável.
- Salvar e comparar múltiplos cenários de simulação.
- Simulação de compra à vista no débito — a simulação cobre apenas o crédito.
- Converter uma simulação em lançamento real.
- Vincular valores padrão a uma conta específica ou a uma categoria.
- Exceções mensais nos valores padrão **de despesa** (ex.: um teto diferente só em dezembro) — receita padrão ganhou esse mecanismo na seção 3.8 (a dor descrita ali é específica de receita, puramente aditiva; despesa já tem flexibilidade mês a mês via teto consumido pelo real).
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
- **Nome de exibição (M26):** a aplicação chama-se **"Pode Comprá?"**, com a forma abreviada **"Pó Comprá?"** para o rótulo sob o ícone na tela inicial (o iOS corta por volta de 12 caracteres; a abreviada tem 10 e cabe inteira, com a interrogação). O nome do repositório e do pacote **não** acompanham a mudança — renomear o repositório alteraria a URL do remote e a integração de deploy, risco desproporcional para um nome que ninguém vê.
- **Instalável como app (M26):** a aplicação pode ser adicionada à tela inicial do iPhone e, aberta dali, roda **sem a barra do navegador**, com ícone e nome próprios. Confirmado com o usuário que o uso é **só em iPhone**, por Safari e por Chrome (que no iOS roda sobre WebKit, então herda o mesmo comportamento).
  - **Sem funcionamento offline** — decisão explícita do usuário. Sem rede, a aplicação mostra o erro do navegador, como hoje. Motivo: guardar dado financeiro em cache no aparelho traz risco de exibir saldo desatualizado sem aviso e de deixar rastro no dispositivo, e o ganho não compensa para um app usado sempre com conexão.
  - **Sem notificações push** — não há caso de uso definido; a infraestrutura (chaves, inscrições, gatilho agendado) ficaria parada. Pode ser acrescentada depois sem refazer o que este marco entrega.
- **Tema visual:** a aplicação adota um **tema escuro único**, sem alternância claro/escuro e sem seguir a preferência do sistema. Todas as cores devem vir do sistema de tokens — incluindo as cores semânticas hoje cravadas na paleta clara (entradas, investimentos, saídas no débito, saídas no crédito e o destaque do seletor de período) — e o contraste de cada elemento sobre o novo fundo precisa ser revisado, não apenas herdado.
- **Segurança:** a aplicação hospeda dados financeiros reais de uma família numa URL pública. Portanto:
  - Nenhuma rota que crie usuários pode ser exposta (seção 2).
  - Toda Server Action verifica sessão antes de ler ou escrever.
  - Dependências com falhas conhecidas de severidade alta ou crítica são **avaliadas antes de publicar** — `npm audit` faz parte da revisão. "Tratar" nem sempre significa atualizar na hora: quando a única correção disponível exige um salto de major com esforço próprio (ex.: `next-auth` fixa só no Auth.js v5), a decisão consciente de adiar — registrada com o motivo em spec-02 §17.6 e o trabalho futuro em spec-01 §7 — conta como tratamento. O que não é aceitável é a falha ficar sem avaliação nenhuma.
  - Dados que dependem de regras de cálculo já aplicadas (ex.: `mesReferencia` derivado do fechamento do cartão) não podem ser invalidados por uma edição posterior da configuração que os originou.
  - Sessões têm duração limitada, proporcional ao risco de um token vazado.

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

- [ ] Não existe rota de cadastro público na aplicação — nem por navegação, nem por URL direta.
- [ ] O administrador consegue criar um usuário pela tela de gestão, e esse usuário consegue fazer login em seguida.
- [ ] O administrador consegue alterar o nome e a senha de um usuário existente.
- [ ] Um usuário comum que acesse a URL da tela de gestão diretamente é bloqueado, e uma chamada direta às ações de criar/editar usuário também é rejeitada.
- [ ] O administrador não consegue remover a própria condição de administrador nem alterar o próprio e-mail.
- [ ] Após um número definido de tentativas de login malsucedidas, novas tentativas são bloqueadas temporariamente.
- [ ] Após um login bem-sucedido, o usuário é redirecionado para a Visão mensal.
- [ ] Um usuário logado consegue lançar uma transação de entrada e uma de saída, com categoria e conta vinculada.
- [ ] Um usuário consegue cadastrar, editar e apagar contas dos três tipos (Conta corrente, Cartão de crédito, Conta de investimento), com os campos específicos de cada tipo.
- [ ] Ao lançar uma saída, o débito/crédito é deduzido automaticamente da conta escolhida (Conta corrente = débito, Cartão de crédito = crédito), sem exigir escolha manual separada.
- [ ] Um usuário consegue marcar uma saída como aporte (investimento), referenciando a conta de investimento de destino.
- [ ] Um usuário consegue marcar uma entrada como resgate (investimento), referenciando a conta de investimento de origem.
- [ ] Um usuário consegue editar e apagar qualquer transação, independente de quem a criou.
- [ ] Todos os usuários da família veem as mesmas transações e contas ao logar.
- [ ] A Visão mensal permite filtrar por mês/ano de referência.
- [ ] A Visão mensal exibe quatro blocos separados, nesta ordem: Entradas, Investimentos, Saídas no débito e Saídas no crédito.
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
- [ ] A Visão mensal mostra corretamente entradas, saídas e disponível do mês corrente.
- [ ] A tela de listagem em tabela exibe as colunas Data efetiva, Descrição, Categoria, Conta e Valor, com indicadores visuais compactos para tipo/parcela/recorrência/investimento.
- [ ] Clicar em qualquer linha da tabela abre um modal com o detalhe completo do registro (Tipo, Data do lançamento, Mês de referência, Parcela, Recorrência, É investimento, Conta de investimento) e as ações de editar/apagar.
- [ ] A tela permite buscar por descrição e filtrar por Conta, Categoria e Mês/Ano de referência.
- [ ] A navegação principal apresenta cinco áreas em dois grupos — Dados (Visão mensal, Transações, Projeção) e Ajustes (Contas, Valores padrão) — e uma ação global "+ Nova transação" acessível a partir de qualquer uma delas, abrindo o formulário completo sem etapas de pré-seleção.
- [ ] A criação de uma conta acontece direto a partir da seção do tipo desejado (Contas correntes, Cartões de crédito ou Contas de investimento), sem etapa separada de escolha de tipo.
- [ ] Um usuário logado consegue abrir o menu do usuário e fazer logoff, sendo redirecionado para a tela de login.
- [ ] O usuário consegue cadastrar, editar e apagar itens nas listas de receitas padrão e despesas padrão, informando descrição e valor.
- [ ] Um item de despesa padrão indica se é crédito ou débito; um item de receita padrão não pede essa informação.
- [ ] Valores padrão não aparecem na tela de Transações e não podem ser editados como lançamento.
- [ ] Uma receita padrão entra pelo valor cheio em todo mês exibido, sem ser consumida por lançamentos reais.
- [ ] Uma entrada real lançada num mês soma ao valor da receita padrão daquele mês, em vez de descontá-lo.
- [ ] Num mês futuro sem despesas reais, a projeção exibe a despesa padrão integral (crédito e débito).
- [ ] Num mês cuja fatura ainda está aberta, com gastos reais já lançados **no crédito**, a projeção exibe apenas a diferença entre a despesa padrão de crédito e o real já gasto.
- [ ] Quando o gasto real no crédito ultrapassa a despesa padrão de crédito, a projeção passa a exibir o valor real, sem somar a estimativa por cima.
- [ ] Ocorrências de recorrência de despesa **no crédito** consomem a despesa padrão de crédito; parcelas não a consomem e somam por cima.
- [ ] **No débito**, nenhum lançamento (avulso, recorrência ou parcela) consome a despesa padrão — os itens ainda não consolidados somam pelo valor cheio e os lançamentos somam por cima.
- [ ] Depois que a fatura mais tardia de um mês de referência fecha, a estimativa de crédito deixa de aparecer naquele mês.
- [ ] Num mês já encerrado, nenhuma estimativa é exibida — apenas lançamentos reais.
- [ ] A Visão mensal distingue visualmente a parcela estimada (despesa) da parcela real dos totais.
- [ ] Na Visão mensal, os itens de receita padrão aparecem antes dos lançamentos reais do bloco Entradas, um por item (rotulado pela própria descrição do item, não por um rótulo genérico "Receita padrão"), sem o estilo visual usado para estimativas de despesa, e sem divider entre os itens — só um divider separando o bloco de itens dos lançamentos reais.
- [ ] Cada item de receita padrão pode ser consolidado (ajustado) para o mês em exibição na Visão mensal, sem alterar o item na lista de Valores padrão nem os demais meses.
- [ ] Um item de receita padrão consolidado num mês mantém esse valor mesmo depois que o mês fecha, até ser editado ou removido — não expira sozinho.
- [ ] Remover a consolidação de um item num mês faz esse mês voltar a usar o valor genérico do item.
- [ ] Na Visão mensal, o bloco "Saídas no débito" lista as despesas padrão do débito no topo (antes dos lançamentos agrupados por dia), cada uma indicando se já foi paga ou está pendente.
- [ ] Consolidar uma despesa padrão do débito cria um lançamento real com o valor, a data, a conta corrente e a categoria informados — a categoria vem pré-preenchida a partir do item.
- [ ] Um lançamento gerado por consolidação não aparece no agrupamento por dia do bloco, apenas na linha do item (mas aparece normalmente na tela de Transações).
- [ ] Consolidar uma despesa padrão do débito com valor zero marca o item como resolvido sem criar lançamento algum.
- [ ] Editar um item já consolidado altera o lançamento vinculado; apagar o lançamento faz o item voltar a pendente.
- [ ] Apagar, na tela de Transações, um lançamento gerado por consolidação faz o item voltar a aparecer como pendente na Visão mensal.
- [ ] Num mês já encerrado, uma despesa padrão do débito não consolidada continua visível como não registrada, sem somar ao total do mês.
- [ ] Apagar um item de despesa padrão não apaga os lançamentos já gerados por ele.
- [ ] Despesas padrão no crédito não oferecem consolidação.
- [ ] Uma entrada real lançada num mês com item consolidado continua somando por cima do valor consolidado, sem descontá-lo.
- [ ] A tela de Projeção exibe os 12 meses seguintes ao mês atual; cada card resume Entradas, Saídas e Investimentos por ícone e valor consolidado, com o Disponível em destaque, rotulado "Disponível".
- [ ] No mobile, os três indicadores (Entradas, Saídas, Investimentos) do card de mês da Projeção cabem numa única linha, sem quebra, para valores de até 5 dígitos (R$ XX.XXX,XX); valores maiores podem cortar o texto.
- [ ] Os cards da Projeção não distinguem real de estimado (diferente da Visão mensal) — esse detalhe fica a um clique, na Visão mensal do mês.
- [ ] O gráfico de barras do Disponível, no topo da Projeção, mostra eixo Y e grade no desktop; no mobile, mostra só as barras (sem eixo Y). Em ambos, passar o mouse ou tocar numa barra mostra um tooltip com o valor do mês — a barra em si não navega para a Visão mensal.
- [ ] Meses recalculados pela simulação aparecem no gráfico com uma cor própria (nem a de positivo, nem a de negativo), e um indicador dessa cor só aparece quando há pelo menos um mês simulado — sem legenda permanente para positivo/negativo.
- [ ] Clicar num mês da lista da Projeção leva à Visão mensal filtrada naquele mês/ano.
- [ ] Na tela de Projeção, o usuário consegue simular uma compra informando cartão, data, valor e quantidade de parcelas, e vê os 12 meses recalculados.
- [ ] A simulação distribui as parcelas pelos meses de referência corretos, respeitando o dia de fechamento do cartão escolhido.
- [ ] A simulação não é persistida: ao sair e voltar à tela de Projeção, os números voltam ao estado sem simulação.
- [ ] A simulação não cria transações reais.
- [ ] No mobile, o menu inferior apresenta três alvos: grupo Dados, ação "Nova transação" ao centro e grupo Ajustes.
- [ ] Dentro do grupo Dados no mobile, alternar entre Visão mensal, Transações e Projeção custa um único toque.
- [ ] No desktop, a barra lateral exibe os cinco destinos, com os dois grupos separados por um divisor.
- [ ] A aplicação é exibida em tema escuro, com todos os elementos legíveis sobre o novo fundo.
- [ ] A aplicação está publicada e acessível via Vercel.

Estorno no crédito (M27, seção 3.11):

- [ ] Na tela de Lançamento, escolher Tipo = Entrada oferece os dois Meios (Crédito e Débito), e escolher Crédito oferece os cartões de crédito como Conta.
- [ ] Com Tipo = Entrada, o controle de quantidade de parcelas não aparece, mesmo com Meio = Crédito.
- [ ] Um estorno lançado num cartão cai no mês de referência calculado pelo dia de fechamento daquele cartão, igual a uma compra na mesma data.
- [ ] Um estorno **não** aparece no bloco Entradas da Visão mensal — nem como linha, nem somado ao total do bloco.
- [ ] Um estorno reduz o total do bloco Saídas no crédito do seu mês de referência, no valor exato do estorno.
- [ ] Um estorno **não** altera o valor "Estimado restante" do bloco Saídas no crédito: a estimativa continua calculada sobre o valor bruto dos gastos que consomem o teto.
- [ ] O Disponível do mês aumenta exatamente o valor do estorno — não o dobro.
- [ ] Na visão "Por dia", o estorno subtrai do total do dia, e aparece no popover/sheet daquele dia com sinal negativo e em verde.
- [ ] Um dia cujo total fique negativo exibe o total com sinal negativo e em verde, tanto na linha do dia quanto no total dentro do popover/sheet.
- [ ] Na visão "Por cartão", o estorno aparece listado sob o cartão vinculado, em ordem cronológica, com valor negativo e em verde, e o total do cartão já vem líquido.
- [ ] Um total de cartão, de bloco Saídas no crédito ou do card de resumo Saídas que fique negativo é exibido com sinal negativo e em verde.
- [ ] O card Disponível negativo continua na cor padrão, sem verde — é déficit, não crédito a favor.
- [ ] Em `/transacoes`, um estorno exibe um indicador próprio ao lado da descrição, distinguindo-o de uma entrada comum.
- [ ] A Projeção reflete o estorno no mês de referência correto, pelas mesmas regras da Visão mensal.

Percentual do disponível na Projeção (M28, seção 3.12):

- [ ] Cada card de mês da Projeção exibe, ao lado do Disponível, o percentual que ele representa das Entradas do mês, no formato `31%`.
- [ ] O rótulo tem menos destaque que o valor: fonte menor e cor da faixa.
- [ ] Um mês com 40% ou mais sai em verde com destaque; entre 25% e 40%, verde-lima; entre 10% e 25%, amarelo; entre 5% e 10%, vermelho; abaixo de 5%, vermelho com destaque.
- [ ] Exatamente 40%, 25%, 10% e 5% caem na faixa superior de cada limite.
- [ ] Um mês com Entradas zeradas não exibe o rótulo, e o valor Disponível continua visível.
- [ ] Um mês com Disponível negativo exibe percentual negativo, em vermelho com destaque.
- [ ] Com uma simulação ativa, o percentual corresponde ao valor simulado (o segundo número), e há apenas um percentual na linha.

Detalhamento de investimentos (M29, seção 3.13):

- [ ] No desktop, a barra lateral exibe seis destinos, com "Investimentos" no grupo Dados.
- [ ] No mobile, o grupo Dados exibe quatro abas com ícone e rótulo curto: "Mês", "Transações", "Projeção" e "Investir", sem transbordar a 390px.
- [ ] A tela `/investimentos` exibe Patrimônio, Investido e Parado em conta, somando todas as contas de investimento e sem incluir conta corrente.
- [ ] No desktop o resumo fica numa linha só, com separador de 1px; no mobile quebra sempre em duas linhas, sem separador.
- [ ] O card "Disponível para investir" lista uma linha por conta de investimento, com o saldo parado e as ações Registrar ativo e Resgatar.
- [ ] O detalhamento abre agrupado por Estratégia, e o usuário consegue alternar para Mercado.
- [ ] Cada grupo aparece recolhido, com o percentual sobre o patrimônio e o nome à esquerda e o valor bruto à direita.
- [ ] Havendo saldo parado, um card "Disponível em conta" aparece depois dos grupos, sem controle de expandir, e os percentuais de todos os cards somam 100%.
- [ ] Com saldo parado zerado, esse card não aparece.
- [ ] Ao expandir um grupo, aparece uma seção por conta com posição nele, com a tabela Produto / Vencimento / Taxa / Saldo bruto.
- [ ] Registrar um ativo debita o saldo em conta da corretora escolhida e credita o saldo investido, sem criar transação alguma.
- [ ] Uma compra maior que o saldo em conta é recusada.
- [ ] O indexador oferecido é restrito pela estratégia escolhida.
- [ ] Um ativo com vencimento no passado aparece destacado, com a ação Liquidar, e continua contando no saldo investido.
- [ ] Liquidar um ativo devolve o valor informado ao saldo em conta daquela corretora, e a posição sai do detalhamento.
- [ ] Nem o registro de ativo nem a liquidação aparecem em `/transacoes`, e nenhuma das duas altera Entradas, Saídas ou Disponível de qualquer mês.
- [ ] O menu de mais ações da linha de cada conta oferece "Registrar movimento".
- [ ] Um movimento de crédito aumenta o saldo em conta daquela corretora; um de débito diminui.
- [ ] O motivo oferecido é restrito pela natureza: cupom só aparece em crédito; taxa e corretagem, só em débito; ajuste nos dois.
- [ ] Um movimento não aparece em `/transacoes` e não altera Entradas, Saídas nem Disponível de nenhum mês.
- [ ] Um movimento de débito maior que o saldo em conta é recusado.
- [ ] Na tela de lançamento, uma entrada marcada como resgate volta a pedir a conta de investimento de origem.

## 7. Perguntas em aberto / decisões futuras

*(Decisões técnicas como o algoritmo de mapeamento compra→fatura, a representação de mês/ano de referência e o padrão de polimorfismo de Conta foram resolvidas na fase de Design — ver spec-02-design.md, seção 9.)*

- Se `Conta de investimento` vai precisar de atributos próprios (instituição, tipo de investimento, rendimento) em fases futuras — fora do MVP por ora.
- Formato exato do CSV de fatura de cartão (a definir quando essa fase for priorizada).
- Se e como implementar categorização automática (regras vs. IA) numa fase 2.
- Se o histórico de alterações (quem editou o quê) será necessário conforme o uso familiar evoluir.
- **Atualização do Next.js (14 → 15+)** — resolveria os avisos de segurança da própria maquinaria de RSC/Server Actions (spec-02 §17.6), incluindo um diretamente relevante para esta arquitetura ("Unauthenticated disclosure of internal Server Function endpoints"). Exige trabalho dedicado: no Next 15 `searchParams`/`params` viram assíncronos, o que quebra `visao-mensal/page.jsx`, e pede QA completo em todas as rotas — não é um `npm audit fix --force`.
- **Migração do NextAuth para Auth.js v5 (next-auth 4 → 5)** — resolveria as falhas do `@auth/core` (spec-02 §17.6). A versão em uso (4.24.15) é a última da série 4.x; não há patch mais novo na mesma major esperando. Também exige trabalho dedicado e QA completo do fluxo de autenticação.
- **Ver posições de investimento já encerradas (decidido em 2026-08-25, adiado).** No M29, uma posição totalmente liquidada desaparece da listagem de `/investimentos`, que mostra só o que ainda rende. Falta um caminho para consultar o que já foi encerrado — seja uma tela própria, seja um filtro na listagem atual. **Onde encaixa:** junto do **extrato por conta**, que também está fora das fatias atuais e é uma das quatro coisas que a área deveria responder (§3.13). Uma posição encerrada é histórico, e as duas coisas resolvem a mesma necessidade — construir as duas juntas evita desenhar navegação de histórico duas vezes. O dado necessário já fica gravado desde o M29: a posição e seus eventos de liquidação continuam no banco, com data, valor recebido e saldo remanescente.
- **Swipe de mês na Visão mensal com arrasto contínuo (em espera — analisado em 2026-08-25, adiado pelo usuário).** Hoje a troca de mês por swipe (§3.1) tem atraso perceptível, por **duas causas independentes**: (1) `useSwipeMes` lê só `touchstart` e `touchend`, então nada se move enquanto o dedo arrasta — o gesto é morto; (2) a troca de `searchParams` **não remonta a árvore** (só atualiza props), então o `loading.jsx` não entra e não há skeleton nem spinner: o conteúdo do mês anterior **fica congelado na tela** até o servidor responder. **Medição feita na ocasião:** os dados não são o gargalo — as 11 consultas da Visão mensal levam 2–9ms no Postgres local, e três meses em paralelo, 28ms, com 180 transações no banco. Três caminhos foram comparados: **(A)** `touchmove` arrastando o painel atual mais `router.prefetch` dos vizinhos — barato, mas ao soltar o painel sai e revela o vazio, podendo piorar a percepção; **(B)** carrossel de três painéis (anterior/atual/seguinte) com os dados vindos do servidor, swipe virando `translateX` puro e a navegação disparada **depois** da animação, escondendo o round trip; **(C)** carregar uma janela de 12 meses de uma vez e navegar 100% no cliente, como a Projeção já faz — inviável sem transformar a página numa casca, já que ela é um Server Component dirigido por `searchParams`. **Direção escolhida antes do adiamento: (B)**, com o estado de blocos expandidos **compartilhado entre os três painéis** (expandir Investimentos e arrastar mantém Investimentos aberto no mês seguinte — mais simples que estado por painel, e remove a verruga atual de o swipe recolher tudo) e o scroll pertencendo à página, não a cada painel, o que dá a posição vertical compartilhada de graça. Pontos técnicos levantados: `preventDefault` não funciona no `onTouchMove` do React (listeners passivos) — o caminho é `touch-action: pan-y`; trava de eixo nos primeiros ~10px; painéis de alturas diferentes exigem clampar (ou reancorar) o scroll ao fim da transição; o `router.refresh()` das consolidações passa a reidratar três painéis; e o swipe de voltar do iOS compete na borda esquerda.
- **Modificador de opacidade do Tailwind (`/NN`) não funciona nos tokens do tema** — `tailwind.config.js` mapeia cada cor direto para `var(--token)` (hex puro), formato que não suporta a sintaxe `<alpha-value>` que o Tailwind precisa pra gerar `hover:bg-primary/90` e afins. Descoberto ao investigar o hover do card em `/projecao` (spec-03, task de hover): a classe simplesmente não gera CSS nenhum. Afeta hoje `Button` (variantes `default`, `destructive`, `secondary`), o pill do seletor de período e o link "Nova transação" — nenhum desses muda de cor no hover, mesmo a classe estando presente no DOM. Correção de raiz exige converter as variáveis de `globals.css` de hex para canais RGB/HSL espaçados e ajustar `tailwind.config.js` pro padrão `rgb(var(--token) / <alpha-value>)`, revalidando contraste depois — não priorizado ainda.
