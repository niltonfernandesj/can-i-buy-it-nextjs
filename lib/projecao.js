import { ultimoDiaDoMes } from "@/lib/parcelamento";

/**
 * Data/hora em que a fatura de um mês de referência fecha para um cartão.
 * Inversa de calcularFatura (lib/fatura.js): lá, a data da compra leva ao mês
 * de referência; aqui, o mês de referência leva à data de fechamento.
 */
export function dataFechamentoDaReferencia(mesReferencia, anoReferencia, cartao) {
  let mesFech = mesReferencia;
  let anoFech = anoReferencia;

  // calcularFatura empurra a referência para o mês seguinte quando o
  // vencimento é "menor" que o fechamento — aqui desfazemos esse passo.
  if (cartao.diaVencimento < cartao.diaFechamento) {
    mesFech -= 1;
    if (mesFech < 1) {
      mesFech = 12;
      anoFech -= 1;
    }
  }

  const dia = Math.min(cartao.diaFechamento, ultimoDiaDoMes(anoFech, mesFech));
  return new Date(anoFech, mesFech - 1, dia, 23, 59, 59, 999);
}

/** A estimativa de crédito ainda vale? Vale enquanto ao menos um cartão não fechou. */
export function creditoAindaEstimavel(mesReferencia, anoReferencia, cartoes, hoje) {
  if (cartoes.length === 0) return false; // sem cartão cadastrado não há gasto no crédito
  return cartoes.some((c) => hoje <= dataFechamentoDaReferencia(mesReferencia, anoReferencia, c));
}

/** A estimativa de débito ainda vale? Vale até o fim do mês de referência. */
export function debitoAindaEstimavel(mesReferencia, anoReferencia, hoje) {
  const ultimoInstante = new Date(anoReferencia, mesReferencia, 0, 23, 59, 59, 999);
  return hoje <= ultimoInstante;
}
