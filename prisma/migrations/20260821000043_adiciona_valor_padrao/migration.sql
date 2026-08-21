-- CreateEnum
CREATE TYPE "MeioPagamento" AS ENUM ('CREDITO', 'DEBITO');

-- CreateTable
CREATE TABLE "ValorPadrao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "meio" "MeioPagamento",
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValorPadrao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValorPadrao_usuarioId_idx" ON "ValorPadrao"("usuarioId");

-- AddForeignKey
ALTER TABLE "ValorPadrao" ADD CONSTRAINT "ValorPadrao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
