-- CreateEnum
CREATE TYPE "SerieMensal" AS ENUM ('IPCA');

-- CreateTable
CREATE TABLE "IndiceMensal" (
    "serie" "SerieMensal" NOT NULL,
    "mes" DATE NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "IndiceMensal_pkey" PRIMARY KEY ("serie","mes")
);
