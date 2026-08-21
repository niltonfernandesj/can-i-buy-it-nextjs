"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import {
  criarValorPadrao,
  editarValorPadrao,
  apagarValorPadrao,
} from "@/lib/actions/valores-padrao";
import { formatarReais } from "@/lib/moeda";
import { CampoValor } from "@/components/campo-valor";
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

const MEIO_LABELS = { CREDITO: "Crédito", DEBITO: "Débito" };

const FORM_INICIAL = { descricao: "", valorCentavos: 0, meio: "DEBITO" };

function FormularioInline({ tipo, valorInicial, onCancelar, onSalvar }) {
  const [form, setForm] = useState(valorInicial ?? FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const ehDespesa = tipo === "SAIDA";

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await onSalvar({
      descricao: form.descricao,
      valor: form.valorCentavos / 100,
      tipo,
      meio: ehDespesa ? form.meio : null,
    });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`descricao-${tipo}`}>Descrição</Label>
          <Input
            id={`descricao-${tipo}`}
            required
            autoFocus
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <CampoValor
          id={`valor-${tipo}`}
          label="Valor"
          className="sm:w-40"
          valorCentavos={form.valorCentavos}
          onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
        />
        {ehDespesa && (
          <div className="flex flex-col gap-2 sm:w-36">
            <Label htmlFor={`meio-${tipo}`}>Meio</Label>
            <Select value={form.meio} onValueChange={(meio) => setForm({ ...form, meio })}>
              <SelectTrigger id={`meio-${tipo}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBITO">Débito</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function LinhaValorPadrao({ item, ehDespesa, onEditar, onApagar }) {
  return (
    <div className="flex items-center justify-between border-t border-dashed py-3 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium">{item.descricao}</p>
        <p className="text-xs text-muted-foreground">
          {formatarReais(item.valor)}
          {ehDespesa && ` · ${MEIO_LABELS[item.meio]}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEditar(item.id)}>
          Editar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onApagar(item)}>
          Apagar
        </Button>
      </div>
    </div>
  );
}

function ListaValoresPadrao({
  titulo,
  Icone,
  tipo,
  itens,
  editandoId,
  adicionando,
  onEditar,
  onCancelarEdicao,
  onApagar,
  onIniciarAdicao,
  onCancelarAdicao,
  onCriar,
  onEditarSalvar,
}) {
  const ehDespesa = tipo === "SAIDA";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icone className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {itens.length === 0 && !adicionando && (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
        )}

        <div className="flex flex-col">
          {itens.map((item) =>
            editandoId === item.id ? (
              <FormularioInline
                key={item.id}
                tipo={tipo}
                valorInicial={{
                  descricao: item.descricao,
                  valorCentavos: Math.round(item.valor * 100),
                  meio: item.meio ?? "DEBITO",
                }}
                onCancelar={onCancelarEdicao}
                onSalvar={(dados) => onEditarSalvar(item.id, dados)}
              />
            ) : (
              <LinhaValorPadrao
                key={item.id}
                item={item}
                ehDespesa={ehDespesa}
                onEditar={onEditar}
                onApagar={onApagar}
              />
            )
          )}

          {adicionando && (
            <FormularioInline tipo={tipo} onCancelar={onCancelarAdicao} onSalvar={onCriar} />
          )}
        </div>

        {!adicionando && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onIniciarAdicao}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ValoresPadraoClient({ valoresPadrao }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState(null);
  const [adicionandoTipo, setAdicionandoTipo] = useState(null);

  const receitas = valoresPadrao.filter((v) => v.tipo === "ENTRADA");
  const despesas = valoresPadrao.filter((v) => v.tipo === "SAIDA");

  async function handleCriar(dados) {
    const resultado = await criarValorPadrao(dados);
    if (!resultado?.error) {
      setAdicionandoTipo(null);
      router.refresh();
    }
    return resultado;
  }

  async function handleEditarSalvar(id, dados) {
    const resultado = await editarValorPadrao(id, dados);
    if (!resultado?.error) {
      setEditandoId(null);
      router.refresh();
    }
    return resultado;
  }

  async function handleApagar(item) {
    if (!window.confirm(`Apagar "${item.descricao}"?`)) {
      return;
    }

    const resultado = await apagarValorPadrao(item.id);

    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <ListaValoresPadrao
        titulo="Receitas padrão"
        Icone={TrendingUp}
        tipo="ENTRADA"
        itens={receitas}
        editandoId={editandoId}
        adicionando={adicionandoTipo === "ENTRADA"}
        onEditar={setEditandoId}
        onCancelarEdicao={() => setEditandoId(null)}
        onApagar={handleApagar}
        onIniciarAdicao={() => setAdicionandoTipo("ENTRADA")}
        onCancelarAdicao={() => setAdicionandoTipo(null)}
        onCriar={handleCriar}
        onEditarSalvar={handleEditarSalvar}
      />

      <ListaValoresPadrao
        titulo="Despesas padrão"
        Icone={TrendingDown}
        tipo="SAIDA"
        itens={despesas}
        editandoId={editandoId}
        adicionando={adicionandoTipo === "SAIDA"}
        onEditar={setEditandoId}
        onCancelarEdicao={() => setEditandoId(null)}
        onApagar={handleApagar}
        onIniciarAdicao={() => setAdicionandoTipo("SAIDA")}
        onCancelarAdicao={() => setAdicionandoTipo(null)}
        onCriar={handleCriar}
        onEditarSalvar={handleEditarSalvar}
      />
    </div>
  );
}
