"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
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

const ALTURA_BARRA_PX = 80;

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
  const maiorAbsoluto = Math.max(1, ...meses.map((m) => Math.abs(m.disponivelExibido)));

  function alturaPx(valor) {
    return Math.max(2, Math.round((Math.abs(valor) / maiorAbsoluto) * ALTURA_BARRA_PX));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-end gap-1" style={{ height: ALTURA_BARRA_PX }}>
          {meses.map((m) => (
            <div
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex flex-1 items-end justify-center"
              title={`${MESES[m.mesReferencia - 1]}/${m.anoReferencia}: ${formatarReais(m.disponivelExibido)}`}
            >
              {m.disponivelExibido >= 0 && (
                <div
                  className={cn(
                    "w-full rounded-t bg-entrada",
                    m.simulado && "ring-2 ring-inset ring-primary"
                  )}
                  style={{ height: alturaPx(m.disponivelExibido) }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="border-t" />
        <div className="flex items-start gap-1" style={{ height: ALTURA_BARRA_PX }}>
          {meses.map((m) => (
            <div
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex flex-1 items-start justify-center"
            >
              {m.disponivelExibido < 0 && (
                <div
                  className={cn(
                    "w-full rounded-b bg-destructive",
                    m.simulado && "ring-2 ring-inset ring-primary"
                  )}
                  style={{ height: alturaPx(m.disponivelExibido) }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {meses.map((m) => (
            <span
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {MESES[m.mesReferencia - 1].slice(0, 3)}
            </span>
          ))}
        </div>
        {meses.some((m) => m.simulado) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Disponível por mês — barras com contorno foram recalculadas pela simulação.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Card enxuto de mês (Design §14.2): sem composição real/estimado — só o
// total de cada indicador, ícone identifica no lugar do rótulo em texto.
function Indicador({ Icone, cor, valor, titulo }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title={titulo}>
      <Icone className={cn("h-4 w-4 shrink-0", cor)} />
      <span className="tabular-nums">{formatarReais(valor)}</span>
    </span>
  );
}

// Design §14.3: o resultado simulado precisa ser distinguível do valor base —
// delta ao lado do número (ex.: "R$ 1.140 → R$ 840") em vez de só o novo total.
function DisponivelComDelta({ disponivel, disponivelSimulado, simulado }) {
  if (!simulado) {
    return (
      <p className={cn("text-xl font-semibold tabular-nums", disponivel < 0 && "text-destructive")}>
        {formatarReais(disponivel)}
      </p>
    );
  }

  return (
    <p className="text-xl font-semibold tabular-nums">
      <span className={cn(disponivel < 0 && "text-destructive")}>{formatarReais(disponivel)}</span>
      {" → "}
      <span className={cn(disponivelSimulado < 0 && "text-destructive")}>
        {formatarReais(disponivelSimulado)}
      </span>
    </p>
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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 md:flex-1">
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
