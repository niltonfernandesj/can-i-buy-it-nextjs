import { createId as cuid } from "@paralleldrive/cuid2";
import { calcularFatura } from "@/lib/fatura";

export function ultimoDiaDoMes(ano, mes) {
  // dia 0 do mês seguinte = último dia do mês atual
  return new Date(ano, mes, 0).getDate();
}

export function dataAberturaProximaFatura(mesFechamento, anoFechamento, diaFechamento) {
  // Clampa o dia de fechamento ao último dia do mês (ex: "dia 31" em mês de 30 dias vira dia 30)
  const dia = Math.min(diaFechamento, ultimoDiaDoMes(anoFechamento, mesFechamento));
  const fechamento = new Date(anoFechamento, mesFechamento - 1, dia);

  const abertura = new Date(fechamento);
  abertura.setDate(abertura.getDate() + 1); // JS rola corretamente pro mês/ano seguinte quando necessário
  return abertura;
}

/**
 * @param {Date} dataCompra
 * @param {number} valorParcela
 * @param {number} n - quantidade de parcelas
 * @param {{ diaFechamento: number, diaVencimento: number }} cartao
 */
export function gerarParcelas(dataCompra, valorParcela, n, cartao) {
  const parcelamentoId = cuid();
  const parcelas = [];

  // Parcela 1: data efetiva = data da compra
  let { mesFechamento, anoFechamento, mesReferencia, anoReferencia } =
    calcularFatura(dataCompra, cartao.diaFechamento, cartao.diaVencimento);

  parcelas.push({
    numeroParcela: 1,
    totalParcelas: n,
    parcelamentoId,
    dataCompra,
    dataEfetiva: dataCompra,
    mesReferencia,
    anoReferencia,
    valor: valorParcela,
  });

  // Parcelas 2..N: data efetiva = abertura da fatura seguinte à fatura da parcela anterior
  for (let i = 2; i <= n; i++) {
    const dataEfetiva = dataAberturaProximaFatura(mesFechamento, anoFechamento, cartao.diaFechamento);

    // Reaplica o mesmo cálculo de fatura sobre a nova data efetiva — sem regra própria,
    // a data efetiva é que "direciona" a parcela para a fatura correta.
    ({ mesFechamento, anoFechamento, mesReferencia, anoReferencia } = calcularFatura(
      dataEfetiva,
      cartao.diaFechamento,
      cartao.diaVencimento
    ));

    parcelas.push({
      numeroParcela: i,
      totalParcelas: n,
      parcelamentoId,
      dataCompra,
      dataEfetiva,
      mesReferencia,
      anoReferencia,
      valor: valorParcela,
    });
  }

  return parcelas; // inserir todas em uma transaction do Prisma
}
