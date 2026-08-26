"use client";

import { useRef, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { criarTransacao, criarTransacaoParcelada } from "@/lib/actions/transacoes";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { CampoValor } from "@/components/campo-valor";
import { MarcadorCor } from "@/components/marcador-categoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const TIPOS = [
  { valor: "SAIDA", rotulo: "Saída", Icone: ArrowUpCircle },
  { valor: "ENTRADA", rotulo: "Entrada", Icone: ArrowDownCircle },
  { valor: "INVESTIMENTO", rotulo: "Investimento", Icone: PiggyBank },
];

const MEIOS = [
  { valor: "CREDITO", rotulo: "Crédito", Icone: CreditCard },
  { valor: "DEBITO", rotulo: "Débito", Icone: Wallet },
];

// Toggle de um clique — Tipo e Meio só têm 2 opções, não justificam um
// dropdown (Design §8.2.4). Estado selecionado em alto contraste
// (bg-primary/text-primary-foreground), não uma variação sutil sobre
// bg-muted — testado com o usuário via mock, contraste baixo demais.
function ToggleSegmentado({ opcoes, valorAtual, onSelecionar, desabilitado, ocultarIconeNoMobile }) {
  return (
    <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onSelecionar(opcao.valor)}
          disabled={desabilitado}
          // min-w-0 é o que impede o grupo de estourar a largura disponível:
          // sem ele os itens flex não encolhem abaixo do próprio conteúdo
          // (min-width: auto é o default), e a terceira opção "Investimento"
          // empurrava o toggle pra fora da tela no mobile. O rótulo vai num
          // <span> truncável pra degradar com reticências em telas muito
          // estreitas em vez de vazar o layout.
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
            valorAtual === opcao.valor
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {/* ocultarIconeNoMobile só é usado no toggle de Tipo: medido que
              com o ícone "Investimento" não cabe em nenhuma largura de
              celular, nem reduzindo a fonte a 11px — é o ícone, não o texto,
              que estoura. O rótulo carrega o significado sozinho. Toggles de
              duas opções curtas (Meio) têm espaço de sobra e mantêm o ícone. */}
          <opcao.Icone
            className={cn("h-3.5 w-3.5 shrink-0", ocultarIconeNoMobile && "hidden sm:block")}
          />
          <span className="truncate">{opcao.rotulo}</span>
        </button>
      ))}
    </div>
  );
}

