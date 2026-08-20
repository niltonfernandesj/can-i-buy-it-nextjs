"use client";

import { useState } from "react";
import { criarTransacao, criarTransacaoParcelada, criarTransacaoRecorrente } from "@/lib/actions/transacoes";
import { CATEGORIA_LABELS, TIPO_LABELS } from "@/lib/categorias";
import { TIPO_CONTA_LABELS, TIPO_CONTA_ICONES } from "@/lib/contas";
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
  recorrente: false,
  numeroMeses: "3",
};

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

  // Saída pode ser recorrente em conta corrente ou cartão; entrada recorrente
  // só é permitida em conta corrente (não faz sentido em cartão de crédito).
  const recorrenteDisponivel =
    form.tipo === "SAIDA" ? ehCartao || ehContaCorrente : ehContaCorrente;

  function selecionarConta(contaId) {
    const conta = contas.find((c) => c.id === contaId);
    const recorrenteAindaValido =
      form.tipo === "SAIDA"
        ? conta?.tipo === "CONTA_CORRENTE" || conta?.tipo === "CARTAO_CREDITO"
        : conta?.tipo === "CONTA_CORRENTE";
    setForm({
      ...form,
      contaId,
      ehInvestimento: conta?.tipo === "CONTA_CORRENTE" ? form.ehInvestimento : false,
      contaInvestimentoId: conta?.tipo === "CONTA_CORRENTE" ? form.contaInvestimentoId : "",
      parcelado: conta?.tipo === "CARTAO_CREDITO" ? form.parcelado : false,
      recorrente: form.recorrente && recorrenteAindaValido,
    });
  }

  function marcarParcelado(marcado) {
    setForm({
      ...form,
      parcelado: marcado,
      tipo: marcado ? "SAIDA" : form.tipo,
      ehInvestimento: marcado ? false : form.ehInvestimento,
      recorrente: marcado ? false : form.recorrente,
    });
  }

  function marcarRecorrente(marcado) {
    setForm({
      ...form,
      recorrente: marcado,
      parcelado: marcado ? false : form.parcelado,
      // Entrada recorrente não pode ser marcada como investimento (resgate).
      ehInvestimento: marcado && form.tipo === "ENTRADA" ? false : form.ehInvestimento,
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
              disabled={form.parcelado || form.recorrente}
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
                {contasParaSelecao.map((conta) => {
                  const IconeConta = TIPO_CONTA_ICONES[conta.tipo];
                  return (
                    <SelectItem key={conta.id} value={conta.id}>
                      <span className="flex items-center gap-2">
                        <IconeConta className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {conta.nome}
                        <span className="text-xs text-muted-foreground">
                          · {TIPO_CONTA_LABELS[conta.tipo]}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {(ehCartao || ehContaCorrente) && (
            <div className="flex flex-col gap-4 rounded-md border p-4">
              {ehCartao && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="parcelado"
                    checked={form.parcelado}
                    onCheckedChange={marcarParcelado}
                  />
                  <Label htmlFor="parcelado">Parcelado</Label>
                </div>
              )}

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

              {!form.parcelado && recorrenteDisponivel && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recorrente"
                    checked={form.recorrente}
                    onCheckedChange={marcarRecorrente}
                  />
                  <Label htmlFor="recorrente">Recorrente</Label>
                </div>
              )}

              {form.recorrente && (
                <div className="flex flex-col gap-2">
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

          {ehContaCorrente && !(form.recorrente && form.tipo === "ENTRADA") && (
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
