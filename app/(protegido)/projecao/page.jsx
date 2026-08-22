import { db } from "@/lib/db";
import { comporMes } from "@/lib/projecao";
import { ProjecaoClient } from "./projecao-client";

// A janela desliza com "hoje" (mês atual em diante), não com searchParams —
// sem isso o Next prerenderiza no build e a projeção congela na data da
// publicação (Design §14.1, mesma armadilha do Full Route Cache já vista
// no bug da conta nova em /lancamento).
export const dynamic = "force-dynamic";

const MESES_NA_JANELA = 12;

function janela12Meses(hoje) {
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  return Array.from({ length: MESES_NA_JANELA }, (_, i) => {
    const total = mesAtual - 1 + i;
    return { mesReferencia: (total % 12) + 1, anoReferencia: anoAtual + Math.floor(total / 12) };
  });
}

export default async function ProjecaoPage() {
  const hoje = new Date();
  const pares = janela12Meses(hoje);

  const janelaOr = pares.map(({ mesReferencia, anoReferencia }) => ({ mesReferencia, anoReferencia }));

  const [transacoes, valoresPadrao, consolidacoesReceita, consolidacoesDespesa, cartoes] =
    await Promise.all([
      db.transacao.findMany({ where: { OR: janelaOr }, include: { conta: true } }),
      db.valorPadrao.findMany(),
      db.consolidacaoReceitaPadrao.findMany({ where: { OR: janelaOr } }),
      db.consolidacaoDespesaPadrao.findMany({ where: { OR: janelaOr } }),
      db.conta.findMany({ where: { tipo: "CARTAO_CREDITO" } }),
    ]);

  const meses = pares.map(({ mesReferencia, anoReferencia }) =>
    comporMes({
      mesReferencia,
      anoReferencia,
      transacoes,
      valoresPadrao,
      consolidacoesReceita,
      consolidacoesDespesa,
      cartoes,
      hoje,
    })
  );

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Projeção</h1>
      {/* Conta não tem campo Decimal — cartoes vai direto ao cliente, sem conversão.
          Alimenta o formulário de simulação da Task 63. */}
      <ProjecaoClient meses={meses} cartoes={cartoes} />
    </main>
  );
}
