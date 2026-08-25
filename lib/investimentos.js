/**
 * Saldos e agrupamento da área de investimentos (Requisitos §3.13, Design §20.2).
 *
 * Módulo puro, sem `import { db }` — é consumido por Client Component, e puxar
 * o Prisma junto arrastaria o cliente do banco pro bundle do navegador (mesma
 * razão de `lib/estorno.js`).
 *
 * Nenhum saldo é coluna no banco: os dois são derivados dos movimentos. O
 * porquê está no Design §20.2 — resumidamente, um saldo materializado vira
 * segunda fonte de verdade, e este app edita e apaga transações livremente.
 */

/**
 * Filtro Prisma para posições que ainda rendem.
 *
 * Mora aqui, e não solto em cada query, pra a definição de "viva" existir num
 * lugar só. Uma posição está viva enquanto nenhum evento de liquidação zerou
 * o remanescente — `none` cobre também o caso de não haver evento algum.
 */
export const SOMENTE_VIVOS = { liquidacoes: { none: { valorRemanescente: 0 } } };

/**
 * O evento de liquidação mais recente de uma posição, ou null.
 *
 * Ordena por data em vez de confiar na ordem do array: a página pode incluir
 * só o último (`take: 1`) ou todos, e a função funciona nos dois casos.
 */
function ultimaLiquidacao(ativo) {
  const eventos = ativo.liquidacoes ?? [];
  if (eventos.length === 0) return null;

  return [...eventos].sort((a, b) => new Date(b.data) - new Date(a.data))[0];
}

/**
 * Quanto da posição ainda rende — o remanescente do último evento, ou o valor
 * de aquisição quando não houve nenhum.
 *
 * O caso sem evento cai na mesma fórmula, com a compra fazendo o papel de
 * "último evento": não são dois caminhos de código.
 */
export function baseAtual(ativo) {
  const evento = ultimaLiquidacao(ativo);
  return Number(evento ? evento.valorRemanescente : ativo.valorAquisicao);
}

/**
 * A posição ainda rende?
 *
 * O que a encerra é o remanescente ter chegado a zero — **não** o vencimento
 * ter passado. Um título vencido e não liquidado continua contando no saldo
 * investido (Requisitos §3.13.2): tirá-lo no dia do vencimento faria o
 * patrimônio cair sozinho num dia em que nada aconteceu.
 */
export function estaViva(ativo) {
  return baseAtual(ativo) > 0;
}

/** Só as posições que ainda rendem. */
export function apenasVivas(ativos) {
  return ativos.filter(estaViva);
}

/** Soma da base atual das posições vivas de uma conta. */
export function saldoInvestido(ativos) {
  return apenasVivas(ativos).reduce((soma, ativo) => soma + baseAtual(ativo), 0);
}

function somar(itens, campo) {
  return itens.reduce((soma, item) => soma + Number(item[campo]), 0);
}

/**
 * Dinheiro parado na corretora, disponível para investir.
 *
 * `ativos` deve trazer **todas** as posições da conta, não só as vivas — ver
 * a sutileza da compra, abaixo. Os demais argumentos são somas já agregadas
 * no Postgres (Design §20.2): aportes e resgates crescem com o histórico de
 * transações, então não faz sentido trazê-los linha a linha.
 */
export function saldoEmConta({ aportes = 0, resgates = 0, creditos = 0, debitos = 0, ativos = [] }) {
  // A compra debita PARA SEMPRE: o somatório percorre inclusive as posições
  // já liquidadas. O dinheiro saiu do caixa no dia da compra e voltou pelos
  // eventos de liquidação, possivelmente com valor diferente. Somar só as
  // vivas faria o caixa reaparecer sozinho no dia em que um ativo vence.
  const compras = somar(ativos, "valorAquisicao");

  const recebidoEmLiquidacoes = ativos
    .flatMap((ativo) => ativo.liquidacoes ?? [])
    .reduce((soma, evento) => soma + Number(evento.valorRecebido), 0);

  return (
    Number(aportes) - Number(resgates) - compras + recebidoEmLiquidacoes + Number(creditos) - Number(debitos)
  );
}

/**
 * Percentual de um valor sobre o patrimônio.
 *
 * Devolve null quando não há base de cálculo — mesma convenção de
 * `percentualDoDisponivel` (lib/disponivel.js): zero é um percentual legítimo
 * e confundir os dois esconderia a diferença entre "não tenho nada" e "não
 * aloquei nada".
 */
export function percentualNoPatrimonio(valor, patrimonio) {
  if (!(patrimonio > 0)) return null;
  return (Number(valor) / Number(patrimonio)) * 100;
}

/**
 * Agrupa as posições vivas por `estrategia` ou `mercado`, e dentro de cada
 * grupo, por conta (Requisitos §3.13.4).
 *
 * Uma função só para as duas visões, com a chave como parâmetro — a estrutura
 * é idêntica, só o critério muda.
 *
 * Grupos em ordem decrescente de valor (o maior primeiro, que é o que a
 * conferência de carteira olha), contas dentro de cada grupo por nome.
 */
export function agruparPor(ativos, chave) {
  const grupos = new Map();

  for (const ativo of apenasVivas(ativos)) {
    const nomeGrupo = ativo[chave];
    if (!grupos.has(nomeGrupo)) {
      grupos.set(nomeGrupo, { chave: nomeGrupo, total: 0, contas: new Map() });
    }
    const grupo = grupos.get(nomeGrupo);
    const base = baseAtual(ativo);
    grupo.total += base;

    const contaId = ativo.conta?.id ?? ativo.contaId;
    if (!grupo.contas.has(contaId)) {
      grupo.contas.set(contaId, { contaId, nome: ativo.conta?.nome ?? "—", total: 0, ativos: [] });
    }
    const conta = grupo.contas.get(contaId);
    conta.total += base;
    conta.ativos.push(ativo);
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      contas: Array.from(grupo.contas.values())
        .map((conta) => ({
          ...conta,
          ativos: [...conta.ativos].sort(
            (a, b) => new Date(a.dataAquisicao) - new Date(b.dataAquisicao),
          ),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .sort((a, b) => b.total - a.total);
}
