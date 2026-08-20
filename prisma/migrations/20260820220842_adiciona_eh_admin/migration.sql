-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "ehAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Marca o usuário mais antigo como administrador (spec-02 §17.2).
-- Em produção, esse é o usuário que criou a aplicação — evita depender
-- de um UPDATE manual no console do provedor.
UPDATE "Usuario"
SET "ehAdmin" = true
WHERE "id" = (SELECT "id" FROM "Usuario" ORDER BY "criadoEm" ASC LIMIT 1);
