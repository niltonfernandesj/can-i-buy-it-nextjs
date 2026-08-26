import { PiggyBank } from "lucide-react";
import { db } from "@/lib/db";
import { formatarReais } from "@/lib/moeda";
import { saldoEmConta, saldoInvestido, apenasVivas, baseAtual } from "@/lib/investimentos";
import { DetalhamentoInvestimentos } from "./investimentos-client";
import { RegistrarAtivo } from "./registrar-ativo";
import { RegistrarMovimento } from "./registrar-movimento";
import { MovimentarConta } from "./movimentar-conta";
import { DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Aportes e resgates crescem com o histórico de transações, então são somados
// no Postgres — uma linha por conta, não o histórico trazido pro JS (Design
// §20.2). Os ativos vêm inteiros porque a listagem precisa deles de qualquer
// forma, e o saldo em conta depende de cada evento de liquidação.
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
  }));

  const porConta = contas.map((conta) => {
    const ativosDaConta = ativos.filter((a) => a.contaId === conta.id);
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
function DisponivelParaInvestir({ contas, contasCorrentes }) {
  return (
    <Card className="p-6">
      <Rotulo>Disponível para investir</Rotulo>
      <div className="mt-3 flex flex-col">
        {contas.map((conta) => (
          <div
            key={conta.id}
            className="flex flex-col gap-2 border-t border-dashed py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <PiggyBank className="h-4 w-4 shrink-0 text-investimento" />
              {conta.nome}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums text-entrada">
                {formatarReais(conta.emConta)}
              </span>
              <MovimentarConta operacao="aporte" conta={conta} contasCorrentes={contasCorrentes}>
                <DialogTrigger asChild>
                  <Button size="sm">Aportar</Button>
                </DialogTrigger>
              </MovimentarConta>
              <RegistrarAtivo conta={conta} />
              {/* Inerte ainda — resgate chega na Task 119. */}
              <Button size="sm" variant="outline" disabled>
                Resgatar
              </Button>
              <RegistrarMovimento conta={conta} />
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
          <DisponivelParaInvestir contas={contas} contasCorrentes={contasCorrentes} />
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
