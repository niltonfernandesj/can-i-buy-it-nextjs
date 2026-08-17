-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CONTA_CORRENTE', 'CARTAO_CREDITO', 'CONTA_INVESTIMENTO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('MERCADO', 'LAZER', 'SAUDE', 'TRANSPORTE', 'MORADIA', 'SALARIO', 'OUTROS');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL,
    "diaFechamento" INTEGER,
    "diaVencimento" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "contaId" TEXT NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "dataEfetiva" TIMESTAMP(3) NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "numeroParcela" INTEGER,
    "totalParcelas" INTEGER,
    "parcelamentoId" TEXT,
    "ehInvestimento" BOOLEAN NOT NULL DEFAULT false,
    "contaInvestimentoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Transacao_usuarioId_idx" ON "Transacao"("usuarioId");

-- CreateIndex
CREATE INDEX "Transacao_contaId_idx" ON "Transacao"("contaId");

-- CreateIndex
CREATE INDEX "Transacao_mesReferencia_anoReferencia_idx" ON "Transacao"("mesReferencia", "anoReferencia");

-- CreateIndex
CREATE INDEX "Transacao_parcelamentoId_idx" ON "Transacao"("parcelamentoId");

-- AddForeignKey
ALTER TABLE "Conta" ADD CONSTRAINT "Conta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_contaInvestimentoId_fkey" FOREIGN KEY ("contaInvestimentoId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
