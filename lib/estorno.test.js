import { describe, it, expect } from "vitest";
import { ehEstorno, valorComSinal } from "./estorno";

const CARTAO = { tipo: "CARTAO_CREDITO" };
const CORRENTE = { tipo: "CONTA_CORRENTE" };

describe("ehEstorno", () => {
  it("entrada em cartão de crédito é estorno", () => {
    expect(ehEstorno({ tipo: "ENTRADA", valor: 200, conta: CARTAO })).toBe(true);
  });

  it("saída em cartão de crédito não é estorno", () => {
    expect(ehEstorno({ tipo: "SAIDA", valor: 200, conta: CARTAO })).toBe(false);
  });

  it("entrada em conta corrente não é estorno", () => {
    expect(ehEstorno({ tipo: "ENTRADA", valor: 200, conta: CORRENTE })).toBe(false);
  });

  it("transação sem a conta carregada não quebra e não é estorno", () => {
    expect(ehEstorno({ tipo: "ENTRADA", valor: 200 })).toBe(false);
  });
});

describe("valorComSinal", () => {
  it("estorno vira negativo", () => {
    expect(valorComSinal({ tipo: "ENTRADA", valor: 459.9, conta: CARTAO })).toBe(-459.9);
  });

  it("saída no crédito segue positiva", () => {
    expect(valorComSinal({ tipo: "SAIDA", valor: 320, conta: CARTAO })).toBe(320);
  });

  // O caso que garante que a função é segura no bloco Entradas, onde toda
  // linha é ENTRADA e nenhuma delas pode sair negativa.
  it("entrada em conta corrente segue positiva", () => {
    expect(valorComSinal({ tipo: "ENTRADA", valor: 1200, conta: CORRENTE })).toBe(1200);
  });

  it("converte o valor para número (Decimal do Prisma chega como objeto)", () => {
    expect(valorComSinal({ tipo: "SAIDA", valor: "86.40", conta: CARTAO })).toBe(86.4);
  });
});
