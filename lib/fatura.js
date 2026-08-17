/**
 * @param {Date} dataCompra
 * @param {number} diaFechamento
 * @param {number} diaVencimento
 */
export function calcularFatura(dataCompra, diaFechamento, diaVencimento) {
  const diaCompra = dataCompra.getDate();
  let mesFechamento = dataCompra.getMonth() + 1; // 1-12
  let anoFechamento = dataCompra.getFullYear();

  // 1. Em qual fatura (mês de fechamento) a compra entra?
  if (diaCompra > diaFechamento) {
    mesFechamento += 1;
    if (mesFechamento > 12) {
      mesFechamento = 1;
      anoFechamento += 1;
    }
  }
  // se diaCompra <= diaFechamento, a compra já entra na fatura que fecha no mês corrente

  // 2. O vencimento dessa fatura cai no mesmo mês do fechamento ou no seguinte?
  let mesReferencia = mesFechamento;
  let anoReferencia = anoFechamento;
  if (diaVencimento < diaFechamento) {
    // dia de vencimento "menor" só faz sentido cronologicamente no mês seguinte
    mesReferencia += 1;
    if (mesReferencia > 12) {
      mesReferencia = 1;
      anoReferencia += 1;
    }
  }

  return { mesFechamento, anoFechamento, mesReferencia, anoReferencia };
}
