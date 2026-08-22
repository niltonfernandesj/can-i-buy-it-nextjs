import { PrismaClient } from "@prisma/client";

// Datas de transação são construídas a partir de "YYYY-MM-DD" via
// new Date(ano, mes, dia), que resolve no fuso do processo — sem isso,
// servidor (UTC na Vercel) e navegador (Brasil) discordam e a data
// exibida/editada volta um dia (spec-02 §1, Task 74). A Vercel bloqueia
// TZ como variável de ambiente (reservada por ela internamente), então o
// fuso é fixado aqui em código — lib/db.js é importado por toda Server
// Action e todo Server Component que lê ou grava data, cedo o bastante
// pra rodar antes de qualquer new Date() do app.
process.env.TZ = "America/Sao_Paulo";

const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
