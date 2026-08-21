import {
  buscarEntradas,
  buscarSaidasDebito,
  buscarSaidasCredito,
  buscarInvestimentos,
} from "@/lib/consolidacao";
import { comporMes } from "@/lib/projecao";
import { db } from "@/lib/db";
import { VisaoGeralClient } from "./visao-geral-client";

function mesAnoAtual() {
  const agora = new Date();
  return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
}

function somarInvestimentos(investimentos) {
  return investimentos.reduce((soma, i) => soma + Number(i.total), 0);
}

// Decimal do Prisma não é serializável para um Client Component.
function paraNumero(grupos) {
  return grupos.map((grupo) => ({
    ...grupo,
    transacoes: grupo.transacoes.map((t) => ({ ...t, valor: Number(t.valor) })),
  }));
}

export default async function VisaoGeralPage({ searchParams }) {
  const atual = mesAnoAtual();
  const mesParam = Number(searchParams?.mes);
  const anoParam = Number(searchParams?.ano);

  const mes = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : atual.mes;
  const ano = Number.isInteger(anoParam) && anoParam >= 2000 && anoParam <= 2100 ? anoParam : atual.ano;

  const [entradas, saidasDebito, saidasCredito, investimentos, transacoesDoMes, valoresPadrao, cartoes] =
    await Promise.all([
      buscarEntradas(mes, ano),
      buscarSaidasDebito(mes, ano),
      buscarSaidasCredito(mes, ano),
      buscarInvestimentos(mes, ano),
      db.transacao.findMany({
        where: { mesReferencia: mes, anoReferencia: ano },
        include: { conta: true },
      }),
      db.valorPadrao.findMany(),
      db.conta.findMany({ where: { tipo: "CARTAO_CREDITO" } }),
    ]);

  // comporMes (lib/projecao.js) é a fonte de verdade para real + estimado —
  // as buscas acima continuam servindo só o detalhamento por dia dentro de
  // cada bloco (Design §13.3).
  const composicao = comporMes({
    mesReferencia: mes,
    anoReferencia: ano,
    transacoes: transacoesDoMes,
    valoresPadrao,
    cartoes,
    hoje: new Date(),
  });

  const totalInvestimentos = somarInvestimentos(investimentos);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Visão geral</h1>
      <VisaoGeralClient
        mes={mes}
        ano={ano}
        entradas={paraNumero(entradas)}
        saidasDebito={paraNumero(saidasDebito)}
        saidasCredito={paraNumero(saidasCredito)}
        investimentos={investimentos.map((i) => ({ ...i, total: Number(i.total) }))}
        composicaoEntradas={composicao.entradas}
        composicaoDebito={composicao.debito}
        composicaoCredito={composicao.credito}
        totalInvestimentos={totalInvestimentos}
        disponivel={composicao.disponivel}
      />
    </main>
  );
}
