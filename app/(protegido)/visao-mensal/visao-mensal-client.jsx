"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  CreditCard,
  ChevronDown,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SeletorPeriodo,
  useNavegacaoPeriodo,
} from "@/components/visao-mensal/seletor-periodo";
import { DetalheDiario } from "@/components/visao-mensal/detalhe-diario";
import { CampoValor } from "@/components/campo-valor";
import {
  consolidarValorPadrao,
  removerConsolidacaoValorPadrao,
} from "@/lib/actions/valores-padrao";

const LIMIAR_SWIPE_PX = 50;
const BREAKPOINT_MD_PX = 768;

function useSwipeMes(mesAnterior, mesSeguinte) {
  const toqueInicial = useRef(null);

  function onTouchStart(e) {
    const t = e.touches[0];
    toqueInicial.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    if (!toqueInicial.current || window.innerWidth >= BREAKPOINT_MD_PX) {
      toqueInicial.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const deltaX = t.clientX - toqueInicial.current.x;
    const deltaY = t.clientY - toqueInicial.current.y;
    toqueInicial.current = null;

    if (
      Math.abs(deltaX) <= Math.abs(deltaY) ||
      Math.abs(deltaX) < LIMIAR_SWIPE_PX
    )
      return;

    if (deltaX < 0) mesSeguinte();
    else mesAnterior();
  }

  return { onTouchStart, onTouchEnd };
}

function classeAnimacaoSwipe(direcao) {
  if (direcao === "proxima")
    return "animate-in fade-in slide-in-from-right-8 duration-200";
  if (direcao === "anterior")
    return "animate-in fade-in slide-in-from-left-8 duration-200";
  return "";
}

function somarGrupo(grupo) {
  return grupo.transacoes.reduce((soma, t) => soma + Number(t.valor), 0);
}

// Composição em subtexto (Design §16.2). Despesa: "R$ 800 + R$ 400 estimado"
// (é uma estimativa de verdade). Receita padrão: "R$ 400 receita padrão +
// R$ 800" (garantida, lidera o subtexto, mesma cor dos lançamentos comuns —
// não é uma incerteza a comunicar, nem precisa de mais destaque que eles).
function SubtextoComposicao({ real, estimado, ehReceitaPadrao }) {
  if (estimado <= 0) return null;
  if (ehReceitaPadrao) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {formatarReais(estimado)} receita padrão + {formatarReais(real)}
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {formatarReais(real)} +{" "}
      <span className="text-estimado">{formatarReais(estimado)} estimado</span>
    </p>
  );
}

function CardResumo({ titulo, real, estimado, total, ehReceitaPadrao }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{formatarReais(total)}</p>
        <SubtextoComposicao
          real={real}
          estimado={estimado}
          ehReceitaPadrao={ehReceitaPadrao}
        />
      </CardContent>
    </Card>
  );
}

function Resumo({ entradas, saidas, disponivel }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <CardResumo
        titulo="Entradas"
        real={entradas.real}
        estimado={entradas.estimado}
        total={entradas.total}
        ehReceitaPadrao
      />
      <CardResumo
        titulo="Saídas"
        real={saidas.real}
        estimado={saidas.estimado}
        total={saidas.total}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-normal text-muted-foreground">
            Disponível
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">
          {formatarReais(disponivel)}
        </CardContent>
      </Card>
    </div>
  );
}

function CabecalhoBloco({ Icone, cor, titulo, total, expandido, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expandido}
      className="flex w-full items-center justify-between text-left"
    >
      <div className="flex items-center gap-2">
        <Icone className={cn("h-4 w-4", cor)} />
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          {titulo}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{formatarReais(total)}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expandido && "rotate-180",
          )}
        />
      </div>
    </button>
  );
}

// Linha própria do valor estimado de despesa (Design §16.2): borda tracejada,
// depois dos lançamentos reais — é uma estimativa de verdade, pode não se
// confirmar, nunca somada silenciosamente ao total sem indicação.
function LinhaEstimado({ estimado }) {
  if (estimado <= 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-dashed pt-2 text-sm text-estimado">
      <span>Estimado restante</span>
      <span className="font-medium">{formatarReais(estimado)}</span>
    </div>
  );
}

