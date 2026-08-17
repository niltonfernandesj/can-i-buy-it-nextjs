# App de Finanças Pessoais (Familiar)

Este projeto segue **Spec Driven Development**. A pasta `specs/` é a fonte da verdade — leia antes de implementar qualquer coisa:

- `specs/spec-01-requisitos.md` — regras de negócio e critérios de aceite
- `specs/spec-02-design.md` — arquitetura, schema do banco, algoritmos (fatura, parcelamento)
- `specs/spec-03-tasks.md` — lista de tarefas de implementação, em ordem

## Como trabalhar

- Implemente **uma Task por vez**, na ordem do `spec-03-tasks.md`. Não adiante tarefas futuras nem amplie o escopo da task pedida.
- Antes de codar uma task, releia a(s) seção(ões) do Design e dos Requisitos que ela referencia.
- Se perceber que a spec está errada, incompleta ou ambígua: **pare e avise antes de codar** — sugira a correção na spec. A spec manda no código, não o contrário.
- Ao terminar uma task, rode os testes relevantes (`npm run test`) antes de considerar concluída.
- Não crie arquivos ou funcionalidades fora do que a task pede "por via das dúvidas".

## Stack (ver spec-02-design.md §1 para detalhes/justificativas)

- Next.js 14+ (App Router), **JavaScript puro — sem TypeScript**
- Prisma + PostgreSQL (Vercel Postgres)
- NextAuth.js (Credentials Provider) + bcrypt
- Tailwind CSS + shadcn/ui
- Recharts (gráficos)
- Vitest (testes)

## Convenções

- Server Components para leitura de dados; Server Actions para mutações (sem rotas de API REST separadas, salvo `/api/auth`).
- Nomenclatura de variáveis/campos em português, conforme os specs (`dataCompra`, `mesReferencia`, `ehInvestimento`, etc.) — mantenha consistência com o schema Prisma do Design.
- Commits: um por task concluída, mensagem no formato `Task N: <resumo curto>`.
