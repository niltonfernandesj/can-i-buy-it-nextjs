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
   - Contas são compartilhadas entre os membros da família, assim como as transações.
6. **Marcação de investimento (aporte/resgate)**
   - Uma transação pode ser marcada como **investimento**, indicando que representa um aporte ou resgate, e não um gasto/renda comum.
   - Aporte: saída vinculada à Conta corrente, marcada como investimento, referenciando a Conta de investimento de destino.
   - Resgate: entrada vinculada à Conta corrente, marcada como investimento, referenciando a Conta de investimento de origem.
7. **Dashboard / Tela de acompanhamento de gastos**
   - Resumo mensal (total de entradas, total de saídas, saldo).
   - Gráfico(s) de gastos por categoria e/ou evolução mensal.
   - Ver especificação detalhada na seção 3.1 abaixo.
8. **Parcelamento de compras no crédito**
   - Ao lançar uma saída no crédito, o usuário pode definir quantidade de parcelas e valor da parcela.
   - Ver especificação detalhada na seção 3.2 abaixo.
9. **Tela de listagem de transações (tabela)**
   - Visualização tabular de todas as transações lançadas, uma linha por registro.
   - Ver especificação detalhada na seção 3.3 abaixo.

### 3.1 Especificação — Tela de acompanhamento de gastos

- A tela deve permitir **filtrar por mês/ano de referência**.
- Os dados devem ser exibidos em **quatro blocos consolidados e separados**:
  1. **Entradas (receitas)** — inclui entradas regulares e resgates de investimento, rotulados de forma distinta (ex: tag "Resgate de investimento") para não se confundirem com renda regular.
  2. **Saídas no débito** — saídas vinculadas a Conta corrente, **exceto** as marcadas como investimento (aportes não contam como gasto).
  3. **Saídas no crédito** — saídas vinculadas a Cartão de crédito.
  4. **Investimentos** — total bruto aportado no mês, **separado por Conta de investimento** (não inclui resgates, que aparecem no bloco Entradas).
- Nos blocos 1, 2 e 3, as transações são **agrupadas e exibidas por dia** dentro do mês filtrado.
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
- Na tela de acompanhamento (3.1), cada parcela aparece no bloco "Saídas no crédito" do seu respectivo mês de referência, agrupada pelo **dia da compra original** (não pelo dia de abertura da fatura usado no cálculo).
- **Edição e exclusão de parcelas:**
  - Por padrão, editar ou apagar uma parcela afeta **apenas aquela parcela** isoladamente.
  - Tanto na edição quanto na exclusão, o usuário deve ter a opção adicional de propagar a ação para **todas as parcelas restantes** (as de data efetiva futura em relação à parcela selecionada) — ex: apagar as restantes ao cancelar uma compra, ou editar o valor das restantes se o valor da parcela mudou.

### 3.3 Especificação — Tela de listagem de transações (tabela)

- Exibe todas as transações lançadas, uma linha por registro, com as seguintes colunas:
  1. Conta (nome/apelido)
  2. Tipo (Entrada/Saída)
  3. Descrição
  4. Valor
  5. Categoria
  6. Data da compra
  7. Data efetiva
  8. Mês de referência (**por extenso**, ex: "Agosto de 2026")
  9. Parcela (formato "X de X", ex: "2 de 6"; vazio/traço quando não é uma compra parcelada)
  10. É investimento (Sim/Não)
  11. Conta de investimento vinculada (nome; vazio quando não se aplica)
- **Filtros:** a tela permite filtrar por **todas as colunas exibidas** (Conta, Tipo, Descrição, Valor, Categoria, Data da compra, Data efetiva, Mês de referência, Parcela, É investimento, Conta de investimento vinculada) — não apenas por mês/ano.
- **Assunções a validar:**
  - Ações de **editar e apagar** ficam disponíveis diretamente na tabela, reaproveitando as regras já definidas na seção 2.3 (edição/exclusão livre) e 3.2 (parcelas: apagar isolada vs. apagar as restantes).
  - Deve haver **paginação ou scroll** conforme o volume de dados crescer (detalhe de implementação, a definir no Design).

### Fora do escopo (fases futuras)
- Upload/importação de CSV de fatura de cartão de crédito (lançamento de saídas no crédito continua manual no MVP).
- Sugestão automática de categoria (regras ou IA).
- Controle de orçamento (limite por categoria).
- Transações recorrentes (assinaturas, salário fixo).
- Dados privados por usuário / permissões diferenciadas.
- Histórico de alterações (auditoria) em transações.
- Multi-moeda (assume-se BRL único).
- Limite de crédito, bandeira ou outras informações avançadas do cartão.
- Parcelas de valores diferentes entre si numa mesma compra parcelada (assume-se valor uniforme por parcela).