// Chips de um clique — Conta e Categoria (Design §8.2.4). `cor` é opcional:
// só os chips de Categoria trazem marcador (Design §18.4).
function Chips({ opcoes, valorAtual, onSelecionar }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onSelecionar(opcao.valor)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            valorAtual === opcao.valor
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {opcao.cor && <MarcadorCor cor={opcao.cor} />}
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

const BOTAO_DIA = "flex w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const BOTAO_PARCELA = "flex h-6 w-6 items-center justify-center rounded border bg-muted text-sm font-semibold text-muted-foreground hover:text-foreground";

const FORM_INICIAL = {
  tipo: "SAIDA",
  meio: "CREDITO",
  contaId: "",
  categoriaId: "",
  valorCentavos: 0,
  numeroParcelas: 1,
  descricao: "",
  dataCompra: hojeISO(),
  contaInvestimentoId: "",
};

export function LancamentoClient({ contas, categorias }) {
  const [form, setForm] = useState(() => ({
    ...FORM_INICIAL,
    contaId: contas.find((c) => c.tipo === "CARTAO_CREDITO")?.id ?? "",
    // "Outros" era o default histórico do enum; se tiver sido renomeada ou
    // desativada, cai na primeira categoria ativa.
    categoriaId: (categorias.find((c) => c.nome === "Outros") ?? categorias[0])?.id ?? "",
  }));
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const valorInputRef = useRef(null);

  const contasParaSelecao = contas.filter((c) => c.tipo !== "CONTA_INVESTIMENTO");
  const contasInvestimento = contas.filter((c) => c.tipo === "CONTA_INVESTIMENTO");

  function contasDoMeio(meio) {
    const tipoConta = meio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE";
    return contasParaSelecao.filter((c) => c.tipo === tipoConta);
  }

  // Estorno (spec-01 §3.11) é Entrada no crédito — e não existe parcelado, daí
  // o stepper de parcelas depender também do Tipo, não só do Meio.
  const ehCartao = form.meio === "CREDITO";
  const podeParcelar = ehCartao && form.tipo !== "ENTRADA";
  const ehParcelado = form.numeroParcelas > 1;

  function selecionarMeio(meio) {
    const contaAindaValida =
      contas.find((c) => c.id === form.contaId)?.tipo ===
      (meio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE");

    setForm({
      ...form,
      meio,
      contaId: contaAindaValida ? form.contaId : contasDoMeio(meio)[0]?.id ?? "",
      numeroParcelas: meio === "CREDITO" ? form.numeroParcelas : 1,
    });
  }

  function selecionarTipo(tipo) {
    // Só Investimento força o meio (aporte sempre parte da conta corrente).
    // Entrada preserva o Meio corrente desde o M27: numa sequência de
    // lançamentos no cartão, alternar Saída → Entrada pra registrar um estorno
    // não deve pular pro débito e perder o cartão já selecionado.
    const novoMeio = tipo === "INVESTIMENTO" ? "DEBITO" : form.meio;
    const contaAindaValida =
      contas.find((c) => c.id === form.contaId)?.tipo ===
      (novoMeio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE");

    setForm({
      ...form,
      tipo,
      meio: novoMeio,
      contaId: contaAindaValida ? form.contaId : contasDoMeio(novoMeio)[0]?.id ?? "",
      contaInvestimentoId: tipo === "INVESTIMENTO" ? form.contaInvestimentoId : "",
      // Entrada não parcela: volta a 1 pra não carregar um parcelamento
      // pendente de uma saída lançada antes na mesma sequência.
      numeroParcelas: tipo === "SAIDA" ? form.numeroParcelas : 1,
    });
  }

  function selecionarConta(contaId) {
    setForm({ ...form, contaId });
  }

  function ajustarParcelas(delta) {
    setForm({ ...form, numeroParcelas: Math.max(1, Math.min(99, form.numeroParcelas + delta)) });
  }

  // Clicar em qualquer ponto do campo abre o calendário, não só no ícone
  // nativo. showPicker() é a forma padronizada de fazer isso (WHATWG HTML);
  // o try/catch cobre os casos em que ela é barrada — iframe cross-origin,
  // ausência de ativação do usuário — onde o clique no ícone nativo continua
  // funcionando normalmente.
  function abrirSeletorData(e) {
    try {
      e.currentTarget.showPicker?.();
    } catch {
      // Sem problema: o ícone nativo do campo continua abrindo o calendário.
    }
  }

  function somarDia(delta) {
    const [ano, mes, dia] = form.dataCompra.split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setDate(d.getDate() + delta);
    setForm({
      ...form,
      dataCompra: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    // Investimento é um tipo só na UI — internamente é uma Saída marcada
    // como aporte (Design §8.2.4, "sem mudança de schema").
    const tipoReal = form.tipo === "INVESTIMENTO" ? "SAIDA" : form.tipo;
    const ehInvestimento = form.tipo === "INVESTIMENTO";

    const resultado = ehParcelado
      ? await criarTransacaoParcelada({
          descricao: form.descricao,
          categoriaId: form.categoriaId,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          valorParcela: form.valorCentavos / 100,
          numeroParcelas: form.numeroParcelas,
        })
      : await criarTransacao({
          tipo: tipoReal,
          valor: form.valorCentavos / 100,
          descricao: form.descricao,
          categoriaId: form.categoriaId,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          ehInvestimento,
          contaInvestimentoId: ehInvestimento ? form.contaInvestimentoId : undefined,
        });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setSucesso("Lançamento salvo com sucesso.");
    // Tipo, Meio, Conta, Categoria, Data e Conta de destino tendem a se
    // repetir entre lançamentos consecutivos (ex.: várias compras seguidas
    // no mesmo cartão, na mesma categoria, no mesmo dia; ou aportes
    // seguidos pra mesma conta de investimento) — só esses sobrevivem ao
    // reset (Task 80, Task 85 e Task 86).
    setForm({
      ...FORM_INICIAL,
      tipo: form.tipo,
      meio: form.meio,
      contaId: form.contaId,
      categoriaId: form.categoriaId,
      dataCompra: form.dataCompra,
      contaInvestimentoId: form.contaInvestimentoId,
    });
    valorInputRef.current?.focus();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <ToggleSegmentado
              opcoes={TIPOS}
              valorAtual={form.tipo}
              onSelecionar={selecionarTipo}
              desabilitado={ehParcelado}
              ocultarIconeNoMobile
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Meio</Label>
            <ToggleSegmentado
              opcoes={
                form.tipo === "INVESTIMENTO"
                  ? MEIOS.filter((m) => m.valor === "DEBITO")
                  : MEIOS
              }
              valorAtual={form.meio}
              onSelecionar={selecionarMeio}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{form.tipo === "INVESTIMENTO" ? "Conta de origem" : "Conta"}</Label>
            <Chips
              opcoes={contasDoMeio(form.meio).map((c) => ({ valor: c.id, rotulo: c.nome }))}
              valorAtual={form.contaId}
              onSelecionar={selecionarConta}
            />
          </div>

          {form.tipo === "INVESTIMENTO" && (
            <div className="flex flex-col gap-2">
              <Label>Conta de destino</Label>
              <Chips
                opcoes={contasInvestimento.map((c) => ({ valor: c.id, rotulo: c.nome }))}
                valorAtual={form.contaInvestimentoId}
                onSelecionar={(contaInvestimentoId) => setForm({ ...form, contaInvestimentoId })}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <Chips
              opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))}
              valorAtual={form.categoriaId}
              onSelecionar={(categoriaId) => setForm({ ...form, categoriaId })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <CampoValor
              ref={valorInputRef}
              id="valor"
              label={ehParcelado ? "Valor da parcela" : "Valor"}
              valorCentavos={form.valorCentavos}
              onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
              prefixo={
                podeParcelar && (
                  <div className="flex flex-none items-center gap-1 border-r border-input px-2">
                    <button type="button" onClick={() => ajustarParcelas(-1)} aria-label="Menos uma parcela" className={BOTAO_PARCELA}>
                      −
                    </button>
                    <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums">
                      {form.numeroParcelas}x
                    </span>
                    <button type="button" onClick={() => ajustarParcelas(1)} aria-label="Mais uma parcela" className={BOTAO_PARCELA}>
                      +
                    </button>
                  </div>
                )
              }
            />
            {ehParcelado && (
              <p className="text-xs text-muted-foreground">
                {form.numeroParcelas}x de {formatarReais(form.valorCentavos / 100)} ={" "}
                {formatarReais((form.valorCentavos * form.numeroParcelas) / 100)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dataCompra">Data</Label>
            {/* Campo único com os controles de dia acoplados nas pontas. O
                container carrega fundo/borda e ocupa a largura toda; o
                <input type="date"> fica com largura intrínseca, centralizado
                por mx-auto. O widget nativo ignora text-align (renderiza o
                valor sempre colado à esquerda), então o que centraliza a data
                de fato é centralizar o próprio campo, já do tamanho exato do
                conteúdo. Não usa o componente Input porque ele força w-full. */}
            <div className="flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-muted shadow-sm has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-ring">
              <button
                type="button"
                onClick={() => somarDia(-1)}
                aria-label="Dia anterior"
                className={cn(BOTAO_DIA, "border-r border-border")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                id="dataCompra"
                type="date"
                required
                value={form.dataCompra}
                onChange={(e) => setForm({ ...form, dataCompra: e.target.value })}
                onClick={abrirSeletorData}
                className="mx-auto w-auto border-none bg-transparent p-0 text-sm tabular-nums text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => somarDia(1)}
                aria-label="Dia seguinte"
                className={cn(BOTAO_DIA, "border-l border-border")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {sucesso && <p className="text-sm text-entrada">{sucesso}</p>}

          <Button type="submit" disabled={carregando}>
            {carregando ? "Salvando..." : "Lançar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
