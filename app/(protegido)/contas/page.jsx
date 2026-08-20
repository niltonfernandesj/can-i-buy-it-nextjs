import { db } from "@/lib/db";
import { ContasClient } from "./contas-client";

export default async function ContasPage() {
  const contas = await db.conta.findMany({
    orderBy: { criadoEm: "asc" },
    include: { _count: { select: { transacoes: true } } },
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Contas</h1>
      <ContasClient contas={contas} />
    </main>
  );
}
