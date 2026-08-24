-- M25 / Task 90 — expandir (Design §18.2).
-- Puramente aditivo: a coluna "categoria" (enum) continua intacta e segue
-- sendo a fonte da verdade até a Task 92. Escrita à mão porque o diff
-- automático do Prisma não entende o rename do enum e geraria
-- DROP COLUMN "categoria" + recriação, destruindo a categorização do
-- histórico — exatamente o que este marco existe pra preservar.

-- 1. Renomeia o enum. Metadata-only: não toca em nenhum valor gravado.
--    Necessário só porque o Prisma não admite model e enum homônimos
--    durante a convivência. O tipo sai de vez na Task 94.
ALTER TYPE "Categoria" RENAME TO "CategoriaLegado";

-- 2. Nova tabela.
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- 3. Semeia as sete categorias que existiam no enum, com os nomes de
--    CATEGORIA_LABELS. O criadoEm crescente preserva a ordem do enum, que é
--    a ordem dos chips em /lancamento (Design §18.1) — alfabetar
--    reembaralharia a memória muscular do usuário.
INSERT INTO "Categoria" ("id", "nome", "cor", "ativa", "criadoEm") VALUES
  (gen_random_uuid()::text, 'Mercado',    'verde',   true, NOW() + INTERVAL '1 millisecond'),
  (gen_random_uuid()::text, 'Lazer',      'roxo',    true, NOW() + INTERVAL '2 millisecond'),
  (gen_random_uuid()::text, 'Saúde',      'rosa',    true, NOW() + INTERVAL '3 millisecond'),
  (gen_random_uuid()::text, 'Transporte', 'azul',    true, NOW() + INTERVAL '4 millisecond'),
  (gen_random_uuid()::text, 'Moradia',    'ambar',   true, NOW() + INTERVAL '5 millisecond'),
  (gen_random_uuid()::text, 'Salário',    'lima',    true, NOW() + INTERVAL '6 millisecond'),
  (gen_random_uuid()::text, 'Outros',     'cinza',   true, NOW() + INTERVAL '7 millisecond');

-- 4. Colunas novas, anuláveis nesta fase.
ALTER TABLE "Transacao"   ADD COLUMN "categoriaId" TEXT;
ALTER TABLE "ValorPadrao" ADD COLUMN "categoriaId" TEXT;

-- 5. Backfill 1:1. O enum garante que todo valor gravado está entre os sete,
--    então não há linha órfã possível.
UPDATE "Transacao" t
   SET "categoriaId" = c."id"
  FROM "Categoria" c
 WHERE c."nome" = CASE t."categoria"
                    WHEN 'MERCADO'    THEN 'Mercado'
                    WHEN 'LAZER'      THEN 'Lazer'
                    WHEN 'SAUDE'      THEN 'Saúde'
                    WHEN 'TRANSPORTE' THEN 'Transporte'
                    WHEN 'MORADIA'    THEN 'Moradia'
                    WHEN 'SALARIO'    THEN 'Salário'
                    WHEN 'OUTROS'     THEN 'Outros'
                  END;

-- ValorPadrao.categoria é anulável (null quando tipo = ENTRADA) — só as
-- linhas preenchidas são migradas; as nulas seguem nulas.
UPDATE "ValorPadrao" v
   SET "categoriaId" = c."id"
  FROM "Categoria" c
 WHERE v."categoria" IS NOT NULL
   AND c."nome" = CASE v."categoria"
                    WHEN 'MERCADO'    THEN 'Mercado'
                    WHEN 'LAZER'      THEN 'Lazer'
                    WHEN 'SAUDE'      THEN 'Saúde'
                    WHEN 'TRANSPORTE' THEN 'Transporte'
                    WHEN 'MORADIA'    THEN 'Moradia'
                    WHEN 'SALARIO'    THEN 'Salário'
                    WHEN 'OUTROS'     THEN 'Outros'
                  END;

-- 6. Trava de segurança: se qualquer transação tiver ficado sem categoriaId,
--    aborta a migration inteira em vez de deixar produção meio migrada.
DO $$
DECLARE orfas INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfas FROM "Transacao" WHERE "categoriaId" IS NULL;
  IF orfas > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % transacao(oes) sem categoriaId', orfas;
  END IF;
END $$;

-- 7. Índices e FKs. RESTRICT porque a regra é bloquear exclusão de categoria
--    em uso (Design §18.3) — SET NULL anularia em silêncio.
CREATE INDEX "Transacao_categoriaId_idx"   ON "Transacao"("categoriaId");
CREATE INDEX "ValorPadrao_categoriaId_idx" ON "ValorPadrao"("categoriaId");

ALTER TABLE "Transacao"   ADD CONSTRAINT "Transacao_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ValorPadrao" ADD CONSTRAINT "ValorPadrao_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
