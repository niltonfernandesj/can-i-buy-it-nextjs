"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Wallet, SlidersHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuUsuario } from "@/components/navegacao/menu-usuario";

// Links temporários (Task 58/62) até a navegação agrupada definitiva do M17
// (Design §15) substituir esta lista.
const DESTINOS = [
  { href: "/visao-geral", label: "Visão geral", Icone: LayoutDashboard },
  { href: "/transacoes", label: "Transações", Icone: ArrowLeftRight },
  { href: "/contas", label: "Contas", Icone: Wallet },
  { href: "/valores-padrao", label: "Valores padrão", Icone: SlidersHorizontal },
];

export function NavegacaoPrincipal() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden flex-col gap-6 border-r bg-background p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56">
        <Link
          href="/lancamento"
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova transação
        </Link>
        <nav className="flex flex-col gap-1">
          {DESTINOS.map(({ href, label, Icone }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  ativo
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icone className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <MenuUsuario />
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-end border-b bg-background px-4 py-2 md:hidden">
        <MenuUsuario align="end" />
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t bg-background md:hidden">
        {DESTINOS.map(({ href, label, Icone }) => {
          const ativo = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                ativo ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icone className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <Link
          href="/lancamento"
          className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Plus className="h-5 w-5 text-primary-foreground" />
          </span>
          Nova
        </Link>
      </nav>
    </>
  );
}
