"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { formatarReais } from "@/lib/moeda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Cor sequencial (hue único, "magnitude por categoria") — ver skill de dataviz.
const COR_BARRA = "#2a78d6";

function formatarDia(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SeletorMesAno({ mes, ano }) {
  const router = useRouter();

  function irPara(novoMes, novoAno) {
    router.push(`/acompanhamento?mes=${novoMes}&ano=${novoAno}`);
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

function GraficoGastosPorCategoria({ dados }) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum gasto no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 24, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis
          dataKey="categoriaLabel"
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#898781", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatarReais(v)}
          width={90}
        />
        <Tooltip
          cursor={{ fill: "rgba(42,120,214,0.08)" }}
          formatter={(value) => formatarReais(value)}
          labelStyle={{ color: "#0b0b0b" }}
          contentStyle={{ borderRadius: 8, borderColor: "#e1e0d9" }}
        />
        <Bar dataKey="total" fill={COR_BARRA} radius={[4, 4, 0, 0]} maxBarSize={24}>
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v) => formatarReais(v)}
            style={{ fill: "#52514e", fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AcompanhamentoClient({
  mes,
  ano,
  entradas,
  saidasDebito,
  saidasCredito,
  investimentos,
  totalEntradas,
  totalSaidas,
  saldo,
  gastosPorCategoria,
}) {
  return (
    <div className="flex flex-col gap-6">
      <SeletorMesAno mes={mes} ano={ano} />

      <Resumo totalEntradas={totalEntradas} totalSaidas={totalSaidas} saldo={saldo} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoGastosPorCategoria dados={gastosPorCategoria} />
        </CardContent>
      </Card>

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
