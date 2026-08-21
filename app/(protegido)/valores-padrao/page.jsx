import { db } from "@/lib/db";
import { ValoresPadraoClient } from "./valores-padrao-client";

export default async function ValoresPadraoPage() {
  const valoresPadrao = await db.valorPadrao.findMany({
    orderBy: { criadoEm: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Valores padrão</h1>
      <ValoresPadraoClient
        // Decimal do Prisma não é serializável para um Client Component.
        valoresPadrao={valoresPadrao.map((v) => ({ ...v, valor: Number(v.valor) }))}
      />
    </main>
  );
}