## 4. Requisitos não funcionais

- **Stack sugerida:** Next.js (full-stack) + banco de dados leve (SQLite via Prisma/Drizzle) + NextAuth (ou equivalente) para autenticação. A ser confirmado na fase de Design.
- **Hospedagem:** Vercel (plano hobby/gratuito).
- **Responsividade:** deve funcionar bem em desktop e mobile (uso familiar no dia a dia, provavelmente via celular).

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

## 6. Critérios de aceite (MVP)

- [ ] Um usuário consegue se cadastrar e fazer login.
- [ ] Um usuário logado consegue lançar uma transação de entrada e uma de saída, com categoria e conta vinculada.
- [ ] Um usuário consegue cadastrar, editar e apagar contas dos três tipos (Conta corrente, Cartão de crédito, Conta de investimento), com os campos específicos de cada tipo.
- [ ] Ao lançar uma saída, o débito/crédito é deduzido automaticamente da conta escolhida (Conta corrente = débito, Cartão de crédito = crédito), sem exigir escolha manual separada.
- [ ] Um usuário consegue marcar uma saída como aporte (investimento), referenciando a conta de investimento de destino.
- [ ] Um usuário consegue marcar uma entrada como resgate (investimento), referenciando a conta de investimento de origem.
- [ ] Um usuário consegue editar e apagar qualquer transação, independente de quem a criou.
- [ ] Todos os usuários da família veem as mesmas transações e contas ao logar.
- [ ] A tela de acompanhamento permite filtrar por mês/ano de referência.
- [ ] A tela de acompanhamento exibe quatro blocos separados: Entradas, Saídas no débito, Saídas no crédito e Investimentos.
- [ ] Um aporte não aparece no bloco "Saídas no débito", aparecendo apenas no bloco "Investimentos", separado por conta de investimento.
- [ ] Um resgate aparece no bloco "Entradas", rotulado distintamente de uma entrada regular.
- [ ] Uma saída no crédito lançada em um mês, mas cuja fatura vence no mês seguinte (por causa do dia de fechamento do cartão), aparece corretamente no bloco de crédito do mês de referência correto.
- [ ] Ao lançar uma saída no crédito com N parcelas e um valor de parcela, o sistema cria N transações, cada uma no mês de referência correto (parcela 1 na fatura da data da compra, parcelas seguintes em faturas consecutivas subsequentes).
- [ ] As N parcelas de uma compra parcelada aparecem, cada uma em seu respectivo mês de referência, agrupadas pelo dia da compra original.
- [ ] É possível apagar uma parcela isolada sem afetar as demais.
- [ ] É possível apagar uma parcela e, na mesma ação, optar por apagar também todas as parcelas restantes daquela compra.
- [ ] É possível editar uma parcela isolada sem afetar as demais.
- [ ] É possível editar uma parcela e, na mesma ação, optar por propagar a alteração para todas as parcelas restantes daquela compra.
- [ ] O dashboard mostra corretamente entradas, saídas e saldo do mês corrente.
- [ ] O dashboard mostra um gráfico de gastos por categoria.
- [ ] A tela de listagem em tabela exibe todas as colunas especificadas (Conta, Tipo, Descrição, Valor, Categoria, Data da compra, Data efetiva, Mês de referência por extenso, Parcela, É investimento, Conta de investimento vinculada), permite filtrar por qualquer uma delas, e permite editar/apagar cada registro.
- [ ] A aplicação está publicada e acessível via Vercel.

## 7. Perguntas em aberto / decisões futuras

*(Decisões técnicas como o algoritmo de mapeamento compra→fatura, a representação de mês/ano de referência e o padrão de polimorfismo de Conta foram resolvidas na fase de Design — ver spec-02-design.md, seção 9.)*

- Se `Conta de investimento` vai precisar de atributos próprios (instituição, tipo de investimento, rendimento) em fases futuras — fora do MVP por ora.
- Formato exato do CSV de fatura de cartão (a definir quando essa fase for priorizada).
- Se e como implementar categorização automática (regras vs. IA) numa fase 2.
- Se o histórico de alterações (quem editou o quê) será necessário conforme o uso familiar evoluir.
