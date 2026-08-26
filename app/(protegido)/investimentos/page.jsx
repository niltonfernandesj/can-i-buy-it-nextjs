import { PiggyBank } from "lucide-react";
import { db } from "@/lib/db";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { saldoEmConta, saldoInvestido, apenasVivas, baseAtual } from "@/lib/investimentos";
import { SERIE_DO_INDEXADOR, valorCorrigido } from "@/lib/rendimento";
import { sincronizarSerie } from "@/lib/actions/investimentos";
import { hojeISO, paraDiaISO } from "@/lib/datas";
import { DetalhamentoInvestimentos } from "./investimentos-client";
import { RegistrarAtivo } from "./registrar-ativo";
import { MenuDaConta } from "./menu-da-conta";
import { MovimentarConta } from "./movimentar-conta";
import { DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Aportes e resgates crescem com o histórico de transações, então são somados
// no Postgres — uma linha por conta, não o histórico trazido pro JS (Design
// §20.2). Os ativos vêm inteiros porque a listagem precisa deles de qualquer
// forma, e o saldo em conta depende de cada evento de liquidação.
/**
 * Valor corrigido de cada posição viva, por id (Requisitos §3.16).
 *
 * Sincroniza só as séries que as posições de fato usam, e uma vez cada — a
 * busca é por série, não por ativo: dez CDBs em %CDI leem a mesma série 12.
 *
 * A janela vai da aquisição mais antiga até hoje. Posições sem série
 * (pré-fixado, IPCA+) ficam de fora do mapa e seguem valendo a base.
 */
async function corrigirPosicoes(vivas) {
  const seriesNecessarias = [
    ...new Set(vivas.map((a) => SERIE_DO_INDEXADOR[a.indexador]).filter(Boolean)),
  ];
  if (seriesNecessarias.length === 0) return new Map();

  const desdeQuando = vivas
    .map((a) => paraDiaISO(a.dataAquisicao))
    .reduce((menor, dia) => (dia < menor ? dia : menor));

  const taxasPorSerie = new Map(
    await Promise.all(
      seriesNecessarias.map(async (serie) => [
        serie,
        await sincronizarSerie(serie, desdeQuando, hojeISO()),
      ]),
    ),
  );

  return new Map(
    vivas
      .map((ativo) => {
        const serie = SERIE_DO_INDEXADOR[ativo.indexador];
        if (!serie) return null;
        return [
          ativo.id,
          valorCorrigido(
            {
              base: baseAtual(ativo),
              indexador: ativo.indexador,
              taxa: Number(ativo.taxa),
              dataAquisicao: paraDiaISO(ativo.dataAquisicao),
              vencimento: paraDiaISO(ativo.vencimento),
            },
            taxasPorSerie.get(serie),
          ),
        ];
      })
      .filter(Boolean),
  );
}

async function carregar() {
  const [contas, contasCorrentes, ativos, aportes, resgates, movimentos] = await Promise.all([
    db.conta.findMany({ where: { tipo: "CONTA_INVESTIMENTO" }, orderBy: { nome: "asc" } }),
    // Aportar e resgatar precisam da origem/destino — a única informação de
    // fora do mundo de investimento que esta tela carrega (Design §21.3).
    db.conta.findMany({ where: { tipo: "CONTA_CORRENTE" }, orderBy: { nome: "asc" } }),
    db.ativo.findMany({ include: { conta: true, liquidacoes: true } }),
    db.transacao.groupBy({
      by: ["contaInvestimentoId"],
      where: { ehInvestimento: true, tipo: "SAIDA" },
      _sum: { valor: true },
    }),
    db.transacao.groupBy({
      by: ["contaInvestimentoId"],
      where: { ehInvestimento: true, tipo: "ENTRADA" },
      _sum: { valor: true },
    }),
    db.movimentoInvestimento.groupBy({ by: ["contaId", "natureza"], _sum: { valor: true } }),
  ]);

  const somaPorConta = (grupos, campo) =>
    Object.fromEntries(grupos.map((g) => [g[campo], Number(g._sum.valor ?? 0)]));

  const aportePorConta = somaPorConta(aportes, "contaInvestimentoId");
  const resgatePorConta = somaPorConta(resgates, "contaInvestimentoId");
  const creditoPorConta = somaPorConta(
    movimentos.filter((m) => m.natureza === "CREDITO"),
    "contaId",
  );
  const debitoPorConta = somaPorConta(
    movimentos.filter((m) => m.natureza === "DEBITO"),
    "contaId",
  );

  const correcao = await corrigirPosicoes(apenasVivas(ativos));

  // Decimal do Prisma não é serializável cruzando Server → Client Component,
  // e `base` já vem calculada pra o cliente não repetir a regra.
  const ativosParaCliente = apenasVivas(ativos).map((ativo) => ({
    id: ativo.id,
    contaId: ativo.contaId,
    conta: { id: ativo.conta.id, nome: ativo.conta.nome },
    mercado: ativo.mercado,
    estrategia: ativo.estrategia,
    produto: ativo.produto,
    emissor: ativo.emissor,
    indexador: ativo.indexador,
    taxa: Number(ativo.taxa),
    dataAquisicao: ativo.dataAquisicao,
    vencimento: ativo.vencimento,
    valorAquisicao: Number(ativo.valorAquisicao),
    base: baseAtual(ativo),
    // Ausente em pré-fixado e IPCA+, que seguem valendo a base (M31).
    valor: correcao.get(ativo.id),
  }));

  const porConta = contas.map((conta) => {
    const ativosDaConta = ativos
      .filter((a) => a.contaId === conta.id)
      .map((a) => ({ ...a, valor: correcao.get(a.id) }));
    return {
      id: conta.id,
      nome: conta.nome,
      emConta: saldoEmConta({
        aportes: aportePorConta[conta.id] ?? 0,
        resgates: resgatePorConta[conta.id] ?? 0,
        creditos: creditoPorConta[conta.id] ?? 0,
        debitos: debitoPorConta[conta.id] ?? 0,
        ativos: ativosDaConta,
      }),
      investido: saldoInvestido(ativosDaConta),
    };
  });

  return { contas: porConta, contasCorrentes, ativos: ativosParaCliente };
}

function Rotulo({ children }) {
  return (
    <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
      {children}
    </p>
  );
}

// Linha única com divisor no desktop; sempre duas linhas, sem divisor, no
// mobile (Requisitos §3.13.4). A quebra é por classe, não por medição — o
// requisito é "sempre", independente do tamanho dos números.
function Resumo({ patrimonio, investido, emConta }) {
  return (
    <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:gap-8">
      <div>
        <Rotulo>Patrimônio</Rotulo>
        <p className="text-2xl font-semibold tabular-nums md:text-[1.75rem]">
          {formatarReais(patrimonio)}
        </p>
      </div>

      <div className="hidden w-px self-stretch bg-border md:block" aria-hidden="true" />

      <div className="flex gap-8">
        <div>
          <Rotulo>Investido</Rotulo>
          <p className="font-medium tabular-nums text-muted-foreground">{formatarReais(investido)}</p>
        </div>
        <div>
          <Rotulo>Parado em conta</Rotulo>
          <p className="font-medium tabular-nums text-entrada">{formatarReais(emConta)}</p>
        </div>
      </div>
    </Card>
  );
}

// Registrar e resgatar são ações POR CONTA, enquanto o detalhamento agrupa
// por estratégia — um botão de registro dentro de um grupo sugeriria que o
// ativo herda aquela estratégia (Requisitos §3.13.4). Este card também
// responde "de onde eu invisto" e "o que ainda não foi alocado" no mesmo lugar.
/** Um dos dois saldos da linha: rótulo curto acima, valor abaixo. */
function SaldoDaConta({ rotulo, rotuloCurto, valor, cor }) {
  return (
    <span className="flex flex-col gap-0.5 sm:items-end">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {/* "Parado em conta" só onde cabe; abaixo de sm, a forma curta. */}
        <span className="hidden sm:inline">{rotulo}</span>
        <span className="sm:hidden">{rotuloCurto ?? rotulo}</span>
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", cor)}>{formatarReais(valor)}</span>
    </span>
  );
}

function ContasDeInvestimento({ contas, contasCorrentes }) {
  return (
    <Card className="p-6">
      <Rotulo>Contas de investimento</Rotulo>
      <div className="mt-3 flex flex-col">
        {contas.map((conta) => (
          <div
            key={conta.id}
            className="flex flex-col gap-3 border-t border-dashed py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <PiggyBank className="h-4 w-4 shrink-0 text-investimento" />
              <span className="truncate">{conta.nome}</span>
            </span>

            {/* No mobile os dois saldos dividem a linha; no desktop encostam
                nas ações, à direita. */}
            <span className="flex justify-between gap-6 sm:ml-auto">
              <SaldoDaConta rotulo="Investido" valor={conta.investido} cor="text-investimento" />
              <SaldoDaConta
                rotulo="Parado em conta"
                rotuloCurto="Parado"
                valor={conta.emConta}
                cor="text-entrada"
              />
            </span>

            {/* Aportar e Registrar ativo são o dia a dia; o menu guarda o raro
                (Requisitos §3.14.4). */}
            <span className="flex items-center gap-2">
              <MovimentarConta operacao="aporte" conta={conta} contasCorrentes={contasCorrentes}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1 sm:flex-none">
                    Aportar
                  </Button>
                </DialogTrigger>
              </MovimentarConta>
              <RegistrarAtivo conta={conta} className="flex-1 sm:flex-none" />
              <MenuDaConta conta={conta} contasCorrentes={contasCorrentes} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function InvestimentosPage() {
  const { contas, contasCorrentes, ativos } = await carregar();

  const investido = contas.reduce((soma, c) => soma + c.investido, 0);
  const emConta = contas.reduce((soma, c) => soma + c.emConta, 0);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Investimentos</h1>

      {contas.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhuma conta de investimento cadastrada. Crie uma em Contas para começar.
        </Card>
      ) : (
        <>
          {/* Patrimônio é o que está na corretora: investido + parado. Não
              inclui conta corrente (Requisitos §3.13.4). */}
          <Resumo patrimonio={investido + emConta} investido={investido} emConta={emConta} />
          <ContasDeInvestimento contas={contas} contasCorrentes={contasCorrentes} />
          <DetalhamentoInvestimentos
            ativos={ativos}
            patrimonio={investido + emConta}
            parado={emConta}
          />
        </>
      )}
    </main>
  );
}
