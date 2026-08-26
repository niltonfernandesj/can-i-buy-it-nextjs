"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aportar, resgatar } from "@/lib/actions/investimentos";
import { formatarReais } from "@/lib/moeda";
import { hojeISO } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Aporte e resgate são a mesma operação em sentidos opostos — mesmos campos,
 * mesma validação, só muda para onde o dinheiro vai. Um componente só,
 * parametrizado, em vez de dois arquivos quase idênticos.
 */
const OPERACOES = {
  aporte: {
    acao: aportar,
    titulo: (conta) => `Aportar em ${conta.nome}`,
    rotuloConta: "Conta de origem",
    submeter: "Aportar",
    submetendo: "Aportando...",
  },
  resgate: {
    acao: resgatar,
    titulo: (conta) => `Resgatar de ${conta.nome}`,
    rotuloConta: "Conta de destino",
    submeter: "Resgatar",
    submetendo: "Resgatando...",
  },
};

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
              : "border-input bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

export function MovimentarConta({ operacao, conta, contasCorrentes, aberto, onAbertoMudou, children }) {
  const config = OPERACOES[operacao];
  const router = useRouter();
  const [interno, setInterno] = useState(false);
  const controlado = aberto !== undefined;
  const estaAberto = controlado ? aberto : interno;
  const mudar = controlado ? onAbertoMudou : setInterno;

  const [form, setForm] = useState({
    contaCorrenteId: contasCorrentes[0]?.id ?? "",
    data: hojeISO(),
    valorCentavos: 0,
    descricao: "",
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await config.acao({
      contaInvestimentoId: conta.id,
      contaCorrenteId: form.contaCorrenteId,
      valor: form.valorCentavos / 100,
      data: form.data,
      descricao: form.descricao,
    });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setForm((f) => ({ ...f, valorCentavos: 0, descricao: "" }));
    mudar(false);
    router.refresh();
  }

  return (
    <Dialog open={estaAberto} onOpenChange={mudar}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.titulo(conta)}</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{config.rotuloConta}</Label>
            <Chips
              opcoes={contasCorrentes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
              valorAtual={form.contaCorrenteId}
              onSelecionar={(contaCorrenteId) => setForm({ ...form, contaCorrenteId })}
            />
          </div>

          <CampoValor
            id={`${operacao}-valor`}
            label="Valor"
            valorCentavos={form.valorCentavos}
            onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
          />

          {operacao === "resgate" && (
            <p className="text-xs text-muted-foreground">
              Parado em {conta.nome}: {formatarReais(conta.emConta)}. Só o que está em conta pode
              ser resgatado — uma posição aplicada precisa ser liquidada antes.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${operacao}-data`}>Data</Label>
            <Input
              id={`${operacao}-data`}
              type="date"
              required
              // Investimento não é agendamento (Requisitos §3.13.5). O `max`
              // é conveniência: a autoridade é a Server Action.
              max={hojeISO()}
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${operacao}-descricao`}>Descrição (opcional)</Label>
            <Input
              id={`${operacao}-descricao`}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder={config.titulo(conta)}
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => mudar(false)} disabled={carregando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? config.submetendo : config.submeter}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
