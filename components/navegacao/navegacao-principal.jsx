"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  SlidersHorizontal,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuUsuario } from "@/components/navegacao/menu-usuario";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Design §15.1 — dois grupos semânticos, cinco destinos.
const GRUPO_DADOS = [
  { href: "/visao-mensal", label: "Visão mensal", Icone: LayoutDashboard },
  { href: "/transacoes", label: "Transações", Icone: ArrowLeftRight },
  { href: "/projecao", label: "Projeção", Icone: TrendingUp },
];

const GRUPO_AJUSTES = [
  { href: "/contas", label: "Contas", Icone: Wallet },
  { href: "/valores-padrao", label: "Valores padrão", Icone: SlidersHorizontal },
];

function classeLinkSidebar(ativo) {
  return cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
    ativo ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

function LinkSidebar({ href, label, Icone, ativo }) {
  return (
    <Link href={href} className={classeLinkSidebar(ativo)}>
      <Icone className="h-4 w-4" />
      {label}
    </Link>
  );
}

function BarraLateralDesktop({ pathname }) {
  return (
    <aside className="hidden flex-col gap-6 border-r bg-background p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56">
      <Link
        href="/lancamento"
        className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Nova transação
      </Link>

      {/* Design §15.2 — os cinco destinos simultâneos, divisor entre grupos,
          sem rótulos de grupo (o agrupamento é só visual). */}
      <nav className="flex flex-col gap-1">
        {GRUPO_DADOS.map((d) => (
          <LinkSidebar key={d.href} {...d} ativo={pathname.startsWith(d.href)} />
        ))}
        <div className="my-2 border-t" aria-hidden="true" />
        {GRUPO_AJUSTES.map((d) => (
          <LinkSidebar key={d.href} {...d} ativo={pathname.startsWith(d.href)} />
        ))}
      </nav>

      <div className="mt-auto">
        <MenuUsuario />
      </div>
    </aside>
  );
}

// Design §15.3 — três alvos: Dados (esquerda), Nova (centro, destaque),
// Ajustes (direita, abre um Sheet inferior com os dois destinos do grupo).
function BarraInferiorMobile({ pathname }) {
  const [ajustesAberto, setAjustesAberto] = useState(false);

  const ativoDados = GRUPO_DADOS.some((d) => pathname.startsWith(d.href));
  const ativoAjustes = GRUPO_AJUSTES.some((d) => pathname.startsWith(d.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t bg-background md:hidden">
      <Link
        href="/visao-mensal"
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
          ativoDados ? "text-primary" : "text-muted-foreground"
        )}
      >
        <LayoutDashboard className="h-5 w-5" />
        Dados
      </Link>

      <Link
        href="/lancamento"
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-primary"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Plus className="h-5 w-5 text-primary-foreground" />
        </span>
        Nova
      </Link>

      <Sheet open={ajustesAberto} onOpenChange={setAjustesAberto}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
              ativoAjustes ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            Ajustes
          </button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Ajustes</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            {GRUPO_AJUSTES.map(({ href, label, Icone }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setAjustesAberto(false)}
                className={classeLinkSidebar(pathname.startsWith(href))}
              >
                <Icone className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

export function NavegacaoPrincipal() {
  const pathname = usePathname();

  return (
    <>
      <BarraLateralDesktop pathname={pathname} />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-end border-b bg-background px-4 py-2 md:hidden">
        <MenuUsuario align="end" />
      </header>

      <BarraInferiorMobile pathname={pathname} />
    </>
  );
}