// Linha de um item de receita padrão (Design §13.5, revisado — antes uma
// linha única agregada, agora por item, cada um consolidável pra este mês
// via o lápis). Sem borda própria — o divider que separa do bloco de
// lançamentos reais é só um, no container da lista (ListaReceitaPadrao).
function LinhaItemReceitaPadrao({ item, mes, ano, editando, onEditar, onFechar, router }) {
  // Começa vazio, não pré-preenchido com o valor atual: CampoValor acumula
  // dígitos por cima do que já está lá (estilo calculadora) — pré-preencher
  // obrigaria apagar o valor inteiro antes de digitar o novo, o oposto de
  // uma edição rápida e discreta.
  const [valorCentavos, setValorCentavos] = useState(0);
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setCarregando(true);
    await consolidarValorPadrao({
      valorPadraoId: item.id,
      mesReferencia: mes,
      anoReferencia: ano,
      valor: valorCentavos / 100,
    });
    setCarregando(false);
    onFechar();
    router.refresh();
  }

  async function usarPadrao() {
    setCarregando(true);
    await removerConsolidacaoValorPadrao({
      valorPadraoId: item.id,
      mesReferencia: mes,
      anoReferencia: ano,
    });
    setCarregando(false);
    onFechar();
    router.refresh();
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{item.descricao}</span>
          <span className="flex items-center gap-1">
            <CampoValor
              id={`consolidacao-${item.id}`}
              ariaLabel={`Valor de ${item.descricao} para este mês`}
              valorCentavos={valorCentavos}
              onChange={setValorCentavos}
              className="w-28"
            />
            <button
              type="button"
              onClick={salvar}
              disabled={carregando || valorCentavos === 0}
              aria-label="Salvar"
              className="rounded p-1 text-entrada hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onFechar}
              disabled={carregando}
              aria-label="Cancelar"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        {item.consolidado && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={usarPadrao}
              disabled={carregando}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              usar padrão ({formatarReais(item.valorPadrao)})
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{item.descricao}</span>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Consolidar ${item.descricao} para este mês`}
          title="Consolidar para este mês"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <span className="font-medium">{formatarReais(item.valor)}</span>
      </span>
    </div>
  );
}

// Lista de itens de receita padrão (Requisitos 3.8, Design §13.5) — sempre
// por item, mesmo com um só cadastrado. Um único divider (borda inferior no
// container) separa o bloco inteiro dos lançamentos reais abaixo; não há
// divider entre os itens em si.
function ListaReceitaPadrao({ itens, mes, ano }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState(null);

  if (itens.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b pb-2">
      {itens.map((item) => (
        <LinhaItemReceitaPadrao
          key={item.id}
          item={item}
          mes={mes}
          ano={ano}
          editando={editandoId === item.id}
          onEditar={() => setEditandoId(item.id)}
          onFechar={() => setEditandoId(null)}
          router={router}
        />
      ))}
    </div>
  );
}

function BlocoPorDia({
  titulo,
  Icone,
  cor,
  total,
  estimado = 0,
  grupos,
  renderTag,
  mensagemVazia,
  ehEntradas = false,
  itensReceitaPadrao,
  mes,
  ano,
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <section className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0">
      <CabecalhoBloco
        Icone={Icone}
        cor={cor}
        titulo={titulo}
        total={total}
        expandido={expandido}
        onToggle={() => setExpandido((valor) => !valor)}
      />
      {expandido && (
        <>
          {ehEntradas && (
            <ListaReceitaPadrao itens={itensReceitaPadrao} mes={mes} ano={ano} />
          )}
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{mensagemVazia}</p>
          ) : (
            grupos.map((grupo) => (
              <DetalheDiario
                key={grupo.dia}
                dia={grupo.dia}
                transacoes={grupo.transacoes}
                total={somarGrupo(grupo)}
                renderTag={renderTag}
              />
            ))
          )}
          {!ehEntradas && <LinhaEstimado estimado={estimado} />}
        </>
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
  const [expandido, setExpandido] = useState(false);

  return (
    <section className="flex flex-col gap-2 py-6 first:pt-0 last:pb-0">
      <CabecalhoBloco
        Icone={Icone}
        cor={cor}
        titulo="Investimentos"
        total={total}
        expandido={expandido}
        onToggle={() => setExpandido((valor) => !valor)}
      />
      {expandido &&
        (investimentos.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">
            Nenhum investimento neste mês.
          </p>
        ) : (
          investimentos.map((investimento, index) => {
            let divClasses = "flex items-center justify-between text-sm";

            if (index === 0) {
              divClasses = divClasses + " mt-3";
            }

            return (
              <div
                key={investimento.contaInvestimentoId}
                className={divClasses}
              >
                <span>{investimento.contaInvestimentoNome}</span>
                <span>{formatarReais(investimento.total)}</span>
              </div>
            );
          })
        ))}
    </section>
  );
}

export function VisaoMensalClient({
  mes,
  ano,
  entradas,
  saidasDebito,
  saidasCredito,
  investimentos,
  itensReceitaPadrao,
  composicaoEntradas,
  composicaoDebito,
  composicaoCredito,
  totalInvestimentos,
  disponivel,
}) {
  const saidasCompostas = {
    real: composicaoDebito.real + composicaoCredito.real,
    estimado: composicaoDebito.estimado + composicaoCredito.estimado,
    total: composicaoDebito.total + composicaoCredito.total,
  };

  const { mesAnterior, mesSeguinte } = useNavegacaoPeriodo(mes, ano);

  // VisaoMensalClient não desmonta entre navegações de mês (confirmado: a rota tem
  // loading.jsx, mas a troca de searchParams não remonta a árvore de componentes —
  // só atualiza as props). Por isso um ref comum sobrevive até o próximo render.
  const direcaoSwipeRef = useRef(null);

  useEffect(() => {
    direcaoSwipeRef.current = null;
  }, [mes, ano]);

  function mesAnteriorViaSwipe() {
    direcaoSwipeRef.current = "anterior";
    mesAnterior();
  }

  function mesSeguinteViaSwipe() {
    direcaoSwipeRef.current = "proxima";
    mesSeguinte();
  }

  const { onTouchStart, onTouchEnd } = useSwipeMes(
    mesAnteriorViaSwipe,
    mesSeguinteViaSwipe,
  );

  return (
    <div
      className="flex flex-col gap-6"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex justify-center">
        <SeletorPeriodo mes={mes} ano={ano} />
      </div>

      <div
        key={`${mes}-${ano}`}
        className={cn(
          "flex flex-col gap-6",
          classeAnimacaoSwipe(direcaoSwipeRef.current),
        )}
      >
        <Resumo
          entradas={composicaoEntradas}
          saidas={saidasCompostas}
          disponivel={disponivel}
        />

        <div className="flex flex-col divide-y divide-border mt-8">
          <BlocoPorDia
            titulo="Entradas"
            Icone={ArrowDownCircle}
            cor="text-entrada"
            total={composicaoEntradas.total}
            grupos={entradas}
            renderTag={(t) => (t.ehInvestimento ? <TagResgate /> : null)}
            mensagemVazia="Nenhuma entrada adicional neste mês."
            ehEntradas
            itensReceitaPadrao={itensReceitaPadrao}
            mes={mes}
            ano={ano}
          />
          <BlocoInvestimentos
            Icone={PiggyBank}
            cor="text-investimento"
            total={totalInvestimentos}
            investimentos={investimentos}
          />
          <BlocoPorDia
            titulo="Saídas no débito"
            Icone={ArrowUpCircle}
            cor="text-saida-debito"
            total={composicaoDebito.total}
            estimado={composicaoDebito.estimado}
            grupos={saidasDebito}
            mensagemVazia="Nenhuma saída no débito neste mês."
          />
          <BlocoPorDia
            titulo="Saídas no crédito"
            Icone={CreditCard}
            cor="text-saida-credito"
            total={composicaoCredito.total}
            estimado={composicaoCredito.estimado}
            grupos={saidasCredito}
            mensagemVazia="Nenhuma saída no crédito neste mês."
          />
        </div>
      </div>
    </div>
  );
}
