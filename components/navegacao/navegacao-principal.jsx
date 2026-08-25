"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  PiggyBank,
  Wallet,
  SlidersHorizontal,
  Settings,
  Tags,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuUsuario } from "@/components/navegacao/menu-usuario";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Design §15.1 e §20.5 — dois grupos semânticos, sete destinos (Categorias
// entrou em Ajustes na Task 91; Investimentos, no M29).
//
// `label` é o rótulo do desktop e `labelCurto`, o do mobile. Os dois campos
// existem sempre, mesmo quando repetem o mesmo texto: uma tabela onde só
// alguns itens têm o campo curto obriga a lembrar do fallback em cada uso.
// Só "Visão mensal" e "Investimentos" divergem — com quatro abas dividindo
// 390px por igual, são os únicos rótulos que não cabem inteiros.
export const GRUPO_DADOS = [
  { href: "/visao-mensal", label: "Visão mensal", labelCurto: "Mês", Icone: LayoutDashboard },
  { href: "/transacoes", label: "Transações", labelCurto: "Transações", Icone: ArrowLeftRight },
  { href: "/projecao", label: "Projeção", labelCurto: "Projeção", Icone: TrendingUp },
  { href: "/investimentos", label: "Investimentos", labelCurto: "Investir", Icone: PiggyBank },
];

// Ajustes não tem abas no mobile (abre num Sheet, §15.3), então aqui não há
// rótulo curto — o Sheet tem largura de sobra.
const GRUPO_AJUSTES = [
  { href: "/contas", label: "Contas", Icone: Wallet },
  { href: "/categorias", label: "Categorias", Icone: Tags },
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

      {/* Design §15.2 — os seis destinos simultâneos, divisor entre grupos,
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
// Ajustes (direita, abre um Sheet inferior com os três destinos do grupo).
function BarraInferiorMobile({ pathname }) {
  const [ajustesAberto, setAjustesAberto] = useState(false);

  const ativoDados = GRUPO_DADOS.some((d) => pathname.startsWith(d.href));
  const ativoAjustes = GRUPO_AJUSTES.some((d) => pathname.startsWith(d.href));

  return (
    <nav
      // Instalado, o app vai até a borda da tela: sem o inset inferior a barra
      // fica sob o indicador de home, bem onde estão os alvos mais tocados
      // ("Dados", "Nova", "Ajustes"). Os insets laterais protegem o modo
      // paisagem, onde o notch invade a lateral (Design §19.4).
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden"
    >
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

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-end border-b bg-background px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:hidden">
        <MenuUsuario align="end" />
      </header>

      <BarraInferiorMobile pathname={pathname} />
    </>
  );
}
