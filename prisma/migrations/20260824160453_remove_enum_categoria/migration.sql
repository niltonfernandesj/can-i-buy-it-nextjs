-- M25 / Task 94 — contrair (Design §18.2).
-- Só é seguro rodar depois que as Tasks 92 e 93 estiverem em produção: a
-- partir daqui o código NÃO pode mais ler a coluna `categoria`.

-- 1. Trava: aborta antes de qualquer alteração se alguma transação estiver
--    sem categoriaId. Sem isto, o SET NOT NULL abaixo falharia no meio do
--    deploy, deixando o schema pela metade.
DO $$
DECLARE orfas INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfas FROM "Transacao" WHERE "categoriaId" IS NULL;
  IF orfas > 0 THEN
    RAISE EXCEPTION 'Abortado: % transacao(oes) sem categoriaId', orfas;
  END IF;
END $$;

-- 2. categoriaId passa a ser obrigatório em Transacao. Em ValorPadrao segue
--    anulável: null quando tipo = ENTRADA (regra da aplicação, não do banco).
ALTER TABLE "Transacao" ALTER COLUMN "categoriaId" SET NOT NULL;

-- 3. Remove a coluna legada das duas tabelas e, então, o tipo.
ALTER TABLE "Transacao"   DROP COLUMN "categoria";
ALTER TABLE "ValorPadrao" DROP COLUMN "categoria";

DROP TYPE "CategoriaLegado";
