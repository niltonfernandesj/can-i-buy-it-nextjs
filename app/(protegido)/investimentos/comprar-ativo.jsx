"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarAtivo } from "@/lib/actions/investimentos";
import { formatarReais } from "@/lib/moeda";
import {
  ROTULO_ESTRATEGIA,
  ROTULO_PRODUTO,
  ROTULO_INDEXADOR,
  DICA_TAXA,
  INDEXADORES_POR_ESTRATEGIA,
} from "@/lib/ativos";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FORM_INICIAL = {
  estrategia: "POS_FIXADO",
  produto: "CDB",
  emissor: "",
  indexador: "PERCENTUAL_CDI",
  taxa: "",
  dataAquisicao: hojeISO(),
  vencimento: "",
  valorCentavos: 0,
};

// Chips de um clique, mesmo padrão de /lancamento (Design §8.2.4).
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

export function ComprarAtivo({ conta }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Trocar a estratégia pode invalidar o indexador escolhido — cai no primeiro
  // da estratégia nova em vez de deixar uma combinação que a action recusaria.
  function selecionarEstrategia(estrategia) {
    const permitidos = INDEXADORES_POR_ESTRATEGIA[estrategia];
    setForm((f) => ({
      ...f,
      estrategia,
      indexador: permitidos.includes(f.indexador) ? f.indexador : permitidos[0],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await criarAtivo({
      contaId: conta.id,
      estrategia: form.estrategia,
      produto: form.produto,
      emissor: form.emissor,
      indexador: form.indexador,
      taxa: form.taxa.replace(",", "."),
      dataAquisicao: form.dataAquisicao,
      vencimento: form.vencimento,
      valorAquisicao: form.valorCentavos / 100,
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

  const indexadores = INDEXADORES_POR_ESTRATEGIA[form.estrategia];

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">Comprar ativo</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprar ativo em {conta.nome}</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Estratégia</Label>
            <Chips
              opcoes={Object.entries(ROTULO_ESTRATEGIA).map(([valor, rotulo]) => ({ valor, rotulo }))}
              valorAtual={form.estrategia}
              onSelecionar={selecionarEstrategia}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-produto">Produto</Label>
              <Select
                value={form.produto}
                onValueChange={(produto) => setForm({ ...form, produto })}
              >
                <SelectTrigger id="ativo-produto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROTULO_PRODUTO).map(([valor, rotulo]) => (
                    <SelectItem key={valor} value={valor}>
                      {rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-emissor">Emissor</Label>
              <Input
                id="ativo-emissor"
                required
                value={form.emissor}
                onChange={(e) => setForm({ ...form, emissor: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-indexador">Indexador</Label>
              {/* Restrito pela estratégia (Requisitos §3.13.2) — a lista muda
                  junto, em vez de oferecer combinação que a action recusa. */}
              <Select
                value={form.indexador}
                onValueChange={(indexador) => setForm({ ...form, indexador })}
              >
                <SelectTrigger id="ativo-indexador">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {indexadores.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {ROTULO_INDEXADOR[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-taxa">Taxa</Label>
              <Input
                id="ativo-taxa"
                required
                inputMode="decimal"
                value={form.taxa}
                onChange={(e) => setForm({ ...form, taxa: e.target.value })}
              />
              {/* O número muda de sentido com o indexador — 110 é fração em
                  "% do CDI" e spread em "CDI +". */}
              <span className="text-xs text-muted-foreground">{DICA_TAXA[form.indexador]}</span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-aquisicao">Data de aquisição</Label>
              <Input
                id="ativo-aquisicao"
                type="date"
                required
                value={form.dataAquisicao}
                onChange={(e) => setForm({ ...form, dataAquisicao: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ativo-vencimento">Vencimento</Label>
              <Input
                id="ativo-vencimento"
                type="date"
                required
                value={form.vencimento}
                onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <CampoValor
              id="ativo-valor"
              label="Valor de aquisição"
              valorCentavos={form.valorCentavos}
              onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
            />
            <span className="text-xs text-muted-foreground">
              Disponível em conta: {formatarReais(conta.emConta)}
            </span>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={carregando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? "Comprando..." : "Comprar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
