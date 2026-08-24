import { describe, it, expect } from "vitest";
import { percentualDoDisponivel, faixaDoPercentual } from "./disponivel";

describe("percentualDoDisponivel", () => {
  it("calcula a proporção do disponível sobre as entradas", () => {
    expect(percentualDoDisponivel(24853.4, 47795)).toBeCloseTo(52, 5);
    expect(percentualDoDisponivel(14816.45, 47795)).toBeCloseTo(31, 5);
  });

  it("disponível zerado é 0%, não ausência de base", () => {
    expect(percentualDoDisponivel(0, 47795)).toBe(0);
  });

  it("disponível negativo devolve percentual negativo", () => {
    expect(percentualDoDisponivel(-3200, 47795)).toBeCloseTo(-6.695, 3);
  });

  it("passa de 100% quando as saídas do mês são negativas (mês dominado por estorno)", () => {
    expect(percentualDoDisponivel(60000, 47795)).toBeGreaterThan(100);
  });

  // Sem base de cálculo → null, pra a tela esconder o rótulo.
  it.each([
    ["zero", 0],
    ["negativa", -100],
    ["null", null],
    ["undefined", undefined],
    ["NaN", NaN],
  ])("entradas %s devolvem null", (_rotulo, entradas) => {
    expect(percentualDoDisponivel(1000, entradas)).toBeNull();
  });
});

describe("faixaDoPercentual", () => {
  it.each([
    [52, "otimo"],
    [31, "bom"],
    [17, "atencao"],
    [7, "baixo"],
    [2, "critico"],
  ])("%i%% cai na faixa %s", (percentual, faixa) => {
    expect(faixaDoPercentual(percentual)).toBe(faixa);
  });

  // Limites inclusivos no piso — o valor exato pertence à faixa de cima.
  it.each([
    [40, "otimo"],
    [25, "bom"],
    [10, "atencao"],
    [5, "baixo"],
  ])("exatamente %i%% fica na faixa superior (%s)", (percentual, faixa) => {
    expect(faixaDoPercentual(percentual)).toBe(faixa);
  });

  it("logo abaixo de cada limite cai na faixa de baixo", () => {
    expect(faixaDoPercentual(39.99)).toBe("bom");
    expect(faixaDoPercentual(24.99)).toBe("atencao");
    expect(faixaDoPercentual(9.99)).toBe("baixo");
    expect(faixaDoPercentual(4.99)).toBe("critico");
  });

  it("percentual negativo é crítico, sem tratamento especial", () => {
    expect(faixaDoPercentual(-6.7)).toBe("critico");
    expect(faixaDoPercentual(-500)).toBe("critico");
  });

  it("acima de 100% continua ótimo", () => {
    expect(faixaDoPercentual(125.5)).toBe("otimo");
  });
});
