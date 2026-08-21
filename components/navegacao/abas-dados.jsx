"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Mesmas três rotas do grupo Dados (Design §15.1), na mesma ordem da barra
// lateral do desktop.
const ABAS = [
  { href: "/visao-geral", label: "Visão geral" },
  { href: "/transacoes", label: "Transações" },
  { href: "/projecao", label: "Projeção" },
];

export function AbasDados() {
  const pathname = usePathname();
  const dentroDoGrupoDados = ABAS.some((aba) => pathname.startsWith(aba.href));

  if (!dentroDoGrupoDados) return null;

  return (
    <nav className="flex border-b bg-background md:hidden">
      {ABAS.map(({ href, label }) => {
        const ativo = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 border-b-2 px-2 py-3 text-center text-sm font-medium",
              ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
