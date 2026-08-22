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
  Circle,
  CheckCircle2,
} from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { formatarDataCurta } from "@/lib/datas";
import { CATEGORIA_LABELS } from "@/lib/categorias";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SeletorPeriodo,
  useNavegacaoPeriodo,
} from "@/components/visao-mensal/seletor-periodo";
import { DetalheDiario } from "@/components/visao-mensal/detalhe-diario";
import { CampoValor } from "@/components/campo-valor";
import {
  consolidarReceitaPadrao,
  removerConsolidacaoReceitaPadrao,
  consolidarDespesaPadrao,
  removerConsolidacaoDespesaPadrao,
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

function dataParaISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Pré-preenchimento da data no formulário de consolidação (Design §13.6):
// hoje quando o mês exibido é o corrente, senão o dia 1 do mês exibido.
function dataInicialConsolidacao(mes, ano) {
  const hoje = new Date();
  const ehMesAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano;
  return ehMesAtual
    ? dataParaISO(hoje)
    : dataParaISO(new Date(ano, mes - 1, 1));
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
function LinhaItemReceitaPadrao({
  item,
  mes,
  ano,
  editando,
  onEditar,
  onFechar,
  router,
}) {
  // Começa vazio, não pré-preenchido com o valor atual: CampoValor acumula
  // dígitos por cima do que já está lá (estilo calculadora) — pré-preencher
  // obrigaria apagar o valor inteiro antes de digitar o novo, o oposto de
  // uma edição rápida e discreta.
  const [valorCentavos, setValorCentavos] = useState(0);
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setCarregando(true);
    await consolidarReceitaPadrao({
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
    await removerConsolidacaoReceitaPadrao({
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

// Valor exibido à direita de uma linha da checklist de despesa padrão
// (Design §13.6): resolvido usa o valor real (R$ 0 quando resolvido sem
// pagar); pendente usa o valor do item, exceto em mês encerrado — aí não
// soma ao total (§13.3), e um número que não entra na conta confundiria.
function valorExibidoDespesaPadrao(item, mesEncerrado) {
  if (item.consolidado) {
    return formatarReais(item.resolvidoSemPagar ? 0 : item.valor);
  }
  return mesEncerrado ? "não registrado" : formatarReais(item.valorPadrao);
}

// Linha de um item de despesa padrão no débito (Requisitos 3.9, Design
// §13.6) — checklist: o ícone é estado e gatilho ao mesmo tempo (Circle
// pendente, CheckCircle2 resolvido). Item pago recua em text-muted-foreground
// (a atenção vai pro que falta); pendente fica na cor normal.
function LinhaItemDespesaPadrao({
  item,
  mes,
  ano,
  mesEncerrado,
  contasCorrentes,
  editando,
  onEditar,
  onFechar,
  router,
}) {
  const resolvido = item.consolidado;
  const Icone = resolvido ? CheckCircle2 : Circle;

  const valorInicialCentavos = Math.round(
    (resolvido && !item.resolvidoSemPagar ? item.valor : item.valorPadrao) *
      100,
  );

  const [valorCentavos, setValorCentavos] = useState(valorInicialCentavos);
  const [data, setData] = useState(
    item.data
      ? dataParaISO(new Date(item.data))
      : dataInicialConsolidacao(mes, ano),
  );
  const [contaId, setContaId] = useState(item.contaId ?? "");
  const [categoria, setCategoria] = useState(item.categoria ?? "OUTROS");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    if (valorCentavos === 0 && resolvido && !item.resolvidoSemPagar) {
      const confirmado = window.confirm(
        `Salvar "${item.descricao}" com R$ 0,00 vai apagar o lançamento de ${formatarReais(
          item.valor,
        )}. Confirma?`,
      );
      if (!confirmado) return;
    }

    setErro("");
    setCarregando(true);
    const resultado = await consolidarDespesaPadrao({
      valorPadraoId: item.id,
      mesReferencia: mes,
      anoReferencia: ano,
      valor: valorCentavos / 100,
      data,
      contaId,
      categoria,
    });
    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }
    onFechar();
    router.refresh();
  }

  async function apagarOuDesfazer() {
    const mensagem = item.resolvidoSemPagar
      ? `Desfazer "${item.descricao}"? Volta a pendente.`
      : `Apagar o lançamento de "${item.descricao}" (${formatarReais(item.valor)})? Volta a pendente.`;
    if (!window.confirm(mensagem)) return;

    setCarregando(true);
    await removerConsolidacaoDespesaPadrao({
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
      <div className="flex flex-col gap-3 border-t border-dashed pt-3">
        <span className="text-sm">{item.descricao}</span>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <CampoValor
            id={`despesa-padrao-valor-${item.id}`}
            label="Valor"
            className="sm:w-32"
            valorCentavos={valorCentavos}
            onChange={setValorCentavos}
          />
          <div className="flex flex-col gap-2 sm:w-40">
            <Label htmlFor={`despesa-padrao-data-${item.id}`}>Data</Label>
            <Input
              id={`despesa-padrao-data-${item.id}`}
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:min-w-[10rem]">
            <Label htmlFor={`despesa-padrao-conta-${item.id}`}>Conta</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger id={`despesa-padrao-conta-${item.id}`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {contasCorrentes.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:min-w-[9rem]">
            <Label htmlFor={`despesa-padrao-categoria-${item.id}`}>
              Categoria
            </Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id={`despesa-padrao-categoria-${item.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIA_LABELS).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex items-center justify-between gap-2">
          {resolvido ? (
            <button
              type="button"
              onClick={apagarOuDesfazer}
              disabled={carregando}
              className="text-xs text-destructive underline underline-offset-2 hover:text-foreground"
            >
              {item.resolvidoSemPagar ? "Desfazer" : "Apagar lançamento"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFechar}
              disabled={carregando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={salvar}
              disabled={carregando}
            >
              {carregando ? "Salvando..." : resolvido ? "Salvar" : "Consolidar"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEditar}
          aria-label={
            resolvido
              ? `Editar ${item.descricao}`
              : `Consolidar ${item.descricao}`
          }
          title={resolvido ? "Editar" : "Consolidar"}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Icone className="h-4 w-4" />
        </button>
        <span className={resolvido ? "text-muted-foreground" : ""}>
          {item.descricao}
        </span>
        {resolvido && !item.resolvidoSemPagar && item.data && (
          <span className="text-xs text-muted-foreground">
            {formatarDataCurta(item.data)}
          </span>
        )}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          resolvido && "text-muted-foreground",
        )}
      >
        {valorExibidoDespesaPadrao(item, mesEncerrado)}
      </span>
    </div>
  );
}

// Lista de itens de despesa padrão no débito (Requisitos 3.9, Design §13.6)
// — mesma posição/espírito de ListaReceitaPadrao, com divisor tracejado
// (não sólido) separando do agrupamento por dia: comunica "isto é previsão
// resolvível", coerente com o tracejado já usado em LinhaEstimado.
function ListaDespesaPadrao({
  itens,
  mes,
  ano,
  mesEncerrado,
  contasCorrentes,
}) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState(null);

  if (itens.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-dashed pb-2">
      <p className="text-xs text-muted-foreground">Despesas padrão</p>
      {itens.map((item) => (
        <LinhaItemDespesaPadrao
          key={item.id}
          item={item}
          mes={mes}
          ano={ano}
          mesEncerrado={mesEncerrado}
          contasCorrentes={contasCorrentes}
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
  ehSaidasDebito = false,
  itensDespesaPadraoDebito,
  mesEncerrado,
  contasCorrentes,
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
            <ListaReceitaPadrao
              itens={itensReceitaPadrao}
              mes={mes}
              ano={ano}
            />
          )}
          {ehSaidasDebito && (
            <ListaDespesaPadrao
              itens={itensDespesaPadraoDebito}
              mes={mes}
              ano={ano}
              mesEncerrado={mesEncerrado}
              contasCorrentes={contasCorrentes}
            />
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
          {!ehEntradas && !ehSaidasDebito && (
            <LinhaEstimado estimado={estimado} />
          )}
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
  itensDespesaPadraoDebito,
  mesEncerrado,
  contasCorrentes,
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
            mensagemVazia="Nenhuma saída adicional no débito neste mês."
            ehSaidasDebito
            itensDespesaPadraoDebito={itensDespesaPadraoDebito}
            mesEncerrado={mesEncerrado}
            contasCorrentes={contasCorrentes}
            mes={mes}
            ano={ano}
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
