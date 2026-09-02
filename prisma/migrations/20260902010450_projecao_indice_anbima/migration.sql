-- CreateTable
CREATE TABLE "ProjecaoIndice" (
    "serie" "SerieMensal" NOT NULL,
    "mes" DATE NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "capturadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjecaoIndice_pkey" PRIMARY KEY ("serie","mes")
);
