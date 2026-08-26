import { describe, it, expect } from "vitest";
import { ehFutura, hojeISO, paraDataLocal } from "./datas";

describe("ehFutura", () => {
  const hoje = new Date();
  const emDias = (n) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + n);
    return d;
  };

  it("ontem não é futura", () => {
    expect(ehFutura(emDias(-1))).toBe(false);
  });

  it("amanhã é futura", () => {
    expect(ehFutura(emDias(1))).toBe(true);
  });

  // O corte é o fim do dia, não o instante — este é o teste que sustenta a
  // escolha: com `new Date()` no lugar, ele falharia a partir de 00h01.
  it("hoje à meia-noite não é futura", () => {
    const d = new Date(hoje);
    d.setHours(0, 0, 0, 0);
    expect(ehFutura(d)).toBe(false);
  });

  it("hoje às 23h59 não é futura", () => {
    const d = new Date(hoje);
    d.setHours(23, 59, 59, 0);
    expect(ehFutura(d)).toBe(false);
  });

  it("a data que vem do input de hoje não é futura", () => {
    expect(ehFutura(paraDataLocal(hojeISO()))).toBe(false);
  });
});

describe("hojeISO", () => {
  it("devolve YYYY-MM-DD", () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("bate com a data local, não com a UTC", () => {
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(hojeISO()).toBe(esperado);
  });
});
