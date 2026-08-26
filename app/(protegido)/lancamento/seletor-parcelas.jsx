"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 2 a 12 na lista; acima disso é raro e cabe no "Outro" (Design §22.2).
const OPCOES = Array.from({ length: 11 }, (_, i) => i + 2);
const MAX_PARCELAS = 99;

/**
 * Seletor de parcelas fundido à esquerda do campo Valor (Requisitos §3.15).
 *
 * `DropdownMenu`, **não `Select`**: o Select do Radix captura o teclado para
 * busca por digitação e trata Esc por conta própria, o que brigaria com o campo
 * numérico de "Outro" — o QA da Task 112 já esbarrou nesse Esc fechando o
 * Dialog inteiro.
 */
export function SeletorParcelas({ numeroParcelas, valorCentavos, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const [modoOutro, setModoOutro] = useState(false);
  const [rascunho, setRascunho] = useState("");

  // "À vista" no lugar de "1x" é o ponto da mudança: nomeia o estado e, por
  // contraste, revela que existe a outra opção.
  const rotulo = numeroParcelas > 1 ? `${numeroParcelas}x` : "À vista";

  // O total da compra naquele número de vezes — responde "em quantas eu ponho?"
  // no instante da decisão. Com valor zero seria "R$ 0,00" onze vezes, então
  // some.
  const totalEm = (n) => (valorCentavos > 0 ? formatarReais((valorCentavos * n) / 100) : null);

  function escolher(n) {
    onMudar(n);
    // Fecha pelo mesmo caminho do onOpenChange: escolher pelo campo "Outro"
    // precisa limpar o modo, senão o menu reabre no campo livre em vez da lista.
    mudarAbertura(false);
  }

  function confirmarOutro() {
    const n = Number(rascunho);
    if (Number.isInteger(n) && n >= 2 && n <= MAX_PARCELAS) {
      escolher(n);
    }
  }

  function mudarAbertura(v) {
    setAberto(v);
    if (!v) {
      setModoOutro(false);
      setRascunho("");
    }
  }

  return (
    <DropdownMenu open={aberto} onOpenChange={mudarAbertura}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Parcelas: ${rotulo}`}
          className={cn(
            "flex flex-none items-center gap-1.5 border-r border-input px-2.5",
            "text-[13px] font-semibold text-foreground transition-colors hover:bg-accent",
          )}
        >
          {rotulo}
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        {modoOutro ? (
          // Troca o conteúdo do menu sem fechá-lo. onSelect não é usado aqui:
          // qualquer item do Radix fecharia o menu ao ser acionado.
          <div className="flex items-center gap-2 p-1.5" onKeyDown={(e) => e.stopPropagation()}>
            <span className="text-[13px]">Parcelas</span>
            <Input
              autoFocus
              type="text"
              inputMode="numeric"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value.replace(/\D/g, "").slice(0, 2))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), confirmarOutro())}
              className="h-8 w-16 tabular-nums"
              aria-label="Número de parcelas"
            />
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={confirmarOutro}>
              OK
            </Button>
          </div>
        ) : (
          <>
            {/* Fora da área rolável: o caminho de volta ao à vista tem de estar
                sempre visível, sem rolagem (Design §22.2). */}
            <DropdownMenuItem onSelect={() => escolher(1)}>À vista</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="max-h-[170px] overflow-y-auto">
              {OPCOES.map((n) => (
                <DropdownMenuItem
                  key={n}
                  onSelect={() => escolher(n)}
                  className={cn("justify-between tabular-nums", n === numeroParcelas && "bg-accent font-semibold")}
                >
                  <span>{n}x</span>
                  {totalEm(n) && <span className="text-[11.5px] text-muted-foreground">{totalEm(n)}</span>}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setRascunho(numeroParcelas > 1 ? String(numeroParcelas) : "");
                setModoOutro(true);
              }}
            >
              Outro…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
