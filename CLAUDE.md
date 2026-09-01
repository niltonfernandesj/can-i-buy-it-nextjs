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
- **Exceção — bypass explícito do ciclo de specs:** o usuário pode autorizar pular o ciclo (sem entrada em `spec-03-tasks.md`, sem atualização de Requisitos/Design antes de codar) pra uma mudança pontual, com uma instrução explícita nesse sentido (ex.: "sem SDD", "implemente direto", "pode seguir, sem passar pelas specs"). Essa autorização vale **só pra aquele pedido** — nunca presuma que ela se estende ao próximo pedido, mesmo que pareça pequeno ou similar; peça de novo se não houver instrução explícita. Bypass gera drift proposital entre spec e código (a spec documenta o que existia antes da mudança); se o usuário pedir uma limpeza geral das specs depois, reconcilie esses pontos com o código real nesse momento.

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

1. **Crie dados de teste isolados** com um script Prisma temporário: um usuário descartável (`qa-taskNN@teste.local` / `senhaQA123`, senha via `bcrypt.hash`) e o mínimo de contas/transações que o cenário exige. Se o cenário depende de uma soma agregada (teto, total do mês) num banco sem isolamento por usuário, **use valores 10-100x maiores que qualquer coisa plausível já lançada** (ex.: teto de R$1.000.000, não R$1.000) — evita descobrir depois que dado real pré-existente já mascarou o resultado e ter que refazer o setup.
2. **Suba o servidor** em background e espere ficar de pé (`curl` em loop até responder).
3. **Escreva um `.mjs` temporário** que exercita a UI real — login, navegação, cliques, asserções. **Asserção sobre estado observável é a evidência padrão, não o screenshot**: URL, `textContent()`, `getComputedStyle()`, `boundingBox()`, linha no banco. Rode tudo num único script (todos os passos do roteiro numa execução só) em vez de vários scripts pequenos.
4. **Antes de tirar um screenshot, pergunte: dá pra provar isso com asserção?** Se der, não tire — screenshot é exceção, não hábito. Só se justifica quando **nada programático prova o que está em jogo**:
   - Layout/UI **novo**, sem estado "bom conhecido" anterior pra comparar (primeira vez que aquele componente/tela renderiza).
   - Problema **inerentemente visual e sem propriedade única que o capture** — sobreposição de elementos, quebra de texto estranha, ritmo de espaçamento — nada disso sai de um `getComputedStyle` de uma propriedade só.
   - O usuário pediu explicitamente pra "ver"/"olhar".

   Contraste de cor **não entra nessa lista** — é computável (luminância relativa, razão de contraste), prove com script, não com foto. Texto, valores, URLs, cores exatas: `textContent()`/`getComputedStyle()`/`boundingBox()`.

   Quando um screenshot for mesmo necessário: nunca `fullPage: true` por padrão (custa tokens de visão proporcionais à altura da imagem) — prefira o viewport ou `locator(...).screenshot()` do elemento específico; numa lista longa e repetitiva (ex.: 12 cards de mês), um ou dois já provam o padrão, não precisa fotografar todos; ao revisar, leia só os que cobrem estados visualmente distintos; e não repita o mesmo screenshot depois de um padrão de UI já validado em outra task (ex.: mais um `Card`/`Dialog` reaproveitando um layout já aprovado não precisa de nova foto).
5. **Confirme no banco** quando a task envolve mutação: leia a linha direto via Prisma em vez de confiar só na tela.
6. **Limpe tudo**: apague as linhas de QA, remova os scripts temporários, mate o servidor, `npm uninstall playwright --no-save`, `rm -rf .next`. Rode `git status` para confirmar que só sobrou o que a task deveria mudar.

**Sem Playwright para tasks sem UI** (schema, migration, Server Action sem tela nova, função pura em `lib/`) — lint + test + build já bastam; instalar o browser é puro custo.

