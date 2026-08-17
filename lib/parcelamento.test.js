import { describe, it, expect } from "vitest";
import {
  ultimoDiaDoMes,
  dataAberturaProximaFatura,
  gerarParcelas,
} from "./parcelamento";

describe("ultimoDiaDoMes", () => {
  it("retorna 31 para janeiro", () => {
    expect(ultimoDiaDoMes(2026, 1)).toBe(31);
  });

  it("retorna 28 para fevereiro em ano não bissexto", () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
  });

  it("retorna 29 para fevereiro em ano bissexto", () => {
    expect(ultimoDiaDoMes(2028, 2)).toBe(29);
  });
});

describe("dataAberturaProximaFatura", () => {
  it("soma 1 dia à data de fechamento normalmente", () => {
    const abertura = dataAberturaProximaFatura(1, 2026, 5);
    expect(abertura).toEqual(new Date(2026, 0, 6));
  });

  it("clampa fechamento dia 31 para o último dia de fevereiro (28, não bissexto) e soma 1", () => {
    const abertura = dataAberturaProximaFatura(2, 2026, 31);
    expect(abertura).toEqual(new Date(2026, 2, 1)); // 1/mar/2026
  });

  it("rola para o ano seguinte quando o fechamento é em dezembro", () => {
    const abertura = dataAberturaProximaFatura(12, 2026, 31);
    expect(abertura).toEqual(new Date(2027, 0, 1)); // 1/jan/2027
  });
});

describe("gerarParcelas", () => {
  it("gera exatamente N parcelas, com dataCompra e parcelamentoId consistentes em todas", () => {
    const cartao = { diaFechamento: 5, diaVencimento: 15 };
    const dataCompra = new Date(2026, 0, 1); // 1/jan/2026
    const parcelas = gerarParcelas(dataCompra, 100, 4, cartao);

    expect(parcelas).toHaveLength(4);

    const parcelamentoId = parcelas[0].parcelamentoId;
    parcelas.forEach((parcela, index) => {
      expect(parcela.numeroParcela).toBe(index + 1);
      expect(parcela.totalParcelas).toBe(4);
      expect(parcela.parcelamentoId).toBe(parcelamentoId);
      expect(parcela.dataCompra).toEqual(dataCompra);
      expect(parcela.valor).toBe(100);
    });
  });

  it("avança exatamente 1 mês de referência por parcela (sem cair em caso de borda)", () => {
    const cartao = { diaFechamento: 5, diaVencimento: 15 };
    const dataCompra = new Date(2026, 0, 1); // 1/jan/2026
    const parcelas = gerarParcelas(dataCompra, 100, 4, cartao);

    expect(parcelas.map((p) => `${p.mesReferencia}/${p.anoReferencia}`)).toEqual([
      "1/2026",
      "2/2026",
      "3/2026",
      "4/2026",
    ]);
  });

  it("exemplo da spec: fechamento dia 25, vencimento dia 5, compra 10/ago/2026, 3x", () => {
    const cartao = { diaFechamento: 25, diaVencimento: 5 };
    const dataCompra = new Date(2026, 7, 10); // 10/ago/2026
    const parcelas = gerarParcelas(dataCompra, 100, 3, cartao);

    expect(parcelas).toEqual([
      expect.objectContaining({
        numeroParcela: 1,
        dataEfetiva: new Date(2026, 7, 10), // 10/ago/2026
        mesReferencia: 9,
        anoReferencia: 2026,
      }),
      expect.objectContaining({
        numeroParcela: 2,
        dataEfetiva: new Date(2026, 7, 26), // 26/ago/2026
        mesReferencia: 10,
        anoReferencia: 2026,
      }),
      expect.objectContaining({
        numeroParcela: 3,
        dataEfetiva: new Date(2026, 8, 26), // 26/set/2026
        mesReferencia: 11,
        anoReferencia: 2026,
      }),
    ]);
  });

  it("caso de borda da spec: fechamento dia 31, vencimento dia 10, compra 15/jan/2026, 3x", () => {
    const cartao = { diaFechamento: 31, diaVencimento: 10 };
    const dataCompra = new Date(2026, 0, 15); // 15/jan/2026
    const parcelas = gerarParcelas(dataCompra, 100, 3, cartao);

    expect(parcelas).toEqual([
      expect.objectContaining({
        numeroParcela: 1,
        dataEfetiva: new Date(2026, 0, 15), // 15/jan/2026
        mesReferencia: 2,
        anoReferencia: 2026,
      }),
      expect.objectContaining({
        numeroParcela: 2,
        dataEfetiva: new Date(2026, 1, 1), // 1/fev/2026 (fechamento clampado p/ 31/jan + 1)
        mesReferencia: 3,
        anoReferencia: 2026,
      }),
      expect.objectContaining({
        numeroParcela: 3,
        dataEfetiva: new Date(2026, 2, 1), // 1/mar/2026 (fechamento clampado p/ 28/fev + 1)
        mesReferencia: 4,
        anoReferencia: 2026,
      }),
    ]);
  });
});
