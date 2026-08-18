"use client";

import { useState } from "react";
import { formatarReais } from "@/lib/moeda";
import { CATEGORIA_LABELS } from "@/lib/categorias";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function formatarDia(data) {
  const d = new Date(data);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function LinhaResumoDia({ dia, total }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{formatarDia(dia)}</span>
      <span className="font-medium">{formatarReais(total)}</span>
    </div>
  );
}

function ListaTransacoes({ transacoes, total, renderTag }) {
  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {transacoes.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{t.descricao}</span>
            {renderTag?.(t)}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {CATEGORIA_LABELS[t.categoria] ?? t.categoria}
            </span>
            <span>{formatarReais(t.valor)}</span>
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
        <span>Total do dia</span>
        <span>{formatarReais(total)}</span>
      </div>
    </div>
  );
}

export function DetalheDiario({ dia, transacoes, total, renderTag }) {
  const [abertoDesktop, setAbertoDesktop] = useState(false);

  return (
    <div>
      <div className="hidden md:block">
        <Popover open={abertoDesktop} onOpenChange={setAbertoDesktop}>
          <PopoverTrigger asChild>
            <div
              onMouseEnter={() => setAbertoDesktop(true)}
              onMouseLeave={() => setAbertoDesktop(false)}
              className="-mx-1 rounded-md px-1 py-0.5"
            >
              <LinhaResumoDia dia={dia} total={total} />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-80"
            onMouseEnter={() => setAbertoDesktop(true)}
            onMouseLeave={() => setAbertoDesktop(false)}
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">{formatarDia(dia)}</p>
            <ListaTransacoes transacoes={transacoes} total={total} renderTag={renderTag} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="w-full text-left">
              <LinhaResumoDia dia={dia} total={total} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{formatarDia(dia)}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ListaTransacoes transacoes={transacoes} total={total} renderTag={renderTag} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
