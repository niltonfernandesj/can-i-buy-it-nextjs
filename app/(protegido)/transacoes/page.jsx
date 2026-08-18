import { db } from "@/lib/db";
import { TransacoesClient } from "./transacoes-client";

export default async function TransacoesPage() {
  const [transacoesRaw, contas] = await Promise.all([
    db.transacao.findMany({
      include: { conta: true, contaInvestimento: true },
      orderBy: { dataCompra: "desc" },
    }),
    db.conta.findMany({ orderBy: { criadoEm: "asc" } }),
  ]);

  // Decimal do Prisma não é serializável para um Client Component.
  const transacoes = transacoesRaw.map((t) => ({ ...t, valor: Number(t.valor) }));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Transações</h1>
      <TransacoesClient transacoes={transacoes} contas={contas} />
    </main>
  );
}