**Seletor `:visible` desde a primeira tentativa** em qualquer tela com variante mobile/desktop simultânea no DOM (a maioria, depois do M17) — é o erro mais repetido nesta sessão: locator ambíguo → timeout → reescrever → rodar de novo. Não espere o timeout pra descobrir.

### ⚠️ Segurança dos dados durante o QA

**O banco de desenvolvimento contém as contas e transações reais do usuário, e a aplicação não tem isolamento por usuário** — qualquer sessão autenticada enxerga tudo. Um seletor amplo do Playwright alcança dados reais.

Isso já causou estrago **duas vezes**. Primeiro, um locator genérico pegou o primeiro botão "Editar" da página e renomeou uma conta real do usuário. Depois, num CRUD de usuários, um locator do tipo `locator("div", { has: ... }).filter({ has: ... })` combinou matches de várias divs aninhadas (a linha específica **e** seus containers ancestrais, que também "continham" o texto-alvo por conterem a linha inteira) e acabou editando o **usuário admin real** — nome e senha sobrescritos, senha original perdida sem backup. Em ambos os casos o registro atingido era o **primeiro da lista** (o mais antigo, por `orderBy: criadoEm asc`) — e é exatamente esse o registro real do usuário, já que ele foi o primeiro a existir no banco. Ambos foram detectados por verificação no banco logo depois e corrigidos, mas o segundo incidente prova que a regra já escrita aqui não bastou — reforçando-a:

Regras, portanto:

- **Nunca** use locators genéricos (`page.locator("button").first()`, filtros por classe solta) em telas que misturam dados reais e de QA.
- **Cuidado especial com `locator(seletor, { has: ... }).filter({ has: ... })`**: se o `has` interno casa com qualquer descendente (não só filho direto), a busca externa pode combinar a linha certa **e** todos os containers ancestrais dela — e um `.first()` subsequente pode pegar um elemento de um container muito mais amplo que a linha pretendida. Prefira selecionar a linha por uma classe exclusiva daquele nível de aninhamento (`locator("div.flex.items-center.justify-between").filter({ hasText: "..." })`) a compor `has`/`filter` em cascata.
- **Numa lista ordenada por `criadoEm` (ou qualquer critério onde o registro real é o mais antigo/primeiro), o risco de um locator ambíguo acertar o mais antigo é maior, não menor** — é ele que aparece primeiro na página. Trate isso como motivo a mais para escopar com precisão, nunca como "provavelmente vai pegar um item de QA".
- **Para testar edição, CRIE um registro descartável — nunca reaproveite um real.** Os incidentes anteriores foram de locator ambíguo; este foi diferente e por isso mais instrutivo: o locator estava **correto**, encontrou exatamente a linha pedida (`Salário Nilton`) — o erro foi escolher um registro real como cobaia porque "só precisava de uma transação comum qualquer". O QA da Task 125 moveu um salário real de 05/12 para 27/08. Foi detectado e restaurado pelo padrão da série (dia 5 de cada mês), mas só porque havia padrão; um registro isolado teria sido perdido. Se o teste **escreve**, o alvo tem de ser um registro que o próprio QA criou.
- **Filtre a tela pelos dados de QA antes de agir** — ex.: digite a descrição exclusiva do registro de teste no campo de busca e só então interaja com a linha.
- Prefixe tudo que criar com um marcador exclusivo (`QA41 ...`) para que os seletores nunca sejam ambíguos.
- Ao limpar, apague **por `usuarioId` do usuário de QA** — nunca por nome, descrição ou data.
- **Depois de qualquer ação de edição/exclusão via locator não trivial, confirme no banco *antes* de seguir** — não só ao final do QA. O segundo incidente só foi pego porque um teste de persistência, rodado horas depois, checou o registro errado por e-mail; uma verificação imediata pós-clique teria pego na hora.

### `next dev` × `next start`

Use o **build de produção** (`npm run build && npm run start`) quando o bug depender de comportamento que só existe em produção — o caso clássico é o **Full Route Cache**: rotas sem API dinâmica são pré-renderizadas e só se atualizam via `revalidatePath()`. Em `next dev` tudo renderiza sempre fresco, então esse tipo de bug simplesmente não reproduz.

