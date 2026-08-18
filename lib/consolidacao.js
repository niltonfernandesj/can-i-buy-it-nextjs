import { db } from "@/lib/db";

function agruparPorDia(transacoes) {
  const grupos = new Map();

  for (const transacao of transacoes) {
    const chave = transacao.dataCompra.toISOString().slice(0, 10);
    if (!grupos.has(chave)) {
      grupos.set(chave, { dia: transacao.dataCompra, transacoes: [] });
    }
    grupos.get(chave).transacoes.push(transacao);
  }

  return Array.from(grupos.values()).sort((a, b) => a.dia - b.dia);
}

/**
 * Bloco "Entradas": entradas regulares + resgates de investimento
 * (ehInvestimento indica quais são resgate, para a tag na UI).
 */
export async function buscarEntradas(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: { tipo: "ENTRADA", mesReferencia, anoReferencia },
    include: { conta: true, contaInvestimento: true },
    orderBy: { dataCompra: "asc" },
  });

  return agruparPorDia(transacoes);
}

/**
 * Bloco "Saídas no débito": saídas em conta corrente, exceto aportes
 * (aporte não é gasto).
 */
export async function buscarSaidasDebito(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: {
      tipo: "SAIDA",
      ehInvestimento: false,
      mesReferencia,
      anoReferencia,
      conta: { tipo: "CONTA_CORRENTE" },
    },
    include: { conta: true },
    orderBy: { dataCompra: "asc" },
  });

  return agruparPorDia(transacoes);
}

/**
 * Bloco "Saídas no crédito": saídas em cartão de crédito, agrupadas pelo dia
 * da compra original (não pela data efetiva/fatura).
 */
export async function buscarSaidasCredito(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: {
      tipo: "SAIDA",
      mesReferencia,
      anoReferencia,
      conta: { tipo: "CARTAO_CREDITO" },
    },
    include: { conta: true },
    orderBy: { dataCompra: "asc" },
  });

  return agruparPorDia(transacoes);
}

/**
 * Bloco "Investimentos": total bruto aportado no mês, separado por Conta de
 * investimento (resgates não entram aqui — aparecem no bloco Entradas).
 */
export async function buscarInvestimentos(mesReferencia, anoReferencia) {
  const grupos = await db.transacao.groupBy({
    by: ["contaInvestimentoId"],
    where: { tipo: "SAIDA", ehInvestimento: true, mesReferencia, anoReferencia },
    _sum: { valor: true },
  });

  const contaIds = grupos.map((g) => g.contaInvestimentoId).filter(Boolean);
  const contas = await db.conta.findMany({ where: { id: { in: contaIds } } });
  const nomePorId = Object.fromEntries(contas.map((c) => [c.id, c.nome]));

  return grupos.map((g) => ({
    contaInvestimentoId: g.contaInvestimentoId,
    contaInvestimentoNome: nomePorId[g.contaInvestimentoId] ?? "—",
    total: g._sum.valor,
  }));
}
