"use client";

import { useRef, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import { criarTransacao, criarTransacaoParcelada, criarTransacaoRecorrente } from "@/lib/actions/transacoes";
import { CATEGORIA_LABELS } from "@/lib/categorias";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
];

const MEIOS = [
  { valor: "CREDITO", rotulo: "Crédito", Icone: CreditCard },
  { valor: "DEBITO", rotulo: "Débito", Icone: Wallet },
];

// Toggle de um clique — Tipo e Meio só têm 2 opções, não justificam um
// dropdown (Design §8.2.4). Estado selecionado em alto contraste
// (bg-primary/text-primary-foreground), não uma variação sutil sobre
// bg-muted — testado com o usuário via mock, contraste baixo demais.
function ToggleSegmentado({ opcoes, valorAtual, onSelecionar, desabilitado }) {
  return (
    <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onSelecionar(opcao.valor)}
          disabled={desabilitado}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
            valorAtual === opcao.valor
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <opcao.Icone className="h-3.5 w-3.5" />
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

// Chips de um clique — Conta e Categoria (Design §8.2.4).
function Chips({ opcoes, valorAtual, onSelecionar }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onSelecionar(opcao.valor)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            valorAtual === opcao.valor
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

const BOTAO_ICONE = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground";
const BOTAO_PARCELA = "flex h-6 w-6 items-center justify-center rounded text-sm font-semibold text-muted-foreground hover:text-foreground";

const FORM_INICIAL = {
  tipo: "SAIDA",
  meio: "CREDITO",
  contaId: "",
  categoria: "OUTROS",
  valorCentavos: 0,
  numeroParcelas: 1,
  descricao: "",
  dataCompra: hojeISO(),
  ehInvestimento: false,
  contaInvestimentoId: "",
  recorrente: false,
  numeroMeses: "3",
};

export function LancamentoClient({ contas }) {
  const [form, setForm] = useState(() => ({
    ...FORM_INICIAL,
    contaId: contas.find((c) => c.tipo === "CARTAO_CREDITO")?.id ?? "",
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

  const ehCartao = form.meio === "CREDITO";
  const ehContaCorrente = form.meio === "DEBITO";
  const ehParcelado = form.numeroParcelas > 1;

  // Saída pode ser recorrente em conta corrente ou cartão (meio é sempre um
  // dos dois); entrada recorrente só é permitida em conta corrente.
  const recorrenteDisponivel = form.tipo === "SAIDA" ? true : ehContaCorrente;

  function selecionarMeio(meio) {
    const contaAindaValida =
      contas.find((c) => c.id === form.contaId)?.tipo ===
      (meio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE");
    const recorrenteAindaValido = form.tipo === "SAIDA" ? true : meio === "DEBITO";

    setForm({
      ...form,
      meio,
      contaId: contaAindaValida ? form.contaId : contasDoMeio(meio)[0]?.id ?? "",
      numeroParcelas: meio === "CREDITO" ? form.numeroParcelas : 1,
      ehInvestimento: meio === "DEBITO" ? form.ehInvestimento : false,
      contaInvestimentoId: meio === "DEBITO" ? form.contaInvestimentoId : "",
      recorrente: form.recorrente && recorrenteAindaValido,
    });
  }

  function selecionarTipo(tipo) {
    // Só existe entrada no débito — troca o meio automaticamente.
    const novoMeio = tipo === "ENTRADA" ? "DEBITO" : form.meio;
    const contaAindaValida =
      contas.find((c) => c.id === form.contaId)?.tipo ===
      (novoMeio === "CREDITO" ? "CARTAO_CREDITO" : "CONTA_CORRENTE");
    const recorrenteAindaValido = tipo === "SAIDA" ? true : novoMeio === "DEBITO";

    setForm({
      ...form,
      tipo,
      meio: novoMeio,
      contaId: contaAindaValida ? form.contaId : contasDoMeio(novoMeio)[0]?.id ?? "",
      recorrente: form.recorrente && recorrenteAindaValido,
      // Entrada recorrente não pode ser marcada como investimento (resgate).
      ehInvestimento: tipo === "ENTRADA" && form.recorrente ? false : form.ehInvestimento,
    });
  }

  function selecionarConta(contaId) {
    setForm({ ...form, contaId });
  }

  function ajustarParcelas(delta) {
    setForm({ ...form, numeroParcelas: Math.max(1, Math.min(99, form.numeroParcelas + delta)) });
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

  function marcarRecorrente(marcado) {
    setForm({
      ...form,
      recorrente: marcado,
      // Recorrente e Parcelado são mutuamente exclusivos.
      numeroParcelas: marcado ? 1 : form.numeroParcelas,
      ehInvestimento: marcado && form.tipo === "ENTRADA" ? false : form.ehInvestimento,
    });
  }

  function marcarInvestimento(marcado) {
    setForm({ ...form, ehInvestimento: marcado });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    const resultado = ehParcelado
      ? await criarTransacaoParcelada({
          descricao: form.descricao,
          categoria: form.categoria,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          valorParcela: form.valorCentavos / 100,
          numeroParcelas: form.numeroParcelas,
        })
      : form.recorrente
      ? await criarTransacaoRecorrente({
          tipo: form.tipo,
          descricao: form.descricao,
          categoria: form.categoria,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          valor: form.valorCentavos / 100,
          numeroMeses: form.numeroMeses,
          ehInvestimento: form.ehInvestimento,
          contaInvestimentoId: form.ehInvestimento ? form.contaInvestimentoId : undefined,
        })
      : await criarTransacao({
          tipo: form.tipo,
          valor: form.valorCentavos / 100,
          descricao: form.descricao,
          categoria: form.categoria,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          ehInvestimento: form.ehInvestimento,
          contaInvestimentoId: form.ehInvestimento ? form.contaInvestimentoId : undefined,
        });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setSucesso("Lançamento salvo com sucesso.");
    // Tipo, Meio, Conta, Categoria e Data tendem a se repetir entre
    // lançamentos consecutivos (ex.: várias compras seguidas no mesmo
    // cartão, na mesma categoria, no mesmo dia) — só esses sobrevivem ao
    // reset (Task 80 e Task 85).
    setForm({
      ...FORM_INICIAL,
      tipo: form.tipo,
      meio: form.meio,
      contaId: form.contaId,
      categoria: form.categoria,
      dataCompra: form.dataCompra,
    });
    valorInputRef.current?.focus();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <ToggleSegmentado opcoes={TIPOS} valorAtual={form.tipo} onSelecionar={selecionarTipo} desabilitado={ehParcelado} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Meio</Label>
            <ToggleSegmentado
              opcoes={form.tipo === "ENTRADA" ? MEIOS.filter((m) => m.valor === "DEBITO") : MEIOS}
              valorAtual={form.meio}
              onSelecionar={selecionarMeio}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Conta</Label>
            <Chips
              opcoes={contasDoMeio(form.meio).map((c) => ({ valor: c.id, rotulo: c.nome }))}
              valorAtual={form.contaId}
              onSelecionar={selecionarConta}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <Chips
              opcoes={Object.entries(CATEGORIA_LABELS).map(([valor, rotulo]) => ({ valor, rotulo }))}
              valorAtual={form.categoria}
              onSelecionar={(categoria) => setForm({ ...form, categoria })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <CampoValor
              ref={valorInputRef}
              id="valor"
              label={ehParcelado ? "Valor da parcela" : "Valor"}
              valorCentavos={form.valorCentavos}
              onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
              extra={
                ehCartao && (
                  <div className="flex items-center gap-1">
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
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => somarDia(-1)} aria-label="Dia anterior" className={BOTAO_ICONE}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Input
                id="dataCompra"
                type="date"
                required
                value={form.dataCompra}
                onChange={(e) => setForm({ ...form, dataCompra: e.target.value })}
                className="text-center"
              />
              <button type="button" onClick={() => somarDia(1)} aria-label="Dia seguinte" className={BOTAO_ICONE}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!ehParcelado && recorrenteDisponivel && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="recorrente" checked={form.recorrente} onCheckedChange={marcarRecorrente} />
                <Label htmlFor="recorrente">Recorrente</Label>
              </div>
              {form.recorrente && (
                <div className="flex flex-col gap-2 pl-6">
                  <Label htmlFor="numeroMeses">Quantidade de meses</Label>
                  <Input
                    id="numeroMeses"
                    type="number"
                    min={2}
                    required
                    value={form.numeroMeses}
                    onChange={(e) => setForm({ ...form, numeroMeses: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {ehContaCorrente && !(form.recorrente && form.tipo === "ENTRADA") && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ehInvestimento" checked={form.ehInvestimento} onCheckedChange={marcarInvestimento} />
                <Label htmlFor="ehInvestimento">É investimento</Label>
              </div>
              {form.ehInvestimento && (
                <div className="flex flex-col gap-2 pl-6">
                  <Label htmlFor="contaInvestimentoId">Conta de investimento</Label>
                  <Select
                    value={form.contaInvestimentoId}
                    onValueChange={(contaInvestimentoId) => setForm({ ...form, contaInvestimentoId })}
                  >
                    <SelectTrigger id="contaInvestimentoId">
                      <SelectValue placeholder="Selecione a conta de investimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasInvestimento.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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