### Flakes conhecidos (retente, não investigue)

- **Primeira requisição contra um dev server recém-subido** dá timeout enquanto o Next compila a rota. Rode o script de novo.
- **`.next` incompatível entre `build` e `dev`** — nos dois sentidos: com um `dev`/`start` vivo durante o `build`, **e também** rodando `npm run dev` logo depois de um `npm run build` que já terminou. O segundo caso é o traiçoeiro, porque nada avisa: o dev server sobe normal, responde 200 no HTML, e **todos os chunks `_next/static` dão 404**. Sem JS não há hidratação, então formulários React viram submit HTML puro (a URL ganha um `?` e a página recarrega sem erro nenhum na tela) e nenhum `onClick` funciona — parece bug de autenticação ou de seletor, e não é. **Sintoma diagnóstico:** ouça `page.on("requestfailed")` no script; uma enxurrada de 404 em `_next/static/chunks/*` fecha o caso na hora. Sempre `rm -rf .next` e mate a porta 3000 antes de subir o dev depois de um build.
- **Dev server sobrevivente rouba a porta.** Se um `next dev` antigo continua vivo, o novo sobe calado em **3001** e o script segue batendo no velho — que pode estar servindo um `.next` já apagado, com o sintoma da armadilha acima. `pkill -f "next dev"` sozinho nem sempre pega: confirme com `lsof -ti:3000` e cheque a linha `- Local:` do log antes de rodar o script.
- **Reload de página aberta antes de reiniciar `next dev`** pode carregar sem estilo — a aba retém referências ao build anterior do webpack. Feche/recarregue a aba (ou dê um hard reload) depois de reiniciar o servidor; não precisa investigar.

### O modificador `/NN` de opacidade NÃO funciona neste projeto

Os tokens de cor guardam **hexadecimal** (`--saida-credito: #FB7185`), e o Tailwind 3 só aplica opacidade sobre variáveis que guardam **canais** (`251 113 133`). Com hex, a regra é inválida e o Tailwind **descarta a classe em silêncio**: `.bg-destructive\/10` simplesmente não existe no CSS compilado.

Não dá erro, não dá aviso — o elemento fica sem fundo nenhum e parece decisão de design. A Task 139 encontrou **7 usos inertes** só na tela de investimentos.

**Funciona** com cores literais do Tailwind (`bg-black/80`), porque ali não há variável.

**Como fazer transparência:** um token dedicado com `rgba()` literal em `globals.css`, mapeado no `tailwind.config.js`. Ver `--vencido-fundo` e vizinhos.

**Como conferir:** `grep -o '\.classe{[^}]*}' $(find .next -name '*.css' -path '*static*' | head -1)`. Se não aparecer, a classe não existe.

### `--muted`, `--accent` e `--secondary` são a mesma cor

Os três valem `#232328`. Um `hover:bg-accent` sobre `bg-muted` não muda **nada** — é o padrão do shadcn e não funciona neste tema. Para realce de cursor existe `--controle-hover`.

### `npm run build` não prova que os imports existem

O projeto é **JavaScript puro**. Um identificador sem import não é erro de compilação — é `ReferenceError` em tempo de execução. O build passa, a página quebra.

Aconteceu na Task 137: um `import` que a edição não inseriu (a linha era multilinha e o `replace` de linha única não casou) deixou `rotuloEncerramento is not defined`. O `✓ Compiled successfully` saiu limpo, e a página inteira desmontava ao expandir um grupo — `<main>` desaparecia do DOM.

**Sintoma:** um elemento que existia some depois de uma interação, e locators começam a estourar timeout em coisas óbvias. **Diagnóstico:** `page.on("pageerror")` no script de QA, sempre — é uma linha e apontou a causa em segundos depois de meia hora de suposição.

Depois de editar imports por script, confira: `grep -n "nome" arquivo` deve achar **o import e o uso**, não só o uso.

