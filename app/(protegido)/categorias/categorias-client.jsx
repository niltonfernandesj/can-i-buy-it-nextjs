"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import {
  criarCategoria,
  editarCategoria,
  alternarAtivaCategoria,
  apagarCategoria,
} from "@/lib/actions/categorias";
import { PALETA_CATEGORIAS, CLASSE_COR_CATEGORIA } from "@/lib/categorias";
import { MarcadorCor } from "@/components/marcador-categoria";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SeletorCor({ valor, onSelecionar }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETA_CATEGORIAS.map(({ slug, rotulo }) => (
        <button
          key={slug}
          type="button"
          onClick={() => onSelecionar(slug)}
          aria-label={rotulo}
          aria-pressed={valor === slug}
          title={rotulo}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
            valor === slug ? "border-foreground" : "border-transparent hover:border-input"
          )}
        >
          <span className={cn("h-4 w-4 rounded-full", CLASSE_COR_CATEGORIA[slug])} />
        </button>
      ))}
    </div>
  );
}

function FormularioCategoriaInline({ categoriaInicial, onCancelar, onSalvar }) {
  const [form, setForm] = useState({
    nome: categoriaInicial?.nome ?? "",
    cor: categoriaInicial?.cor ?? PALETA_CATEGORIAS[0].slug,
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await onSalvar(form);

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-dashed py-3 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome-categoria">Nome</Label>
        <Input
          id="nome-categoria"
          required
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        <SeletorCor valor={form.cor} onSelecionar={(cor) => setForm({ ...form, cor })} />
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={carregando}>
          {carregando ? "Salvando..." : categoriaInicial ? "Salvar" : "Criar categoria"}
        </Button>
      </div>
    </form>
  );
}

function LinhaCategoria({ categoria, onEditar, onAlternarAtiva, onApagar }) {
  const usos = categoria._count.transacoes + categoria._count.valoresPadrao;

  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <MarcadorCor cor={categoria.cor} />
        <div className="min-w-0">
          <p className={cn("truncate font-medium", !categoria.ativa && "text-muted-foreground")}>
            {categoria.nome}
            {!categoria.ativa && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                Inativa
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {usos === 0 ? "Sem uso" : `${usos} ${usos === 1 ? "uso" : "usos"}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onAlternarAtiva(categoria)}
          aria-label={`${categoria.ativa ? "Desativar" : "Reativar"} ${categoria.nome}`}
          title={categoria.ativa ? "Desativar" : "Reativar"}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {categoria.ativa ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onEditar(categoria.id)}
          aria-label={`Editar ${categoria.nome}`}
          title="Editar"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onApagar(categoria)}
          aria-label={`Apagar ${categoria.nome}`}
          title="Apagar"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CategoriasClient({ categorias }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState(null);
  const [criando, setCriando] = useState(false);

  async function handleCriar(dados) {
    const resultado = await criarCategoria(dados);
    if (!resultado?.error) {
      setCriando(false);
      router.refresh();
    }
    return resultado;
  }

  async function handleEditarSalvar(id, dados) {
    const resultado = await editarCategoria(id, dados);
    if (!resultado?.error) {
      setEditandoId(null);
      router.refresh();
    }
    return resultado;
  }

  async function handleAlternarAtiva(categoria) {
    const resultado = await alternarAtivaCategoria(categoria.id, !categoria.ativa);
    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }
    router.refresh();
  }

  async function handleApagar(categoria) {
    if (!window.confirm(`Apagar a categoria "${categoria.nome}"?`)) {
      return;
    }

    const resultado = await apagarCategoria(categoria.id);

    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Todas as categorias</CardTitle>
        <button
          type="button"
          onClick={() => setCriando(true)}
          disabled={criando}
          aria-label="Nova categoria"
          title="Nova categoria"
          className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 && !criando && (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
        )}

        <div className="flex flex-col divide-y divide-border">
          {criando && (
            <FormularioCategoriaInline
              onCancelar={() => setCriando(false)}
              onSalvar={handleCriar}
            />
          )}

          {categorias.map((categoria) =>
            editandoId === categoria.id ? (
              <FormularioCategoriaInline
                key={categoria.id}
                categoriaInicial={categoria}
                onCancelar={() => setEditandoId(null)}
                onSalvar={(dados) => handleEditarSalvar(categoria.id, dados)}
              />
            ) : (
              <LinhaCategoria
                key={categoria.id}
                categoria={categoria}
                onEditar={setEditandoId}
                onAlternarAtiva={handleAlternarAtiva}
                onApagar={handleApagar}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
