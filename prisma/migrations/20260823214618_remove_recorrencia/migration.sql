-- DropIndex
DROP INDEX "Transacao_recorrenciaId_idx";

-- AlterTable
ALTER TABLE "Transacao" DROP COLUMN "numeroOcorrencia",
DROP COLUMN "recorrenciaId",
DROP COLUMN "totalOcorrencias";
