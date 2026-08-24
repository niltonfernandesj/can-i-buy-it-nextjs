/**
 * Estorno no crédito (spec-01 §3.11, Design §8.3.17).
 *
 * Módulo sem `import { db }` de propósito — diferente de `lib/consolidacao.js`,
 * ele é importado por Client Components (a Visão mensal e a tabela de
 * transações), e puxar o Prisma junto arrastaria o cliente do banco pro bundle
 * do navegador.
 */

/** Estorno: entrada lançada num cartão de crédito. */
export function ehEstorno(transacao) {
  return transacao.tipo === "ENTRADA" && transacao.conta?.tipo === "CARTAO_CREDITO";
}

/**
 * Valor da transação com o sinal que ela tem dentro do bloco em que aparece.
 *
 * Só estorno é negativo: uma entrada em conta corrente (bloco Entradas) e
 * qualquer saída seguem positivas, então a função é segura de usar nos três
 * blocos agrupados por dia, sem o chamador precisar saber qual bloco é.
 */
export function valorComSinal(transacao) {
  return ehEstorno(transacao) ? -Number(transacao.valor) : Number(transacao.valor);
}
