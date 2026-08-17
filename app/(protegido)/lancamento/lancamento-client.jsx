"use client";

import { useState } from "react";
import { criarTransacao, criarTransacaoParcelada } from "@/lib/actions/transacoes";
import { formatarCentavosParaReais } from "@/lib/moeda";
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

const TIPO_LABELS = { SAIDA: "Saída", ENTRADA: "Entrada" };

const CATEGORIA_LABELS = {
  MERCADO: "Mercado",
  LAZER: "Lazer",
  SAUDE: "Saúde",
  TRANSPORTE: "Transporte",
  MORADIA: "Moradia",
  SALARIO: "Salário",
  OUTROS: "Outros",
};

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const FORM_INICIAL = {
  tipo: "SAIDA",
  contaId: "",
  valorCentavos: 0,
  categoria: "OUTROS",
  descricao: "",
  dataCompra: hojeISO(),
  ehInvestimento: false,
  contaInvestimentoId: "",
  parcelado: false,
  numeroParcelas: "2",
  valorParcelaCentavos: 0,
};

function CampoValor({ id, label, valorCentavos, onChange, className = "" }) {
  // Formata o valor exibido a cada tecla, então a posição do cursor dentro do
  // texto formatado não é confiável para saber "onde" um novo dígito entrou —
  // por isso os dígitos são acumulados numericamente (como uma calculadora,
  // sempre a partir da direita) em vez de reler o texto renderizado do input.
  function handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      onChange(Math.min(valorCentavos * 10 + Number(e.key), Number.MAX_SAFE_INTEGER));
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onChange(Math.floor(valorCentavos / 10));
      return;
    }

    if (!["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(e.key)) {
      e.preventDefault();
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        required
        value={formatarCentavosParaReais(valorCentavos)}
        onKeyDown={handleKeyDown}
        onPaste={(e) => e.preventDefault()}
        onChange={() => {}}
      />
    </div>
  );
}

export function LancamentoClient({ contas }) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  const contasParaSelecao = contas.filter((c) => c.tipo !== "CONTA_INVESTIMENTO");
  const contasInvestimento = contas.filter((c) => c.tipo === "CONTA_INVESTIMENTO");

  const contaSelecionada = contas.find((c) => c.id === form.contaId);
  const ehContaCorrente = contaSelecionada?.tipo === "CONTA_CORRENTE";
  const ehCartao = contaSelecionada?.tipo === "CARTAO_CREDITO";

  function selecionarConta(contaId) {
    const conta = contas.find((c) => c.id === contaId);
    setForm({
      ...form,
      contaId,
      ehInvestimento: conta?.tipo === "CONTA_CORRENTE" ? form.ehInvestimento : false,
      contaInvestimentoId: conta?.tipo === "CONTA_CORRENTE" ? form.contaInvestimentoId : "",
      parcelado: conta?.tipo === "CARTAO_CREDITO" ? form.parcelado : false,
    });
  }

  function marcarParcelado(marcado) {
    setForm({
      ...form,
      parcelado: marcado,
      tipo: marcado ? "SAIDA" : form.tipo,
      ehInvestimento: marcado ? false : form.ehInvestimento,
    });
  }

  function marcarInvestimento(marcado) {
    setForm({ ...form, ehInvestimento: marcado, parcelado: marcado ? false : form.parcelado });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    const resultado = form.parcelado
      ? await criarTransacaoParcelada({
          descricao: form.descricao,
          categoria: form.categoria,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          valorParcela: form.valorParcelaCentavos / 100,
          numeroParcelas: form.numeroParcelas,
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
    setForm(FORM_INICIAL);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(tipo) => setForm({ ...form, tipo })}
              disabled={form.parcelado}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="conta">Conta</Label>
            <Select value={form.contaId} onValueChange={selecionarConta}>
              <SelectTrigger id="conta">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {contasParaSelecao.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!form.parcelado && (
            <CampoValor
              id="valor"
              label="Valor"
              valorCentavos={form.valorCentavos}
              onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
            />
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(categoria) => setForm({ ...form, categoria })}
            >
              <SelectTrigger id="categoria">
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
            <Input
              id="dataCompra"
              type="date"
              required
              value={form.dataCompra}
              onChange={(e) => setForm({ ...form, dataCompra: e.target.value })}
            />
          </div>

          {ehContaCorrente && (
            <div className="flex flex-col gap-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ehInvestimento"
                  checked={form.ehInvestimento}
                  onCheckedChange={marcarInvestimento}
                />
                <Label htmlFor="ehInvestimento">É investimento</Label>
              </div>

              {form.ehInvestimento && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contaInvestimentoId">Conta de investimento</Label>
                  <Select
                    value={form.contaInvestimentoId}
                    onValueChange={(contaInvestimentoId) =>
                      setForm({ ...form, contaInvestimentoId })
                    }
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

          {ehCartao && (
            <div className="flex flex-col gap-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="parcelado"
                  checked={form.parcelado}
                  onCheckedChange={marcarParcelado}
                />
                <Label htmlFor="parcelado">Parcelado</Label>
              </div>

              {form.parcelado && (
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="numeroParcelas">Nº de parcelas</Label>
                    <Input
                      id="numeroParcelas"
                      type="number"
                      min={1}
                      required
                      value={form.numeroParcelas}
                      onChange={(e) => setForm({ ...form, numeroParcelas: e.target.value })}
                    />
                  </div>
                  <CampoValor
                    id="valorParcela"
                    label="Valor da parcela"
                    className="flex-1"
                    valorCentavos={form.valorParcelaCentavos}
                    onChange={(valorParcelaCentavos) => setForm({ ...form, valorParcelaCentavos })}
                  />
                </div>
              )}
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {sucesso && <p className="text-sm text-emerald-600">{sucesso}</p>}

          <Button type="submit" disabled={carregando}>
            {carregando ? "Salvando..." : "Lançar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