### Armadilhas de scripts de QA

- Rode os scripts **a partir da raiz do projeto** (`node qa-x.mjs`, com o arquivo lá dentro) — de fora, o Node não resolve `@prisma/client` nem `playwright`.
- O campo de senha do modelo `Usuario` é **`senhaHash`**, não `senha`.
- Datas em `new Date("2026-07-20")` são UTC e podem exibir o dia anterior no fuso local. Asserte pelo dado (`numeroParcela`, id) em vez do dia exato quando isso não for o alvo do teste.
- **`formatarReais` usa espaço não-quebrável (U+00A0) entre "R$" e o número.** Comparar `textContent()` com uma string digitada com espaço comum falha exibindo dois valores idênticos na tela — foi o erro mais repetido no QA do M29, quatro vezes. Normalize sempre com `s.replace(/\u00a0/g, " ")`, e escreva o escape `\u00a0` explicitamente: um caractere literal no regex é invisível na revisão e some numa edição sem ninguém perceber.
- **A tabela de `/transacoes` é paginada (10 linhas) e ordenada por data efetiva** — uma linha de QA com data de hoje não está na primeira página. Filtre pelo campo **Buscar** com o prefixo do QA antes de tentar alcançá-la.
- **`scrollWidth` do documento NÃO detecta transbordo dentro de um `overflow-x-auto`.** Um container com essa classe absorve o excesso e rola por dentro; a página fica intacta e a asserção de "sem rolagem horizontal" passa, enquanto uma coluna inteira está fora da área visível. Aconteceu na Task 134: a tabela pedia 391px num container de 284px e a coluna Líquido terminava 160px além da borda — o QA passou. Em qualquer tela com `overflow-x-auto`, meça **o container**: `el.scrollWidth > el.clientWidth`, e confira se o `right` da última coluna cabe no `clientWidth`.
- **`boundingBox()` devolve a border-box, com padding incluído.** Comparar a largura de um filho com a de `<main>` (que tem `p-8`) falha por 64px mesmo quando o filho ocupa a largura toda — e a falha *parece* bug de layout. Meça a caixa de conteúdo: `el.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)`.
- **O login não dispara evento de navegação.** `signIn(..., { redirect: false })` seguido de `router.push()` é navegação client-side: `waitForURL()` com o `waitUntil: "load"` padrão estoura o timeout mesmo com o login bem-sucedido. Espere pela URL via `waitForFunction(() => !location.pathname.includes("/login"))`, e no `catch` verifique se a mensagem "Email ou senha inválidos." apareceu — separa credencial recusada de espera mal escrita.
- `npm install`/`uninstall playwright` e `npm audit` imprimem avisos de engine e vulnerabilidades que não mudam de task pra task — `| tail -n 3` ou `| tail -n 5` no comando corta o ruído sem perder o resultado.

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
- **Marcação de conclusão no `spec-03-tasks.md`:** depois de commitar uma task, acrescente logo abaixo do título dela a linha:

  ```
  ✅ **Concluída** — commit `<hash curto>`
  ```

  E marque o título do marco com `✅` no fim quando **todas** as tasks dele estiverem concluídas (ex.: `## M25 — Categorias gerenciáveis pelo usuário ✅`).

  Regras que fazem a marcação valer alguma coisa:
  - **O hash vem do `git log`, nunca de memória.** É o que liga a spec ao código que a implementou; um hash plausível mas inventado destrói justamente essa utilidade. Havendo dúvida, confira com `git log --format="%h %s" | grep "Task N"`.
  - **Um commit que cobre um intervalo** (`Tasks 75-79: ...`) marca todas as tasks do intervalo, cada uma com o mesmo hash.
  - **Task sem commit associado** — operacional, como a Task 34 (deploy e smoke test manual) — é marcada sem hash, explicitando o motivo. Não invente um commit para preencher a lacuna.
  - Marque **só o que foi de fato concluído**. Uma task planejada mas não implementada fica sem marcação, ainda que as vizinhas estejam marcadas.
