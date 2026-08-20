import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  // Camada 2 de 3 (spec-02 §17.2) — a real proteção está em exigirAdmin(),
  // dentro das Server Actions. Middleware (camada 1) e esta verificação
  // existem para dar a resposta certa ao usuário e reduzir superfície.
  const session = await getServerSession(authOptions);
  if (!session?.user?.ehAdmin) {
    redirect("/visao-geral");
  }

  const usuarios = await db.usuario.findMany({
    orderBy: { criadoEm: "asc" },
    select: { id: true, nome: true, email: true, ehAdmin: true },
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Usuários</h1>
      <UsuariosClient usuarios={usuarios} usuarioAtualId={session.user.id} />
    </main>
  );
}
