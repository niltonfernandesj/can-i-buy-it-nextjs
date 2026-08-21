"use client";

import { formatarReais } from "@/lib/moeda";
import { MESES } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const ALTURA_BARRA_PX = 80;

function GraficoDisponivel({ meses }) {
  const maiorAbsoluto = Math.max(1, ...meses.map((m) => Math.abs(m.disponivel)));

  function alturaPx(valor) {
    return Math.max(2, Math.round((Math.abs(valor) / maiorAbsoluto) * ALTURA_BARRA_PX));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-end gap-1" style={{ height: ALTURA_BARRA_PX }}>
          {meses.map((m) => (
            <div
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex flex-1 items-end justify-center"
              title={`${MESES[m.mesReferencia - 1]}/${m.anoReferencia}: ${formatarReais(m.disponivel)}`}
            >
              {m.disponivel >= 0 && (
                <div
                  className="w-full rounded-t bg-entrada"
                  style={{ height: alturaPx(m.disponivel) }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="border-t" />
        <div className="flex items-start gap-1" style={{ height: ALTURA_BARRA_PX }}>
          {meses.map((m) => (
            <div
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex flex-1 items-start justify-center"
            >
              {m.disponivel < 0 && (
                <div
                  className="w-full rounded-b bg-destructive"
                  style={{ height: alturaPx(m.disponivel) }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {meses.map((m) => (
            <span
              key={`${m.mesReferencia}-${m.anoReferencia}`}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {MESES[m.mesReferencia - 1].slice(0, 3)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Reutiliza a mesma linguagem visual da Visão geral (Design §16.2): valor
// composto em destaque, subtexto "R$X real + R$Y estimado" quando há parte
// estimada.
function ValorComposto({ real, estimado, total }) {
  return (
    <div>
      <p className="font-medium">{formatarReais(total)}</p>
      {estimado > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatarReais(real)} real + <span className="text-estimado">{formatarReais(estimado)} estimado</span>
        </p>
      )}
    </div>
  );
}

function LinhaMes({ mes }) {
  const saidas = {
    real: mes.debito.real + mes.credito.real,
    estimado: mes.debito.estimado + mes.credito.estimado,
    total: mes.debito.total + mes.credito.total,
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="font-semibold md:w-32">
          {MESES[mes.mesReferencia - 1]} {mes.anoReferencia}
        </p>
        <div className="grid grid-cols-1 gap-3 text-sm md:flex-1 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Entradas</p>
            <ValorComposto {...mes.entradas} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saídas</p>
            <ValorComposto {...saidas} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponível</p>
            <p className={cn("font-medium", mes.disponivel < 0 && "text-destructive")}>
              {formatarReais(mes.disponivel)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjecaoClient({ meses }) {
  return (
    <div className="flex flex-col gap-6">
      <GraficoDisponivel meses={meses} />

      <div className="flex flex-col gap-3">
        {meses.map((mes) => (
          <LinhaMes key={`${mes.mesReferencia}-${mes.anoReferencia}`} mes={mes} />
        ))}
      </div>
    </div>
  );
}
