import {
  buscarEntradas,
  buscarSaidasDebito,
  buscarSaidasCredito,
  buscarInvestimentos,
} from "@/lib/consolidacao";
import { VisaoGeralClient } from "./visao-geral-client";

function mesAnoAtual() {
  const agora = new Date();
  return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
}

function somarBloco(grupos) {
  return grupos.reduce(
    (soma, grupo) => soma + grupo.transacoes.reduce((s, t) => s + Number(t.valor), 0),
    0
  );
}

function somarInvestimentos(investimentos) {
  return investimentos.reduce((soma, i) => soma + Number(i.total), 0);
}

export default async function VisaoGeralPage({ searchParams }) {
  const atual = mesAnoAtual();
  const mesParam = Number(searchParams?.mes);
  const anoParam = Number(searchParams?.ano);

  const mes = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : atual.mes;
  const ano = Number.isInteger(anoParam) && anoParam >= 2000 && anoParam <= 2100 ? anoParam : atual.ano;

  const [entradas, saidasDebito, saidasCredito, investimentos] = await Promise.all([
    buscarEntradas(mes, ano),
    buscarSaidasDebito(mes, ano),
    buscarSaidasCredito(mes, ano),
    buscarInvestimentos(mes, ano),
  ]);

  const totalEntradas = somarBloco(entradas);
  const totalSaidasDebito = somarBloco(saidasDebito);
  const totalSaidasCredito = somarBloco(saidasCredito);
  const totalSaidas = totalSaidasDebito + totalSaidasCredito;
  const totalInvestimentos = somarInvestimentos(investimentos);
  const disponivel = totalEntradas - totalSaidas;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Visão geral</h1>
      <VisaoGeralClient
        mes={mes}
        ano={ano}
        entradas={entradas}
        saidasDebito={saidasDebito}
        saidasCredito={saidasCredito}
        investimentos={investimentos}
        totalEntradas={totalEntradas}
        totalSaidas={totalSaidas}
        totalSaidasDebito={totalSaidasDebito}
        totalSaidasCredito={totalSaidasCredito}
        totalInvestimentos={totalInvestimentos}
        disponivel={disponivel}
      />
    </main>
  );
}
