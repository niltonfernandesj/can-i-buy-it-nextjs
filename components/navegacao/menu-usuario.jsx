"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, Users, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MenuUsuario({ align = "start" }) {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <User className="h-4 w-4" />
        {session?.user?.name ?? "Usuário"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {session?.user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session?.user?.ehAdmin && (
          // Link temporário (Task 49) — a entrada definitiva no grupo Ajustes
          // vem na Task 65, quando a navegação é reorganizada.
          <DropdownMenuItem asChild>
            <Link href="/usuarios">
              <Users className="h-4 w-4" />
              Gerenciar usuários
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
