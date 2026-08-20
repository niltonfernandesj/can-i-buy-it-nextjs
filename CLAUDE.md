# App de Finanças Pessoais (Familiar)

Este projeto segue **Spec Driven Development**. A pasta `specs/` é a fonte da verdade — leia antes de implementar qualquer coisa:

- `specs/spec-01-requisitos.md` — regras de negócio e critérios de aceite
- `specs/spec-02-design.md` — arquitetura, schema do banco, algoritmos (fatura, parcelamento)
- `specs/spec-03-tasks.md` — lista de tarefas de implementação, em ordem

## Como trabalhar

- Implemente **uma Task por vez**, na ordem do `spec-03-tasks.md`. Não adiante tarefas futuras nem amplie o escopo da task pedida.
- Antes de codar uma task, releia a(s) seção(ões) do Design e dos Requisitos que ela referencia.
- Se perceber que a spec está errada, incompleta ou ambígua: **pare e avise antes de codar** — sugira a correção na spec. A spec manda no código, não o contrário.
- Ao terminar uma task, rode o pipeline de QA da seção abaixo antes de considerar concluída.
- Não crie arquivos ou funcionalidades fora do que a task pede "por via das dúvidas".

## Quality Assurance

### Pipeline obrigatório ao concluir uma task

```bash
npm run lint
npm run test
rm -rf .next && npm run build    # mate dev/start antes: lsof -ti:3000 | xargs kill -9
```

O `build` não é opcional: ele pega erros que o `next dev` esconde (imports quebrados, `Decimal` do Prisma não-serializável cruzando Server → Client Component, páginas que viram estáticas sem querer).

Se a task mexeu na interface, some a isso o **QA de interface** abaixo. Só então commite.

### QA de interface (Playwright efêmero)

Não há suíte E2E versionada — o Playwright é instalado, usado e removido dentro da própria task:

```bash
npm install playwright --no-save
npx playwright install chromium   # só na primeira vez da máquina
```

O roteiro:

1. **Crie dados de teste isolados** com um script Prisma temporário: um usuário descartável (`qa-taskNN@teste.local` / `senhaQA123`, senha via `bcrypt.hash`) e o mínimo de contas/transações que o cenário exige.
2. **Suba o servidor** em background e espere ficar de pé (`curl` em loop até responder).
3. **Escreva um `.mjs` temporário** que exercita a UI real — login, navegação, cliques, asserções. Prefira asserção sobre estado observável (URL, texto renderizado, `getComputedStyle`, linha no banco) a "parece certo".
4. **Tire screenshots** no diretório de scratchpad da sessão e **olhe** — várias regressões visuais não quebram nenhuma asserção.
5. **Confirme no banco** quando a task envolve mutação: leia a linha direto via Prisma em vez de confiar só na tela.
6. **Limpe tudo**: apague as linhas de QA, remova os scripts temporários, mate o servidor, `npm uninstall playwright --no-save`, `rm -rf .next`. Rode `git status` para confirmar que só sobrou o que a task deveria mudar.

### ⚠️ Segurança dos dados durante o QA

**O banco de desenvolvimento contém as contas e transações reais do usuário, e a aplicação não tem isolamento por usuário** — qualquer sessão autenticada enxerga tudo. Um seletor amplo do Playwright alcança dados reais.

Isso já causou estrago: um locator genérico pegou o primeiro botão "Editar" da página e renomeou uma conta real do usuário. Foi detectado por uma verificação no banco logo depois e revertido, mas não pode se repetir.

Regras, portanto:

- **Nunca** use locators genéricos (`page.locator("button").first()`, filtros por classe solta) em telas que misturam dados reais e de QA.
- **Filtre a tela pelos dados de QA antes de agir** — ex.: digite a descrição exclusiva do registro de teste no campo de busca e só então interaja com a linha.
- Prefixe tudo que criar com um marcador exclusivo (`QA41 ...`) para que os seletores nunca sejam ambíguos.
- Ao limpar, apague **por `usuarioId` do usuário de QA** — nunca por nome, descrição ou data.

### `next dev` × `next start`

Use o **build de produção** (`npm run build && npm run start`) quando o bug depender de comportamento que só existe em produção — o caso clássico é o **Full Route Cache**: rotas sem API dinâmica são pré-renderizadas e só se atualizam via `revalidatePath()`. Em `next dev` tudo renderiza sempre fresco, então esse tipo de bug simplesmente não reproduz.

### Flakes conhecidos (retente, não investigue)

- **Primeira requisição contra um dev server recém-subido** dá timeout enquanto o Next compila a rota. Rode o script de novo.
- **`.next` corrompido** quando `build` roda com `dev`/`start` vivo. Mate a porta 3000 e `rm -rf .next` antes.
- **Locator ambíguo entre desktop e mobile**: as duas variantes de navegação coexistem no DOM (alternadas por CSS), então um seletor por texto acha 2 elementos. Restrinja com `:visible`, `.first()` ou um ancestral.

### Armadilhas de scripts de QA

- Rode os scripts **a partir da raiz do projeto** (`node qa-x.mjs`, com o arquivo lá dentro) — de fora, o Node não resolve `@prisma/client` nem `playwright`.
- O campo de senha do modelo `Usuario` é **`senhaHash`**, não `senha`.
- Datas em `new Date("2026-07-20")` são UTC e podem exibir o dia anterior no fuso local. Asserte pelo dado (`numeroParcela`, id) em vez do dia exato quando isso não for o alvo do teste.

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
