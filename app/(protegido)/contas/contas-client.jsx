"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { criarConta, editarConta, apagarConta } from "@/lib/actions/contas";
import { TIPO_CONTA_ICONES } from "@/lib/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// Formulário inline de conta — cria (contaInicial ausente) ou edita
// (contaInicial presente), mesmo padrão de FormularioInline já usado em
// Valores padrão. Substitui NovaContaDialog/EditarContaDialog (Task 75):
// sem mais wizard de 2 etapas nem Dialog — o tipo já vem da seção onde o
// "+" foi clicado, e editar troca a linha por este formulário no lugar.
function FormularioContaInline({ tipo, contaInicial, onCancelar, onSalvar }) {
  const [form, setForm] = useState({
    nome: contaInicial?.nome ?? "",
    diaFechamento: contaInicial?.diaFechamento ?? "",
    diaVencimento: contaInicial?.diaVencimento ?? "",
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const bloqueada = (contaInicial?._count?.transacoes ?? 0) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await onSalvar({ ...form, tipo });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-dashed py-3 first:border-t-0 first:pt-0"
    >
      <CamposConta
        form={form}
        setForm={setForm}
        ehCartao={tipo === "CARTAO_CREDITO"}
        bloqueada={bloqueada}
      />
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={carregando}>
          {carregando
            ? "Salvando..."
            : contaInicial
              ? "Salvar"
              : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}

function LinhaConta({ conta, ehCartao, onEditar, onApagar }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <div>
        <p className="font-medium">{conta.nome}</p>
        {ehCartao && (
          <p className="text-xs text-muted-foreground">
            Fechamento dia {conta.diaFechamento} · Vencimento dia {conta.diaVencimento}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEditar(conta.id)}
          aria-label={`Editar ${conta.nome}`}
          title="Editar"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onApagar(conta)}
          aria-label={`Apagar ${conta.nome}`}
          title="Apagar"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SecaoContas({
  titulo,
  Icone,
  tipo,
  contas,
  ehCartao,
  editandoId,
  criando,
  onEditar,
  onCancelarEdicao,
  onApagar,
  onIniciarCriacao,
  onCancelarCriacao,
  onCriar,
  onEditarSalvar,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icone className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </CardTitle>
        <button
          type="button"
          onClick={onIniciarCriacao}
          disabled={criando}
          aria-label={`Nova conta em ${titulo.toLowerCase()}`}
          title="Nova conta"
          className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent>
        {contas.length === 0 && !criando && (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada neste tipo.</p>
        )}

        <div className="flex flex-col divide-y divide-border">
          {criando && (
            <FormularioContaInline tipo={tipo} onCancelar={onCancelarCriacao} onSalvar={onCriar} />
          )}

          {contas.map((conta) =>
            editandoId === conta.id ? (
              <FormularioContaInline
                key={conta.id}
                tipo={tipo}
                contaInicial={conta}
                onCancelar={onCancelarEdicao}
                onSalvar={(dados) => onEditarSalvar(conta.id, dados)}
              />
            ) : (
              <LinhaConta
                key={conta.id}
                conta={conta}
                ehCartao={ehCartao}
                onEditar={onEditar}
                onApagar={onApagar}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ContasClient({ contas }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState(null);
  const [criandoTipo, setCriandoTipo] = useState(null);

  async function handleCriar(dados) {
    const resultado = await criarConta(dados);
    if (!resultado?.error) {
      setCriandoTipo(null);
      router.refresh();
    }
    return resultado;
  }

  async function handleEditarSalvar(id, dados) {
    const resultado = await editarConta(id, dados);
    if (!resultado?.error) {
      setEditandoId(null);
      router.refresh();
    }
    return resultado;
  }

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
      <SecaoContas
        titulo="Contas correntes"
        Icone={TIPO_CONTA_ICONES.CONTA_CORRENTE}
        tipo="CONTA_CORRENTE"
        contas={contasCorrente}
        editandoId={editandoId}
        criando={criandoTipo === "CONTA_CORRENTE"}
        onEditar={setEditandoId}
        onCancelarEdicao={() => setEditandoId(null)}
        onApagar={handleApagar}
        onIniciarCriacao={() => setCriandoTipo("CONTA_CORRENTE")}
        onCancelarCriacao={() => setCriandoTipo(null)}
        onCriar={handleCriar}
        onEditarSalvar={handleEditarSalvar}
      />
      <SecaoContas
        titulo="Cartões de crédito"
        Icone={TIPO_CONTA_ICONES.CARTAO_CREDITO}
        tipo="CARTAO_CREDITO"
        contas={contasCartao}
        ehCartao
        editandoId={editandoId}
        criando={criandoTipo === "CARTAO_CREDITO"}
        onEditar={setEditandoId}
        onCancelarEdicao={() => setEditandoId(null)}
        onApagar={handleApagar}
        onIniciarCriacao={() => setCriandoTipo("CARTAO_CREDITO")}
        onCancelarCriacao={() => setCriandoTipo(null)}
        onCriar={handleCriar}
        onEditarSalvar={handleEditarSalvar}
      />
      <SecaoContas
        titulo="Contas de investimento"
        Icone={TIPO_CONTA_ICONES.CONTA_INVESTIMENTO}
        tipo="CONTA_INVESTIMENTO"
        contas={contasInvestimento}
        editandoId={editandoId}
        criando={criandoTipo === "CONTA_INVESTIMENTO"}
        onEditar={setEditandoId}
        onCancelarEdicao={() => setEditandoId(null)}
        onApagar={handleApagar}
        onIniciarCriacao={() => setCriandoTipo("CONTA_INVESTIMENTO")}
        onCancelarCriacao={() => setCriandoTipo(null)}
        onCriar={handleCriar}
        onEditarSalvar={handleEditarSalvar}
      />
    </div>
  );
}
