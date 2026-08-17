import { db } from "@/lib/db";
import { LancamentoClient } from "./lancamento-client";

export default async function LancamentoPage() {
  const contas = await db.conta.findMany({ orderBy: { criadoEm: "asc" } });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Lançamento</h1>
      <LancamentoClient contas={contas} />
    </main>
  );
}
