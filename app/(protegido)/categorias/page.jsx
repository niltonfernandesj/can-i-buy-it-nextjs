import { db } from "@/lib/db";
import { CategoriasClient } from "./categorias-client";

export default async function CategoriasPage() {
  // Ordem por criadoEm (Design §18.1): preserva a posição herdada do enum,
  // que é a ordem dos chips em /lancamento. Novas entram no fim.
  const categorias = await db.categoria.findMany({
    orderBy: { criadoEm: "asc" },
    include: {
      _count: { select: { transacoes: true, valoresPadrao: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Categorias</h1>
      <CategoriasClient categorias={categorias} />
    </main>
  );
}
