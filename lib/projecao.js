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

function somar(itens) {
  return itens.reduce((total, item) => total + Number(item.valor), 0);
}

/**
 * Compõe os totais de um mês a partir das três fontes: lançamentos reais,
 * compromissos já assumidos (parcelas/ocorrências) e valores padrão
 * (Design §13.3). Serve tanto a Visão mensal (um mês) quanto a Projeção
 * (doze meses) — não há duas implementações da regra.
 */
export function comporMes({
  mesReferencia,
  anoReferencia,
  transacoes,
  valoresPadrao,
  consolidacoes = [],
  cartoes,
  hoje,
}) {
  const doMes = transacoes.filter(
    (t) => t.mesReferencia === mesReferencia && t.anoReferencia === anoReferencia
  );
  const ehParcela = (t) => t.parcelamentoId !== null;

  // --- Entradas: real + receita padrão, por item (consolidação do mês
  // substitui o valor genérico quando existir — spec-01 §3.8) ---
  const entradaReal = somar(doMes.filter((t) => t.tipo === "ENTRADA"));
  const consolidacoesDoMes = consolidacoes.filter(
    (c) => c.mesReferencia === mesReferencia && c.anoReferencia === anoReferencia
  );
  const entradaPadrao = valoresPadrao
    .filter((v) => v.tipo === "ENTRADA")
    .reduce((soma, item) => {
      const consolidacao = consolidacoesDoMes.find((c) => c.valorPadraoId === item.id);
      return soma + Number(consolidacao ? consolidacao.valor : item.valor);
    }, 0);

  // --- Saídas: teto por meio, consumido pelo real ---
  function comporSaidas(meio) {
    const tipoConta = meio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE";
    const doMeio = doMes.filter(
      (t) => t.tipo === "SAIDA" && !t.ehInvestimento && t.conta.tipo === tipoConta
    );

    const parcelas = somar(doMeio.filter(ehParcela)); // somam por cima
    const consumidor = somar(doMeio.filter((t) => !ehParcela(t))); // avulsos + recorrências

    const teto = somar(valoresPadrao.filter((v) => v.tipo === "SAIDA" && v.meio === meio));
    const aindaEstimavel =
      meio === "CREDITO"
        ? creditoAindaEstimavel(mesReferencia, anoReferencia, cartoes, hoje)
        : debitoAindaEstimavel(mesReferencia, anoReferencia, hoje);

    const estimado = aindaEstimavel ? Math.max(0, teto - consumidor) : 0;

    return { real: parcelas + consumidor, estimado, total: parcelas + consumidor + estimado };
  }

  const credito = comporSaidas("CREDITO");
  const debito = comporSaidas("DEBITO");
  const investimentos = somar(doMes.filter((t) => t.tipo === "SAIDA" && t.ehInvestimento));

  return {
    mesReferencia,
    anoReferencia,
    entradas: { real: entradaReal, estimado: entradaPadrao, total: entradaReal + entradaPadrao },
    credito,
    debito,
    investimentos,
    disponivel: entradaReal + entradaPadrao - credito.total - debito.total - investimentos,
  };
}
