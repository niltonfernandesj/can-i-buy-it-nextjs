"use client";

import { useState } from "react";
import { ChevronDown, PiggyBank } from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { formatarDataCurta } from "@/lib/datas";
import { agruparPor, percentualNoPatrimonio } from "@/lib/investimentos";
import { ROTULO_ESTRATEGIA, ROTULO_PRODUTO, rotuloIndexador } from "@/lib/ativos";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const VISOES = [
  { valor: "estrategia", rotulo: "Por estratégia" },
  { valor: "mercado", rotulo: "Por mercado" },
];

const ROTULO_MERCADO = { RENDA_FIXA: "Renda fixa" };

// Alternância construída à mão, como em Saídas no crédito (Design §8.3.16) —
// sem puxar @radix-ui/react-tabs para uma escolha binária sempre visível.
function ToggleVisao({ visao, onMudar }) {
  return (
    <div className="flex gap-5 border-b" role="tablist">
      {VISOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          role="tab"
          aria-selected={visao === opcao.valor}
          onClick={() => onMudar(opcao.valor)}
          className={cn(
            "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
            visao === opcao.valor
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function Percentual({ valor }) {
  if (valor === null) return null;
  return (
    <span className="min-w-[3.1rem] text-sm font-semibold tabular-nums text-investimento">
      {valor.toFixed(1).replace(".", ",")}%
    </span>
  );
}

// Uma posição vencida é a que passou do vencimento e ainda não foi liquidada.
// Comparação por DIA, não por instante: um título que vence hoje só conta como
// vencido amanhã (Design §20.3).
function estaVencido(ativo, hoje) {
  const venc = new Date(ativo.vencimento);
  const soData = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return soData(venc) < soData(hoje);
}

function TabelaPosicoes({ ativos, hoje }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 text-left font-medium">Produto</th>
            <th className="pb-2 text-left font-medium">Vencimento</th>
            <th className="pb-2 text-left font-medium">Taxa</th>
            <th className="pb-2 text-right font-medium">Saldo bruto</th>
          </tr>
        </thead>
        <tbody>
          {ativos.map((ativo) => {
            const vencido = estaVencido(ativo, hoje);
            return (
              <tr key={ativo.id} className={cn("border-t", vencido && "bg-destructive/10")}>
                <td className="py-2 pr-3">
                  <span className="font-medium">{ativo.emissor}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROTULO_PRODUTO[ativo.produto]}
                  </span>
                </td>
                <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">
                  <span className={cn(vencido && "font-semibold text-saida-credito")}>
                    {formatarDataCurta(ativo.vencimento)}
                  </span>
                  {vencido && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-saida-credito/15 px-1.5 py-0.5 text-[11px] font-semibold text-saida-credito">
                      Vencido
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-investimento">
                  {rotuloIndexador(ativo.indexador, ativo.taxa)}
                </td>
                <td className="py-2 text-right tabular-nums">{formatarReais(ativo.base)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CardGrupo({ grupo, rotulo, patrimonio, hoje }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        aria-expanded={expandido}
        className="flex w-full items-center justify-between gap-4 p-4 px-5 text-left"
      >
        <span className="flex min-w-0 items-baseline gap-2.5">
          <Percentual valor={percentualNoPatrimonio(grupo.total, patrimonio)} />
          <span className="truncate font-semibold">{rotulo}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="font-semibold tabular-nums">{formatarReais(grupo.total)}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandido && "rotate-180",
            )}
          />
        </span>
      </button>

      {expandido && (
        <div className="flex flex-col gap-5 px-5 pb-5">
          {grupo.contas.map((conta, i) => (
            <div key={conta.contaId} className={cn(i > 0 && "border-t border-dashed pt-4")}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PiggyBank className="h-[0.9rem] w-[0.9rem] shrink-0 text-investimento" />
                  {conta.nome}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatarReais(conta.total)}
                </span>
              </div>
              <TabelaPosicoes ativos={conta.ativos} hoje={hoje} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Exceção ao padrão: não é um <button> e não tem ChevronDown, porque não há
// posições dentro para abrir. A ausência do chevron é o que comunica isso, sem
// precisar de rótulo explicando (Design §20.3). É este card que faz os
// percentuais fecharem 100% do patrimônio.
function CardParado({ total, patrimonio }) {
  return (
    <Card className="flex items-center justify-between gap-4 p-4 px-5">
      <span className="flex min-w-0 items-baseline gap-2.5">
        <Percentual valor={percentualNoPatrimonio(total, patrimonio)} />
        <span className="truncate font-semibold text-muted-foreground">Disponível em conta</span>
      </span>
      <span className="font-semibold tabular-nums text-entrada">{formatarReais(total)}</span>
    </Card>
  );
}

export function DetalhamentoInvestimentos({ ativos, patrimonio, parado }) {
  const [visao, setVisao] = useState("estrategia");

  const grupos = agruparPor(ativos, visao);
  const rotulos = visao === "estrategia" ? ROTULO_ESTRATEGIA : ROTULO_MERCADO;
  const hoje = new Date();

  return (
    <div className="flex flex-col gap-4">
      <ToggleVisao visao={visao} onMudar={setVisao} />

      {grupos.length === 0 && parado <= 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhuma posição ainda. Compre um ativo para começar a acompanhar.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <CardGrupo
              key={grupo.chave}
              grupo={grupo}
              rotulo={rotulos[grupo.chave] ?? grupo.chave}
              patrimonio={patrimonio}
              hoje={hoje}
            />
          ))}
          {parado > 0 && <CardParado total={parado} patrimonio={patrimonio} />}
        </div>
      )}
    </div>
  );
}
