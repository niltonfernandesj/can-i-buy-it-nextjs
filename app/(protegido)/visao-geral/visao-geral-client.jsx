"use client";

import { useRouter } from "next/navigation";
import { formatarReais } from "@/lib/moeda";
import { MESES } from "@/lib/datas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatarDia(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SeletorMesAno({ mes, ano }) {
  const router = useRouter();

  function irPara(novoMes, novoAno) {
    router.push(`/visao-geral?mes=${novoMes}&ano=${novoAno}`);
  }

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 3 + i);

  return (
    <div className="flex gap-4">
      <Select value={String(mes)} onValueChange={(v) => irPara(Number(v), ano)}>
        <SelectTrigger id="mes" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES.map((nome, i) => (
            <SelectItem key={nome} value={String(i + 1)}>
              {nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(ano)} onValueChange={(v) => irPara(mes, Number(v))}>
        <SelectTrigger id="ano" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Resumo({ totalEntradas, totalSaidas, saldo }) {
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
          <CardTitle className="text-sm font-normal text-muted-foreground">Saldo</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{formatarReais(saldo)}</CardContent>
      </Card>
    </div>
  );
}

function BlocoPorDia({ titulo, grupos, renderTag }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
      </CardContent>
    </Card>
  );
}

function TagResgate() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Resgate de investimento
    </span>
  );
}

function BlocoInvestimentos({ investimentos }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Investimentos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
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
      </CardContent>
    </Card>
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
  saldo,
}) {
  return (
    <div className="flex flex-col gap-6">
      <SeletorMesAno mes={mes} ano={ano} />

      <Resumo totalEntradas={totalEntradas} totalSaidas={totalSaidas} saldo={saldo} />

      <div className="grid gap-4 md:grid-cols-2">
        <BlocoPorDia
          titulo="Entradas"
          grupos={entradas}
          renderTag={(t) => (t.ehInvestimento ? <TagResgate /> : null)}
        />
        <BlocoPorDia titulo="Saídas no débito" grupos={saidasDebito} />
        <BlocoPorDia titulo="Saídas no crédito" grupos={saidasCredito} />
        <BlocoInvestimentos investimentos={investimentos} />
      </div>
    </div>
  );
}
