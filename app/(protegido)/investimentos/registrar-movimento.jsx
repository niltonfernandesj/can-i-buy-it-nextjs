"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { registrarMovimento } from "@/lib/actions/investimentos";
import { formatarReais } from "@/lib/moeda";
import { MOTIVOS_POR_NATUREZA, ROTULO_MOTIVO, ROTULO_NATUREZA } from "@/lib/ativos";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FORM_INICIAL = {
  natureza: "CREDITO",
  motivo: "CUPOM",
  data: hojeISO(),
  valorCentavos: 0,
  descricao: "",
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

export function RegistrarMovimento({ conta }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Trocar a natureza pode invalidar o motivo — cai no primeiro da natureza
  // nova em vez de deixar uma combinação que a action recusaria.
  function selecionarNatureza(natureza) {
    const permitidos = MOTIVOS_POR_NATUREZA[natureza];
    setForm((f) => ({
      ...f,
      natureza,
      motivo: permitidos.includes(f.motivo) ? f.motivo : permitidos[0],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await registrarMovimento({
      contaId: conta.id,
      natureza: form.natureza,
      motivo: form.motivo,
      data: form.data,
      valor: form.valorCentavos / 100,
      descricao: form.descricao,
    });

    setCarregando(false);
    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setForm(FORM_INICIAL);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      {/* As duas ações frequentes ficam visíveis; o menu guarda a rara. Cupom
          e taxa acontecem duas vezes por ano por posição — precisam ser
          acháveis, não rápidos de alcançar (Design §20.3). */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" aria-label={`Mais ações em ${conta.nome}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAberto(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Registrar movimento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimento em {conta.nome}</DialogTitle>
          </DialogHeader>

          <form onSubmit={salvar} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Saldo em conta: {formatarReais(conta.emConta)}
            </p>

            <div className="flex flex-col gap-2">
              <Label>Natureza</Label>
              <Chips
                opcoes={Object.entries(ROTULO_NATUREZA).map(([valor, rotulo]) => ({ valor, rotulo }))}
                valorAtual={form.natureza}
                onSelecionar={selecionarNatureza}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Motivo</Label>
              {/* Restrito pela natureza: cupom só entra, taxa e corretagem só
                  saem, ajuste serve aos dois (Requisitos §3.13.3). */}
              <Chips
                opcoes={MOTIVOS_POR_NATUREZA[form.natureza].map((valor) => ({
                  valor,
                  rotulo: ROTULO_MOTIVO[valor],
                }))}
                valorAtual={form.motivo}
                onSelecionar={(motivo) => setForm({ ...form, motivo })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`mov-data-${conta.id}`}>Data</Label>
                <Input
                  id={`mov-data-${conta.id}`}
                  type="date"
                  required
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </div>
              <CampoValor
                id={`mov-valor-${conta.id}`}
                label="Valor"
                valorCentavos={form.valorCentavos}
                onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`mov-descricao-${conta.id}`}>
                Descrição <span className="font-normal text-muted-foreground">— opcional</span>
              </Label>
              <Input
                id={`mov-descricao-${conta.id}`}
                placeholder="Ex.: cupom 1º semestre"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={carregando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={carregando}>
                {carregando ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
