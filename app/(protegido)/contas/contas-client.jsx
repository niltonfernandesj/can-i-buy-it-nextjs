"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft } from "lucide-react";
import { criarConta, editarConta, apagarConta } from "@/lib/actions/contas";
import { TIPO_CONTA_LABELS, TIPO_CONTA_ICONES } from "@/lib/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TIPO_OPCOES = Object.keys(TIPO_CONTA_LABELS).map((valor) => ({
  valor,
  label: TIPO_CONTA_LABELS[valor],
  Icone: TIPO_CONTA_ICONES[valor],
}));

const FORM_INICIAL = { nome: "", diaFechamento: "", diaVencimento: "" };

function CamposConta({ form, setForm, ehCartao, bloqueada }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          required
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
      </div>

      {ehCartao && (
        <div className="flex flex-col gap-2">
          {bloqueada && (
            <p className="text-xs text-muted-foreground">
              Esta conta já tem transações lançadas — dia de fechamento e vencimento não podem
              mais ser alterados, pois já determinaram o mês de referência dos lançamentos
              existentes.
            </p>
          )}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="diaFechamento">Dia de fechamento</Label>
              <Input
                id="diaFechamento"
                type="number"
                min={1}
                max={31}
                required
                disabled={bloqueada}
                value={form.diaFechamento}
                onChange={(e) => setForm({ ...form, diaFechamento: e.target.value })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="diaVencimento">Dia de vencimento</Label>
              <Input
                id="diaVencimento"
                type="number"
                min={1}
                max={31}
                required
                disabled={bloqueada}
                value={form.diaVencimento}
                onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NovaContaDialog({ aberto, onOpenChange, onCriada }) {
  const [etapa, setEtapa] = useState("tipo");
  const [tipo, setTipo] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function resetar(open) {
    onOpenChange(open);
    if (!open) {
      setEtapa("tipo");
      setTipo(null);
      setForm(FORM_INICIAL);
      setErro("");
    }
  }

  function escolherTipo(valor) {
    setTipo(valor);
    setForm(FORM_INICIAL);
    setErro("");
    setEtapa("formulario");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await criarConta({ ...form, tipo });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    resetar(false);
    onCriada();
  }

  const opcaoEscolhida = TIPO_OPCOES.find((o) => o.valor === tipo);

  return (
    <Dialog open={aberto} onOpenChange={resetar}>
      <DialogContent>
        {etapa === "tipo" ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova conta</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Escolha o tipo de conta que deseja criar.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TIPO_OPCOES.map(({ valor, label, Icone }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => escolherTipo(valor)}
                  className="flex flex-col items-center gap-2 rounded-md border p-4 text-center hover:bg-muted"
                >
                  <Icone className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => setEtapa("tipo")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <DialogTitle>Nova conta — {opcaoEscolhida.label}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <CamposConta form={form} setForm={setForm} ehCartao={tipo === "CARTAO_CREDITO"} />
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <DialogFooter>
                <Button type="submit" disabled={carregando}>
                  {carregando ? "Criando..." : "Criar conta"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditarContaConteudo({ conta, onCancelar, onEditada }) {
  const [form, setForm] = useState({
    nome: conta.nome,
    diaFechamento: conta.diaFechamento ?? "",
    diaVencimento: conta.diaVencimento ?? "",
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const bloqueada = conta._count.transacoes > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await editarConta(conta.id, { ...form, tipo: conta.tipo });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    onEditada();
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">Tipo: {TIPO_CONTA_LABELS[conta.tipo]}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CamposConta
          form={form}
          setForm={setForm}
          ehCartao={conta.tipo === "CARTAO_CREDITO"}
          bloqueada={bloqueada}
        />
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function EditarContaDialog({ conta, onOpenChange, onEditada }) {
  return (
    <Dialog open={conta !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar conta</DialogTitle>
        </DialogHeader>
        {conta && (
          <EditarContaConteudo
            key={conta.id}
            conta={conta}
            onCancelar={() => onOpenChange(false)}
            onEditada={onEditada}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SecaoContas({ titulo, Icone, contas, ehCartao, onEditar, onApagar }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icone className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada neste tipo.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {contas.map((conta) => (
              <div key={conta.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{conta.nome}</p>
                  {ehCartao && (
                    <p className="text-xs text-muted-foreground">
                      Fechamento dia {conta.diaFechamento} · Vencimento dia {conta.diaVencimento}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditar(conta)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onApagar(conta)}>
                    Apagar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ContasClient({ contas }) {
  const router = useRouter();
  const [novaContaAberta, setNovaContaAberta] = useState(false);
  const [contaEditando, setContaEditando] = useState(null);

  async function handleApagar(conta) {
    if (!window.confirm(`Apagar a conta "${conta.nome}"?`)) {
      return;
    }

    const resultado = await apagarConta(conta.id);

    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }

    router.refresh();
  }

  const contasCorrente = contas.filter((c) => c.tipo === "CONTA_CORRENTE");
  const contasCartao = contas.filter((c) => c.tipo === "CARTAO_CREDITO");
  const contasInvestimento = contas.filter((c) => c.tipo === "CONTA_INVESTIMENTO");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setNovaContaAberta(true)}>
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      <SecaoContas
        titulo="Contas correntes"
        Icone={TIPO_CONTA_ICONES.CONTA_CORRENTE}
        contas={contasCorrente}
        onEditar={setContaEditando}
        onApagar={handleApagar}
      />
      <SecaoContas
        titulo="Cartões de crédito"
        Icone={TIPO_CONTA_ICONES.CARTAO_CREDITO}
        contas={contasCartao}
        ehCartao
        onEditar={setContaEditando}
        onApagar={handleApagar}
      />
      <SecaoContas
        titulo="Contas de investimento"
        Icone={TIPO_CONTA_ICONES.CONTA_INVESTIMENTO}
        contas={contasInvestimento}
        onEditar={setContaEditando}
        onApagar={handleApagar}
      />

      <NovaContaDialog
        aberto={novaContaAberta}
        onOpenChange={setNovaContaAberta}
        onCriada={() => router.refresh()}
      />

      <EditarContaDialog
        conta={contaEditando}
        onOpenChange={(open) => !open && setContaEditando(null)}
        onEditada={() => {
          setContaEditando(null);
          router.refresh();
        }}
      />
    </div>
  );
}
