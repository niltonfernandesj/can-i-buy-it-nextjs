import { describe, it, expect } from "vitest";
import { dataFechamentoDaReferencia, creditoAindaEstimavel, debitoAindaEstimavel } from "./projecao";

describe("dataFechamentoDaReferencia", () => {
  it("cartão fech. 25, venc. 5 (venc < fech) — mês de referência set/2026 fechou em 25/ago/2026", () => {
    const resultado = dataFechamentoDaReferencia(9, 2026, { diaFechamento: 25, diaVencimento: 5 });
    expect(resultado).toEqual(new Date(2026, 7, 25, 23, 59, 59, 999));
  });

  it("cartão fech. 10, venc. 17 (venc >= fech) — mês de referência ago/2026 fechou em 10/ago/2026", () => {
    const resultado = dataFechamentoDaReferencia(8, 2026, { diaFechamento: 10, diaVencimento: 17 });
    expect(resultado).toEqual(new Date(2026, 7, 10, 23, 59, 59, 999));
  });

  it("caso 11 — fechamento dia 31, mês de referência de 30 dias (abril) clampa pro último dia", () => {
    const resultado = dataFechamentoDaReferencia(4, 2026, { diaFechamento: 31, diaVencimento: 31 });
    expect(resultado).toEqual(new Date(2026, 3, 30, 23, 59, 59, 999));
  });
});

describe("creditoAindaEstimavel", () => {
  it("caso 6 — fatura já fechada em todos os cartões → false", () => {
    const cartao = { diaFechamento: 10, diaVencimento: 17 }; // fecha 10/ago/2026
    const hoje = new Date(2026, 7, 15); // 15/ago, depois do fechamento
    expect(creditoAindaEstimavel(8, 2026, [cartao], hoje)).toBe(false);
  });

  it("caso 7 — dois cartões com fechamentos distintos, um fechado e outro não → true", () => {
    const cartaoFechado = { diaFechamento: 5, diaVencimento: 10 }; // fecha 5/ago/2026
    const cartaoAberto = { diaFechamento: 25, diaVencimento: 28 }; // fecha 25/ago/2026
    const hoje = new Date(2026, 7, 15); // depois do primeiro, antes do segundo
    expect(creditoAindaEstimavel(8, 2026, [cartaoFechado, cartaoAberto], hoje)).toBe(true);
  });

  it("caso 8 — nenhum cartão cadastrado → false", () => {
    const hoje = new Date(2026, 7, 1);
    expect(creditoAindaEstimavel(8, 2026, [], hoje)).toBe(false);
  });

  it("caso 11 — fechamento dia 31 em mês de 30 dias, hoje ainda dentro da fronteira clampada → true", () => {
    const cartao = { diaFechamento: 31, diaVencimento: 31 }; // clampa pra 30/abr/2026
    const hoje = new Date(2026, 3, 30, 12); // 30/abr ao meio-dia, ainda antes de 23:59:59.999
    expect(creditoAindaEstimavel(4, 2026, [cartao], hoje)).toBe(true);
  });

  it("caso 11 — mesmo cartão, um instante depois da fronteira clampada → false", () => {
    const cartao = { diaFechamento: 31, diaVencimento: 31 };
    const hoje = new Date(2026, 4, 1); // já em maio
    expect(creditoAindaEstimavel(4, 2026, [cartao], hoje)).toBe(false);
  });
});

describe("debitoAindaEstimavel", () => {
  it("dentro do mês de referência → true", () => {
    expect(debitoAindaEstimavel(8, 2026, new Date(2026, 7, 15))).toBe(true);
  });

  it("depois do fim do mês de referência → false", () => {
    expect(debitoAindaEstimavel(8, 2026, new Date(2026, 8, 1))).toBe(false);
  });
});
