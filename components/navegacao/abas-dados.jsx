"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GRUPO_DADOS } from "@/components/navegacao/navegacao-principal";

// As abas são as próprias rotas do grupo Dados, na mesma ordem da barra
// lateral (Design §15.1 e §20.5) — importadas de lá em vez de repetidas aqui,
// que era a forma anterior e já tinha duas listas para manter em sincronia.
const ABAS = GRUPO_DADOS;

export function AbasDados() {
  const pathname = usePathname();
  const dentroDoGrupoDados = ABAS.some((aba) => pathname.startsWith(aba.href));

  if (!dentroDoGrupoDados) return null;

  return (
    <nav className="flex border-b bg-background md:hidden">
      {ABAS.map(({ href, labelCurto, Icone }) => {
        const ativo = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // min-w-0 e truncate pelo mesmo motivo do toggle de Tipo em
            // /lancamento (Design §8.2.4): itens flex não encolhem abaixo do
            // próprio conteúdo por padrão, e com quatro abas a mais larga
            // empurraria as outras. O ícone carrega o reconhecimento; o
            // rótulo curto confirma.
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 border-b-2 px-1 py-2",
              ativo ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            )}
          >
            <Icone className="h-[1.15rem] w-[1.15rem] shrink-0" />
            <span className="max-w-full truncate text-[11px] font-medium">{labelCurto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
