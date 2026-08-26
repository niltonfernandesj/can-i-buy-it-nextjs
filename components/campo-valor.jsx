"use client";

import { forwardRef } from "react";
import { formatarCentavosParaReais } from "@/lib/moeda";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CampoValor = forwardRef(function CampoValor(
  { id, label, valorCentavos, onChange, className = "", ariaLabel, prefixo },
  ref
) {
  // Formata o valor exibido a cada tecla, então a posição do cursor dentro do
  // texto formatado não é confiável para saber "onde" um novo dígito entrou —
  // por isso os dígitos são acumulados numericamente (como uma calculadora,
  // sempre a partir da direita) em vez de reler o texto renderizado do input.
  function handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      onChange(Math.min(valorCentavos * 10 + Number(e.key), Number.MAX_SAFE_INTEGER));
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onChange(Math.floor(valorCentavos / 10));
      return;
    }

    if (!["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(e.key)) {
      e.preventDefault();
    }
  }

  const campo = (
    <Input
      ref={ref}
      id={id}
      type="text"
      inputMode="numeric"
      required
      aria-label={label ? undefined : ariaLabel}
      value={formatarCentavosParaReais(valorCentavos)}
      onKeyDown={handleKeyDown}
      onPaste={(e) => e.preventDefault()}
      onChange={() => {}}
      // Fundido, o input não desenha borda nem anel próprios: quem cuida disso
      // é o contêiner. Sem isto sobra um fio duplo ao lado do divisor, e o anel
      // de foco envolveria só a metade direita, quebrando a costura.
      className={prefixo ? "flex-1 min-w-0 rounded-none border-0 shadow-none focus-visible:ring-0" : undefined}
    />
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      {/* `prefixo` é um controle **fundido** à esquerda do campo — os dois viram
          um retângulo só, de mesma altura (Design §22.1). É irmão flex do input,
          não filho posicionado: assim não há reserva de padding pra calcular, e
          um valor longo nunca colide com o controle. Sem `prefixo`, renderiza
          exatamente como antes. */}
      {prefixo ? (
        <div className="flex h-9 overflow-hidden rounded-md border border-input shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
          {prefixo}
          {campo}
        </div>
      ) : (
        campo
      )}
    </div>
  );
});
