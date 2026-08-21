"use client";

import { Button } from "@/components/ui/button";

export default function VisaoMensalError({ reset }) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Visão mensal</h1>

      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar suas informações.</p>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </main>
  );
}
