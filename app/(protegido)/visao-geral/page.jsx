import {
  buscarEntradas,
  buscarSaidasDebito,
  buscarSaidasCredito,
  buscarInvestimentos,
} from "@/lib/consolidacao";
import { CATEGORIA_LABELS } from "@/lib/categorias";
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

function calcularGastosPorCategoria(...blocos) {
  const totais = new Map();

  for (const grupo of blocos.flat()) {
    for (const transacao of grupo.transacoes) {
      const atual = totais.get(transacao.categoria) ?? 0;
      totais.set(transacao.categoria, atual + Number(transacao.valor));
    }
  }

  return Array.from(totais.entries())
    .map(([categoria, total]) => ({
      categoria,
      categoriaLabel: CATEGORIA_LABELS[categoria] ?? categoria,
      total,
    }))
    .sort((a, b) => b.total - a.total);
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
  const totalSaidas = somarBloco(saidasDebito) + somarBloco(saidasCredito);
  const saldo = totalEntradas - totalSaidas;
  const gastosPorCategoria = calcularGastosPorCategoria(saidasDebito, saidasCredito);

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
        saldo={saldo}
        gastosPorCategoria={gastosPorCategoria}
      />
    </main>
  );
}
