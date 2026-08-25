import { describe, it, expect } from "vitest";
import {
  INDEXADORES_POR_ESTRATEGIA,
  ROTULO_INDEXADOR,
  DICA_TAXA,
  rotuloIndexador,
} from "./ativos";

describe("INDEXADORES_POR_ESTRATEGIA", () => {
  it("pós-fixado oferece as quatro variações", () => {
    expect(INDEXADORES_POR_ESTRATEGIA.POS_FIXADO).toEqual([
      "PERCENTUAL_CDI",
      "PERCENTUAL_SELIC",
      "CDI_MAIS",
      "SELIC_MAIS",
    ]);
  });

  it("pré-fixado e inflação oferecem um só", () => {
    expect(INDEXADORES_POR_ESTRATEGIA.PRE_FIXADO).toEqual(["PREFIXADO"]);
    expect(INDEXADORES_POR_ESTRATEGIA.INFLACAO).toEqual(["IPCA_MAIS"]);
  });

  it("cada indexador pertence a exatamente uma estratégia", () => {
    const todos = Object.values(INDEXADORES_POR_ESTRATEGIA).flat();
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("todo indexador tem rótulo e dica", () => {
    for (const indexador of Object.values(INDEXADORES_POR_ESTRATEGIA).flat()) {
      expect(ROTULO_INDEXADOR[indexador]).toBeTruthy();
      expect(DICA_TAXA[indexador]).toBeTruthy();
    }
  });
});

describe("rotuloIndexador", () => {
  // O mesmo número significa coisas diferentes conforme o indexador — é por
  // isso que o rótulo não pode ser genérico (Requisitos §3.13.2).
  it("110 é fração em % do CDI e spread em CDI+", () => {
    expect(rotuloIndexador("PERCENTUAL_CDI", 110)).toBe("110% CDI");
    expect(rotuloIndexador("CDI_MAIS", 2)).toBe("CDI + 2%");
  });

  it("formata os demais", () => {
    expect(rotuloIndexador("PERCENTUAL_SELIC", 100)).toBe("100% Selic");
    expect(rotuloIndexador("SELIC_MAIS", 1.5)).toBe("Selic + 1,50%");
    expect(rotuloIndexador("PREFIXADO", 13.2)).toBe("13,20% a.a.");
    expect(rotuloIndexador("IPCA_MAIS", 6.1)).toBe("IPCA + 6,10%");
  });

  it("corta os centavos redundantes de uma taxa inteira", () => {
    expect(rotuloIndexador("PERCENTUAL_CDI", 100)).toBe("100% CDI");
  });
});
