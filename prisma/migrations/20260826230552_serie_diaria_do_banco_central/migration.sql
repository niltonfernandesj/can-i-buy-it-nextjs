-- CreateEnum
CREATE TYPE "SerieDiaria" AS ENUM ('CDI', 'SELIC');

-- CreateTable
CREATE TABLE "TaxaDiaria" (
    "serie" "SerieDiaria" NOT NULL,
    "data" DATE NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "TaxaDiaria_pkey" PRIMARY KEY ("serie","data")
);
