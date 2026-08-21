"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarReais } from "@/lib/moeda";
import { MESES } from "@/lib/datas";
import { gerarParcelas } from "@/lib/parcelamento";
import { cn } from "@/lib/utils";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BREAKPOINT_MD_PX = 768;

// Detecção reativa de breakpoint em runtime — Recharts não lê classes `md:`
// do Tailwind, então eixo/grid só aparecem no desktop via JS (mesmo limiar
// de BREAKPOINT_MD_PX já usado em useSwipeMes, visao-mensal-client.jsx).
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT_MD_PX}px)`);
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}

function formatarEixoY(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Cor por barra (Design §14.2): simulado sempre em --periodo-fg, independente
// do sinal — resolve o cruzamento do zero sem precisar empilhar, já que a
// altura/direção da barra já vem de disponivelExibido normalmente.
function corDaBarra(mes) {
  if (mes.simulado) return "var(--periodo-fg)";
  return mes.disponivelExibido >= 0 ? "var(--entrada)" : "var(--destructive)";
}

// Shape customizado em vez de <Cell>: além da cor por barra, dá acesso ao
// <rect> pra anexar aria-label — o Tooltip do Recharts não é acessível via
// teclado/leitor de tela, mesmo fallback leve já usado nos indicadores dos
// cards (title/aria-label). Evita <title> nativo de propósito: sobreporia o
// tooltip customizado com o tooltip nativo do navegador no hover.
function BarraDisponivel({ x, y, width, height, payload }) {
  const rotulo = payload.simulado
    ? `${payload.mesAbrev}/${payload.anoReferencia}: ${formatarReais(payload.disponivel)} → ${formatarReais(payload.disponivelSimulado)}`
    : `${payload.mesAbrev}/${payload.anoReferencia}: ${formatarReais(payload.disponivelExibido)}`;

  // Barras de valor negativo chegam com height negativo (Recharts calcula a
  // partir da baseline em zero) — <rect> do SVG não aceita altura negativa e
  // simplesmente não renderiza. Normaliza altura/posição antes de desenhar.
  const alturaFinal = Math.abs(height);
  const yFinal = height < 0 ? y + height : y;

  return (
    <rect
      x={x}
      y={yFinal}
      width={width}
      height={alturaFinal}
      fill={corDaBarra(payload)}
      rx={2}
      role="img"
      aria-label={rotulo}
    />
  );
}

function TooltipDisponivel({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const mes = payload[0].payload;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 font-semibold">
        {MESES[mes.mesReferencia - 1]}/{mes.anoReferencia}
      </p>
      {mes.simulado ? (
        <p className="tabular-nums text-muted-foreground">
          {formatarReais(mes.disponivel)} → {formatarReais(mes.disponivelSimulado)}
        </p>
      ) : (
        <p className="tabular-nums text-muted-foreground">{formatarReais(mes.disponivelExibido)}</p>
      )}
    </div>
  );
}

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// "YYYY-MM-DD" (formato de <input type="date">) precisa virar data local —
// new Date(string) trataria como UTC meia-noite e "voltaria" um dia em fusos
// atrás de UTC, corrompendo o cálculo de fatura (mesmo cuidado de
// lib/actions/transacoes.js, aqui reimplementado porque roda no cliente).
function dataLocalDoInput(valor) {
  const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return null;
  const [, ano, mes, dia] = partes;
  return new Date(Number(ano), Number(mes) - 1, Number(dia));
}

function mesmoMes(a, b) {
  return a.mesReferencia === b.mesReferencia && a.anoReferencia === b.anoReferencia;
}

function GraficoDisponivel({ meses }) {
  const isDesktop = useIsDesktop();
  const temSimulacao = meses.some((m) => m.simulado);

  const dados = meses.map((m) => ({ ...m, mesAbrev: MESES[m.mesReferencia - 1].slice(0, 3) }));

  return (
    <Card>
      <CardContent className="pt-6">
        {temSimulacao && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: "var(--periodo-fg)" }}
            />
            Simulado
          </div>
        )}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dados} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            {isDesktop && <CartesianGrid vertical={false} stroke="var(--border)" />}
            <ReferenceLine y={0} stroke="var(--border)" />
            {isDesktop && (
              <YAxis
                tickFormatter={formatarEixoY}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
            )}
            <XAxis
              dataKey="mesAbrev"
              tick={{ fill: "var(--muted-foreground)", fontSize: isDesktop ? 11 : 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TooltipDisponivel />} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
            <Bar dataKey="disponivelExibido" isAnimationActive={false} shape={<BarraDisponivel />} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Card enxuto de mês (Design §14.2): sem composição real/estimado — só o
// total de cada indicador, ícone identifica no lugar do rótulo em texto.
function Indicador({ Icone, cor, valor, titulo }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] text-muted-foreground md:gap-1.5 md:text-sm"
      title={titulo}
    >
      <Icone className={cn("h-3.5 w-3.5 shrink-0 md:h-4 md:w-4", cor)} />
      <span className="tabular-nums">{formatarReais(valor)}</span>
    </span>
  );
}

// Design §14.3: o resultado simulado precisa ser distinguível do valor base —
// delta ao lado do número (ex.: "R$ 1.140 → R$ 840") em vez de só o novo total.
function DisponivelComDelta({ disponivel, disponivelSimulado, simulado }) {
  return (
    <div>
      <p className="mb-0.5 text-[9.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
        Disponível
      </p>
      {!simulado ? (
        <p className={cn("text-xl font-semibold tabular-nums", disponivel < 0 && "text-destructive")}>
          {formatarReais(disponivel)}
        </p>
      ) : (
        <p className="text-xl font-semibold tabular-nums">
          <span className={cn(disponivel < 0 && "text-destructive")}>{formatarReais(disponivel)}</span>
          {" → "}
          <span className={cn(disponivelSimulado < 0 && "text-destructive")}>
            {formatarReais(disponivelSimulado)}
          </span>
        </p>
      )}
    </div>
  );
}

function LinhaMes({ mes }) {
  const saidasTotal = mes.debito.total + mes.credito.total;

  return (
    <Link href={`/visao-mensal?mes=${mes.mesReferencia}&ano=${mes.anoReferencia}`}>
      <Card className="transition-all hover:border-ring hover:bg-muted hover:shadow-md">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
          <div className="flex items-baseline gap-1.5 md:w-28 md:flex-col md:items-start md:gap-0">
            <p className="font-semibold">{MESES[mes.mesReferencia - 1]}</p>
            <span className="text-xs text-muted-foreground md:hidden" aria-hidden="true">
              ·
            </span>
            <p className="text-xs text-muted-foreground">{mes.anoReferencia}</p>
          </div>
          <div className="flex flex-nowrap items-center gap-x-2 md:flex-1 md:gap-x-5">
            <Indicador Icone={ArrowDownCircle} cor="text-entrada" valor={mes.entradas.total} titulo="Entradas" />
            <Indicador Icone={ArrowUpCircle} cor="text-muted-foreground" valor={saidasTotal} titulo="Saídas" />
            <Indicador Icone={PiggyBank} cor="text-investimento" valor={mes.investimentos} titulo="Investimentos" />
          </div>
          <div className="md:ml-auto md:text-right">
            <DisponivelComDelta
              disponivel={mes.disponivel}
              disponivelSimulado={mes.disponivelSimulado}
              simulado={mes.simulado}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const FORM_INICIAL = { cartaoId: "", data: hojeISO(), valorCentavos: 0, numeroParcelas: "2" };

function FormularioSimulacao({ cartoes, onSimular, onLimpar, ativo }) {
  const [form, setForm] = useState(FORM_INICIAL);

  function handleSubmit(e) {
    e.preventDefault();
    onSimular({
      cartaoId: form.cartaoId,
      data: dataLocalDoInput(form.data),
      valorTotal: form.valorCentavos / 100,
      numeroParcelas: Number(form.numeroParcelas),
    });
  }

  function limpar() {
    setForm(FORM_INICIAL);
    onLimpar();
  }

  if (cartoes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Cadastre um cartão de crédito em Contas para simular uma compra.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="simCartao">Cartão</Label>
            <Select
              value={form.cartaoId}
              onValueChange={(cartaoId) => setForm({ ...form, cartaoId })}
            >
              <SelectTrigger id="simCartao">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((cartao) => (
                  <SelectItem key={cartao.id} value={cartao.id}>
                    {cartao.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="simData">Data da compra</Label>
            <Input
              id="simData"
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>

          <CampoValor
            id="simValor"
            label="Valor total"
            valorCentavos={form.valorCentavos}
            onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
          />

          <div className="flex flex-col gap-2 md:w-28">
            <Label htmlFor="simParcelas">Nº de parcelas</Label>
            <Input
              id="simParcelas"
              type="number"
              min={1}
              required
              value={form.numeroParcelas}
              onChange={(e) => setForm({ ...form, numeroParcelas: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={!form.cartaoId || form.valorCentavos === 0}>
              Simular
            </Button>
            {ativo && (
              <Button type="button" variant="outline" onClick={limpar}>
                Limpar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProjecaoClient({ meses, cartoes }) {
  const [simulacao, setSimulacao] = useState(null);

  const parcelas = useMemo(() => {
    if (!simulacao) return [];
    const cartao = cartoes.find((c) => c.id === simulacao.cartaoId);
    if (!cartao || !simulacao.data) return [];

    const valorParcela = Math.round((simulacao.valorTotal / simulacao.numeroParcelas) * 100) / 100;
    return gerarParcelas(simulacao.data, valorParcela, simulacao.numeroParcelas, cartao);
  }, [simulacao, cartoes]);

  const mesesComSimulacao = useMemo(
    () =>
      meses.map((mes) => {
        const impacto = parcelas
          .filter((p) => mesmoMes(p, mes))
          .reduce((soma, p) => soma + p.valor, 0);

        const disponivelSimulado = mes.disponivel - impacto;

        return {
          ...mes,
          simulado: impacto > 0,
          disponivelSimulado,
          disponivelExibido: impacto > 0 ? disponivelSimulado : mes.disponivel,
        };
      }),
    [meses, parcelas]
  );

  const parcelasNaJanela = parcelas.filter((p) => meses.some((mes) => mesmoMes(p, mes))).length;

  return (
    <div className="flex flex-col gap-6">
      <GraficoDisponivel meses={mesesComSimulacao} />

      <FormularioSimulacao
        cartoes={cartoes}
        ativo={simulacao !== null}
        onSimular={setSimulacao}
        onLimpar={() => setSimulacao(null)}
      />

      {simulacao && (
        <p className="text-sm text-muted-foreground">
          Simulação: {parcelasNaJanela} de {simulacao.numeroParcelas} parcelas dentro da janela de 12
          meses.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {mesesComSimulacao.map((mes) => (
          <LinhaMes key={`${mes.mesReferencia}-${mes.anoReferencia}`} mes={mes} />
        ))}
      </div>
    </div>
  );
}
