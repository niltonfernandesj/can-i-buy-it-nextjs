-- CreateEnum
CREATE TYPE "MercadoAtivo" AS ENUM ('RENDA_FIXA');

-- CreateEnum
CREATE TYPE "EstrategiaAtivo" AS ENUM ('POS_FIXADO', 'PRE_FIXADO', 'INFLACAO');

-- CreateEnum
CREATE TYPE "ProdutoAtivo" AS ENUM ('CDB', 'LCA', 'LCI', 'TESOURO_DIRETO');

-- CreateEnum
CREATE TYPE "IndexadorAtivo" AS ENUM ('PERCENTUAL_CDI', 'PERCENTUAL_SELIC', 'CDI_MAIS', 'SELIC_MAIS', 'PREFIXADO', 'IPCA_MAIS');

-- CreateEnum
CREATE TYPE "NaturezaMovimento" AS ENUM ('CREDITO', 'DEBITO');

-- CreateEnum
CREATE TYPE "MotivoMovimento" AS ENUM ('CUPOM', 'TAXA', 'CORRETAGEM', 'AJUSTE');

-- CreateTable
CREATE TABLE "Ativo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "mercado" "MercadoAtivo" NOT NULL DEFAULT 'RENDA_FIXA',
    "estrategia" "EstrategiaAtivo" NOT NULL,
    "produto" "ProdutoAtivo" NOT NULL,
    "emissor" TEXT NOT NULL,
    "indexador" "IndexadorAtivo" NOT NULL,
    "taxa" DECIMAL(65,30) NOT NULL,
    "dataAquisicao" TIMESTAMP(3) NOT NULL,
    "valorAquisicao" DECIMAL(65,30) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataLiquidacao" TIMESTAMP(3),
    "valorLiquidacao" DECIMAL(65,30),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoInvestimento" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "natureza" "NaturezaMovimento" NOT NULL,
    "motivo" "MotivoMovimento" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoInvestimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ativo_usuarioId_idx" ON "Ativo"("usuarioId");

-- CreateIndex
CREATE INDEX "Ativo_contaId_idx" ON "Ativo"("contaId");

-- CreateIndex
CREATE INDEX "Ativo_vencimento_idx" ON "Ativo"("vencimento");

-- CreateIndex
CREATE INDEX "MovimentoInvestimento_usuarioId_idx" ON "MovimentoInvestimento"("usuarioId");

-- CreateIndex
CREATE INDEX "MovimentoInvestimento_contaId_idx" ON "MovimentoInvestimento"("contaId");

-- AddForeignKey
ALTER TABLE "Ativo" ADD CONSTRAINT "Ativo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ativo" ADD CONSTRAINT "Ativo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoInvestimento" ADD CONSTRAINT "MovimentoInvestimento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoInvestimento" ADD CONSTRAINT "MovimentoInvestimento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
