"use client";

import { ArrowDownCircle, ArrowUpCircle, PiggyBank, CreditCard } from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeletorPeriodo } from "@/components/visao-geral/seletor-periodo";

function formatarDia(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Resumo({ totalEntradas, totalSaidas, disponivel }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">Entradas</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{formatarReais(totalEntradas)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">Saídas</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{formatarReais(totalSaidas)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">Disponível</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{formatarReais(disponivel)}</CardContent>
      </Card>
    </div>
  );
}

function CabecalhoBloco({ Icone, cor, titulo, total }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icone className={cn("h-4 w-4", cor)} />
        <h2 className="text-sm font-semibold uppercase tracking-wide">{titulo}</h2>
      </div>
      <span className="text-sm font-semibold">{formatarReais(total)}</span>
    </div>
  );
}

function BlocoPorDia({ titulo, Icone, cor, total, grupos, renderTag }) {
  return (
    <section className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0">
      <CabecalhoBloco Icone={Icone} cor={cor} titulo={titulo} total={total} />
      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.dia} className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">{formatarDia(grupo.dia)}</p>
            {grupo.transacoes.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {t.descricao}
                  {renderTag?.(t)}
                </span>
                <span>{formatarReais(t.valor)}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

function TagResgate() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Resgate de investimento
    </span>
  );
}

function BlocoInvestimentos({ Icone, cor, total, investimentos }) {
  return (
    <section className="flex flex-col gap-2 py-6 first:pt-0 last:pb-0">
      <CabecalhoBloco Icone={Icone} cor={cor} titulo="Investimentos" total={total} />
      {investimentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aporte no período.</p>
      ) : (
        investimentos.map((i) => (
          <div key={i.contaInvestimentoId} className="flex items-center justify-between text-sm">
            <span>{i.contaInvestimentoNome}</span>
            <span>{formatarReais(i.total)}</span>
          </div>
        ))
      )}
    </section>
  );
}

export function VisaoGeralClient({
  mes,
  ano,
  entradas,
  saidasDebito,
  saidasCredito,
  investimentos,
  totalEntradas,
  totalSaidas,
  totalSaidasDebito,
  totalSaidasCredito,
  totalInvestimentos,
  disponivel,
}) {
  return (
    <div className="flex flex-col gap-6">
      <SeletorPeriodo mes={mes} ano={ano} />

      <Resumo totalEntradas={totalEntradas} totalSaidas={totalSaidas} disponivel={disponivel} />

      <div className="flex flex-col divide-y divide-border">
        <BlocoPorDia
          titulo="Entradas"
          Icone={ArrowDownCircle}
          cor="text-emerald-600"
          total={totalEntradas}
          grupos={entradas}
          renderTag={(t) => (t.ehInvestimento ? <TagResgate /> : null)}
        />
        <BlocoInvestimentos
          Icone={PiggyBank}
          cor="text-blue-600"
          total={totalInvestimentos}
          investimentos={investimentos}
        />
        <BlocoPorDia
          titulo="Saídas no débito"
          Icone={ArrowUpCircle}
          cor="text-amber-600"
          total={totalSaidasDebito}
          grupos={saidasDebito}
        />
        <BlocoPorDia
          titulo="Saídas no crédito"
          Icone={CreditCard}
          cor="text-rose-600"
          total={totalSaidasCredito}
          grupos={saidasCredito}
        />
      </div>
    </div>
  );
}
