import { db } from "@/lib/db";

function agruparPorDia(transacoes) {
  const grupos = new Map();

  for (const transacao of transacoes) {
    const chave = transacao.dataCompra.toISOString().slice(0, 10);
    if (!grupos.has(chave)) {
      // Reconstrói o dia exibido a partir da própria chave (estável), em vez
      // de reaproveitar a data bruta da transação que criou o grupo — uma
      // transação gravada antes da Task 74 carrega meia-noite UTC literal em
      // vez de meia-noite local, e exibida no fuso de São Paulo volta um dia,
      // arrastando o cabeçalho do grupo inteiro (Task 81).
      const [ano, mes, dia] = chave.split("-").map(Number);
      grupos.set(chave, { dia: new Date(ano, mes - 1, dia), transacoes: [] });
    }
    grupos.get(chave).transacoes.push(transacao);
  }

  return Array.from(grupos.values()).sort((a, b) => a.dia - b.dia);
}

/**
 * Bloco "Entradas": entradas regulares + resgates de investimento
 * (ehInvestimento indica quais são resgate, para a tag na UI).
 *
 * Só entradas no débito (spec-01 §3.1 revisado): uma entrada num cartão é um
 * estorno (§3.11) e pertence ao bloco de crédito. Sem o filtro por tipo de
 * conta ela apareceria nos dois lugares.
 */
export async function buscarEntradas(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: {
      tipo: "ENTRADA",
      mesReferencia,
      anoReferencia,
      conta: { tipo: "CONTA_CORRENTE" },
    },
    include: { conta: true, contaInvestimento: true },
    orderBy: { dataCompra: "asc" },
  });

  return agruparPorDia(transacoes);
}

/**
 * Bloco "Saídas no débito": saídas em conta corrente, exceto aportes (aporte
 * não é gasto) e exceto lançamentos gerados por consolidação de despesa
 * padrão (Design §13.6) — esses aparecem na checklist de despesas padrão,
 * não no agrupamento por dia. `/transacoes` não aplica esse filtro.
 */
export async function buscarSaidasDebito(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: {
      tipo: "SAIDA",
      ehInvestimento: false,
      mesReferencia,
      anoReferencia,
      conta: { tipo: "CONTA_CORRENTE" },
      consolidacaoDespesa: null,
    },
    include: { conta: true, categoria: true },
    orderBy: { dataCompra: "asc" },
  });

  return agruparPorDia(transacoes);
}

/**
 * Bloco "Saídas no crédito": movimentações em cartão de crédito, agrupadas
 * pelo dia da compra original (não pela data efetiva/fatura).
 *
 * Sem filtro por `tipo` (spec-01 §3.11): o bloco traz saídas e estornos, e o
 * sinal de cada linha é resolvido na exibição por `valorComSinal`
 * (lib/estorno.js) — uma ENTRADA aqui é um estorno e entra negativa.
 */
export async function buscarSaidasCredito(mesReferencia, anoReferencia) {
  const transacoes = await db.transacao.findMany({
    where: {
      mesReferencia,
      anoReferencia,
      conta: { tipo: "CARTAO_CREDITO" },
    },
    include: { conta: true, categoria: true },
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
    where: {
      tipo: "SAIDA",
      ehInvestimento: true,
      mesReferencia,
      anoReferencia,
    },
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
