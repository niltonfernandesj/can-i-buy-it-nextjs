"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { liquidarAtivo } from "@/lib/actions/investimentos";
import { formatarReais } from "@/lib/moeda";
import { hojeISO } from "@/lib/datas";
import { formatarDataCurta } from "@/lib/datas";
import { ROTULO_PRODUTO, rotuloIndexador } from "@/lib/ativos";
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

/**
 * `aberto`/`onAbertoMudou` opcionais: como item de menu, o `DropdownMenuItem`
 * fecha o menu ao ser acionado, então o diálogo precisa abrir por estado
 * (Design §26.3). Sem eles, o componente segue exatamente como era — botão e
 * gatilho próprios. Mesmo arranjo de `MovimentarConta`.
 */
export function LiquidarAtivo({ ativo, vencido, aberto: abertoExterno, onAbertoMudou }) {
  const router = useRouter();
  const [interno, setInterno] = useState(false);
  const controlado = abertoExterno !== undefined;
  const aberto = controlado ? abertoExterno : interno;
  const setAberto = controlado ? onAbertoMudou : setInterno;
  const [data, setData] = useState(hojeISO());
  const [valorCentavos, setValorCentavos] = useState(0);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await liquidarAtivo(ativo.id, { data, valor: valorCentavos / 100 });

    setCarregando(false);
    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    setAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      {!controlado && (
        <DialogTrigger asChild>
          {/* Em destaque quando vencido: é a posição que pede ação. As demais
              continuam liquidáveis (venda antecipada), mas discretas. */}
          <Button
            size="sm"
            variant={vencido ? "default" : "ghost"}
            className={
              vencido
                ? "h-7 bg-saida-credito px-2 text-xs text-background hover:bg-saida-credito"
                : "h-7 px-2 text-xs text-muted-foreground"
            }
          >
            Liquidar
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Liquidar {ativo.emissor} · {ROTULO_PRODUTO[ativo.produto]}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {ativo.conta.nome} · {rotuloIndexador(ativo.indexador, ativo.taxa)} · aplicado{" "}
            {formatarReais(ativo.valorAquisicao)} · vence em {formatarDataCurta(ativo.vencimento)}
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`liq-data-${ativo.id}`}>Data da liquidação</Label>
            <Input
              id={`liq-data-${ativo.id}`}
              type="date"
              required
              // Investimento não é agendamento (Requisitos §3.13.5). O `max`
              // é conveniência: a autoridade é a Server Action.
              max={hojeISO()}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <CampoValor
              id={`liq-valor-${ativo.id}`}
              label="Valor recebido"
              valorCentavos={valorCentavos}
              onChange={setValorCentavos}
            />
            {/* O valor é fato, não estimativa: é o que caiu na conta, já
                líquido de IR e IOF. No M30 vem pré-preenchido pelo cálculo. */}
            <span className="text-xs text-muted-foreground">
              O que caiu no saldo em conta, já líquido de IR e IOF.
            </span>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={carregando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? "Liquidando..." : "Liquidar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
