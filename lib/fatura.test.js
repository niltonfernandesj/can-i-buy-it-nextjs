import { describe, it, expect } from "vitest";
import { calcularFatura } from "./fatura";

describe("calcularFatura", () => {
  describe("cartão com fechamento dia 25, vencimento dia 5 (vencimento < fechamento)", () => {
    it("compra antes do fechamento (10/ago) → fecha em ago, vence set/2026", () => {
      const resultado = calcularFatura(new Date(2026, 7, 10), 25, 5);
      expect(resultado).toEqual({
        mesFechamento: 8,
        anoFechamento: 2026,
        mesReferencia: 9,
        anoReferencia: 2026,
      });
    });

    it("compra depois do fechamento (26/ago) → fecha em set, vence out/2026", () => {
      const resultado = calcularFatura(new Date(2026, 7, 26), 25, 5);
      expect(resultado).toEqual({
        mesFechamento: 9,
        anoFechamento: 2026,
        mesReferencia: 10,
        anoReferencia: 2026,
      });
    });

    it("compra em 25/dez (limite exato) → fecha em dez/2026, vence jan/2027 (rollover de ano)", () => {
      const resultado = calcularFatura(new Date(2026, 11, 25), 25, 5);
      expect(resultado).toEqual({
        mesFechamento: 12,
        anoFechamento: 2026,
        mesReferencia: 1,
        anoReferencia: 2027,
      });
    });
  });

  describe("cartão com fechamento dia 10, vencimento dia 17 (vencimento no mesmo mês do fechamento)", () => {
    it("compra antes do fechamento (5/ago) → fecha e vence em ago/2026", () => {
      const resultado = calcularFatura(new Date(2026, 7, 5), 10, 17);
      expect(resultado).toEqual({
        mesFechamento: 8,
        anoFechamento: 2026,
        mesReferencia: 8,
        anoReferencia: 2026,
      });
    });

    it("compra depois do fechamento (15/ago) → fecha e vence em set/2026 (rollover de mês)", () => {
      const resultado = calcularFatura(new Date(2026, 7, 15), 10, 17);
      expect(resultado).toEqual({
        mesFechamento: 9,
        anoFechamento: 2026,
        mesReferencia: 9,
        anoReferencia: 2026,
      });
    });
  });

  describe("caso de borda: fechamento em dia inexistente no mês", () => {
    it("fechamento dia 31, compra em fevereiro → sempre antes do fechamento (fecha no próprio mês)", () => {
      const resultado = calcularFatura(new Date(2026, 1, 28), 31, 10);
      expect(resultado).toEqual({
        mesFechamento: 2,
        anoFechamento: 2026,
        mesReferencia: 3,
        anoReferencia: 2026,
      });
    });

    it("fechamento dia 31, compra no último dia de fevereiro em ano bissexto (29/fev) → mesmo comportamento", () => {
      const resultado = calcularFatura(new Date(2028, 1, 29), 31, 10);
      expect(resultado).toEqual({
        mesFechamento: 2,
        anoFechamento: 2028,
        mesReferencia: 3,
        anoReferencia: 2028,
      });
    });
  });
});
