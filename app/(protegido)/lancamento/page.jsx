import { db } from "@/lib/db";
import { LancamentoClient } from "./lancamento-client";

export default async function LancamentoPage() {
  // Só categorias ativas: é formulário de novo lançamento (Design §18.3).
  const [contas, categorias] = await Promise.all([
    db.conta.findMany({ orderBy: { criadoEm: "asc" } }),
    db.categoria.findMany({ where: { ativa: true }, orderBy: { criadoEm: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Lançamento</h1>
      <LancamentoClient contas={contas} categorias={categorias} />
    </main>
  );
}
