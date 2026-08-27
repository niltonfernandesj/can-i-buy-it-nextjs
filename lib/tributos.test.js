import { describe, it, expect } from "vitest";
import { aliquotaIR, aliquotaIOF, diasCorridos, tributos } from "./tributos";

describe("aliquotaIR — as bordas das faixas", () => {
  it.each([[1, .225], [180, .225], [181, .20], [360, .20], [361, .175], [720, .175], [721, .15], [3000, .15]])(
    "%i dias → %f", (dias, esperada) => expect(aliquotaIR(dias)).toBe(esperada));
});

describe("aliquotaIOF", () => {
  it.each([[1, .96], [15, .50], [29, .03], [30, 0], [31, 0], [400, 0]])(
    "%i dias → %f", (dias, esperada) => expect(aliquotaIOF(dias)).toBeCloseTo(esperada, 10));

  // O motivo de a tabela ser literal em vez de fórmula.
  it("não é (30−n)/30 — a aproximação erra", () => {
    expect(aliquotaIOF(10)).toBe(0.66);
    expect((30 - 10) / 30).toBeCloseTo(0.6667, 4);
    expect(aliquotaIOF(10)).not.toBeCloseTo((30 - 10) / 30, 3);
  });
});

describe("diasCorridos", () => {
  it("conta calendário, não dias úteis", () => {
    // Sexta a segunda: 1 dia útil de rendimento, 3 corridos de imposto.
    expect(diasCorridos("2026-08-21", "2026-08-24")).toBe(3);
  });

  it("atravessa mês e ano sem erro", () => {
    expect(diasCorridos("2025-12-31", "2026-01-01")).toBe(1);
    expect(diasCorridos("2026-01-31", "2026-03-01")).toBe(29);
  });

  it("não devolve negativo", () => {
    expect(diasCorridos("2026-08-26", "2026-08-01")).toBe(0);
  });
});

describe("tributos", () => {
  const cdb = { produto: "CDB", base: 10000, corrigido: 11000,
                dataAquisicao: "2025-01-02", corte: "2026-08-26" }; // >600 dias

  it("LCI é isenta — líquido igual ao bruto", () => {
    const r = tributos({ ...cdb, produto: "LCI" });
    expect(r).toEqual({ ir: 0, iof: 0, liquido: 11000 });
  });

  it("LCA é isenta", () => {
    expect(tributos({ ...cdb, produto: "LCA" }).liquido).toBe(11000);
  });

  it("CDB longo paga 17,5% sobre o rendimento", () => {
    const r = tributos(cdb);
    expect(r.iof).toBe(0);
    expect(r.ir).toBeCloseTo(1000 * 0.175, 6);
    expect(r.liquido).toBeCloseTo(11000 - 175, 6);
  });

  it("CDB curto paga IOF e IR sobre o que sobrou", () => {
    // 10 dias corridos: IOF 66%, depois IR de 22,5% sobre o resto.
    const r = tributos({ produto: "CDB", base: 1000, corrigido: 1100,
                         dataAquisicao: "2026-08-01", corte: "2026-08-11" });
    expect(r.iof).toBeCloseTo(100 * 0.66, 6);
    expect(r.ir).toBeCloseTo((100 - 66) * 0.225, 6);
    expect(r.liquido).toBeCloseTo(1100 - 66 - 7.65, 6);
  });

  // A ordem NÃO muda o total — R(a+b−ab) nos dois sentidos. Muda a repartição,
  // e como o app exibe IR e IOF separados, é isso que a ordem legal define.
  it("a ordem não altera o total, só a repartição", () => {
    const r = tributos({ produto: "CDB", base: 1000, corrigido: 1100,
                         dataAquisicao: "2026-08-01", corte: "2026-08-11" });
    const irPrimeiro = 100 * 0.225;
    const iofDepois = (100 - irPrimeiro) * 0.66;

    expect(r.ir + r.iof).toBeCloseTo(irPrimeiro + iofDepois, 10); // mesmo total
    expect(r.iof).toBeCloseTo(66, 6);      // ordem legal: IOF come primeiro
    expect(r.ir).toBeCloseTo(7.65, 6);
    expect(r.ir).not.toBeCloseTo(irPrimeiro, 2); // e a repartição é outra
  });

  // O caso que o QA da Task 134 expôs: posição comprada no mesmo dia do corte.
  it("posição de zero dias com rendimento paga IOF de um dia", () => {
    const r = tributos({ produto: "CDB", base: 10000, corrigido: 10005.68,
                         dataAquisicao: "2026-08-26", corte: "2026-08-26" });
    expect(r.iof).toBeCloseTo(5.68 * 0.96, 6);
    expect(r.liquido).toBeLessThan(10001);
  });

  it("o piso de um dia não desloca as faixas de IR", () => {
    // 180 dias corridos continuam 180, não 181.
    const r = tributos({ produto: "CDB", base: 10000, corrigido: 11000,
                         dataAquisicao: "2026-01-01", corte: "2026-06-30" });
    expect(r.ir).toBeCloseTo(1000 * 0.225, 6);
  });

  it("posição sem rendimento não gera imposto negativo", () => {
    const r = tributos({ ...cdb, corrigido: 10000 });
    expect(r).toEqual({ ir: 0, iof: 0, liquido: 10000 });
  });

  it("o corte manda, não a data de hoje", () => {
    // Mesmo rendimento, cortes diferentes: faixas de IR diferentes.
    const curto = tributos({ produto: "CDB", base: 10000, corrigido: 11000,
                             dataAquisicao: "2026-01-01", corte: "2026-06-01" }); // 151 dias
    const longo = tributos({ produto: "CDB", base: 10000, corrigido: 11000,
                             dataAquisicao: "2026-01-01", corte: "2026-08-01" }); // 212 dias
    expect(curto.ir).toBeCloseTo(1000 * 0.225, 6);
    expect(longo.ir).toBeCloseTo(1000 * 0.20, 6);
  });
});
