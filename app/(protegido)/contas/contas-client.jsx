"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarConta, editarConta, apagarConta } from "@/lib/actions/contas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIPO_LABELS = {
  CONTA_CORRENTE: "Conta corrente",
  CARTAO_CREDITO: "Cartão de crédito",
  CONTA_INVESTIMENTO: "Conta de investimento",
};

const FORM_INICIAL = {
  nome: "",
  tipo: "CONTA_CORRENTE",
  diaFechamento: "",
  diaVencimento: "",
};

export function ContasClient({ contas }) {
  const router = useRouter();
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const ehCartao = form.tipo === "CARTAO_CREDITO";

  function iniciarEdicao(conta) {
    setEditandoId(conta.id);
    setForm({
      nome: conta.nome,
      tipo: conta.tipo,
      diaFechamento: conta.diaFechamento ?? "",
      diaVencimento: conta.diaVencimento ?? "",
    });
    setErro("");
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = editandoId
      ? await editarConta(editandoId, form)
      : await criarConta(form);

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setEditandoId(null);
    setForm(FORM_INICIAL);
    router.refresh();
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

    if (editandoId === conta.id) {
      cancelarEdicao();
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{editandoId ? "Editar conta" : "Nova conta"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(tipo) => setForm({ ...form, tipo })}
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

            {ehCartao && (
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="diaFechamento">Dia de fechamento</Label>
                  <Input
                    id="diaFechamento"
                    type="number"
                    min={1}
                    max={31}
                    required
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
                    value={form.diaVencimento}
                    onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                  />
                </div>
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={carregando}>
                {carregando ? "Salvando..." : editandoId ? "Salvar" : "Adicionar"}
              </Button>
              {editandoId && (
                <Button type="button" variant="outline" onClick={cancelarEdicao}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {contas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>{conta.nome}</TableCell>
                    <TableCell>{TIPO_LABELS[conta.tipo]}</TableCell>
                    <TableCell>{conta.diaFechamento ?? "—"}</TableCell>
                    <TableCell>{conta.diaVencimento ?? "—"}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => iniciarEdicao(conta)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleApagar(conta)}>
                        Apagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
