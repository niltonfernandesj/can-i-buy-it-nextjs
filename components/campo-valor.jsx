"use client";

import { formatarCentavosParaReais } from "@/lib/moeda";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CampoValor({ id, label, valorCentavos, onChange, className = "", ariaLabel }) {
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

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        required
        aria-label={label ? undefined : ariaLabel}
        value={formatarCentavosParaReais(valorCentavos)}
        onKeyDown={handleKeyDown}
        onPaste={(e) => e.preventDefault()}
        onChange={() => {}}
      />
    </div>
  );
}
