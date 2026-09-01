import { describe, it, expect } from "vitest";
import {
  SERIE_DO_INDEXADOR,
  SERIE_MENSAL_DO_INDEXADOR,
  fatorAcumulado,
  fatorInflacao,
  indicesAplicaveis,
  parametrosDoIndexador,
  taxasAplicaveis,
  valorCorrigido,
} from "./rendimento";

// Taxa constante, para os números fecharem à mão. 0,05166% ao dia é o valor
// real do CDI em agosto/2026.
const DIARIA = 0.051660;
const serie = (dias, de = "2026-01-05") => {
  const inicio = new Date(`${de}T00:00:00Z`);
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio);
    d.setUTCDate(d.getUTCDate() + i);
    return { dia: d.toISOString().slice(0, 10), valor: DIARIA };
  });
};

describe("parametrosDoIndexador", () => {
  it("110 em %CDI é percentual, não spread", () => {
    expect(parametrosDoIndexador("PERCENTUAL_CDI", 110)).toEqual({ percentual: 1.1 });
  });

  it("2 em CDI+ é spread, não percentual", () => {
    expect(parametrosDoIndexador("CDI_MAIS", 2)).toEqual({ spread: 0.02 });
  });

  it("15 em pré-fixado é a taxa ao ano", () => {
    expect(parametrosDoIndexador("PREFIXADO", 15)).toEqual({ prefixado: 0.15 });
  });

  it("6 em IPCA+ é o spread sobre a inflação", () => {
    expect(parametrosDoIndexador("IPCA_MAIS", 6)).toEqual({ inflacao: 0.06 });
  });
});

describe("fatorAcumulado", () => {
  it("um dia a 100% é 1 + a taxa do dia", () => {
    expect(fatorAcumulado(serie(1), { percentual: 1 })).toBeCloseTo(1 + DIARIA / 100, 10);
  });

  it("sem taxa nenhuma o fator é 1", () => {
    expect(fatorAcumulado([], { percentual: 1.1 })).toBe(1);
  });

  // A escolha de convenção do Design §23.3, provada e não assumida.
  it("percentual multiplica a taxa, não expõe o fator", () => {
    const taxas = serie(252);
    const anbima = fatorAcumulado(taxas, { percentual: 1.1 });
    const errada = taxas.reduce((f, t) => f * (1 + Number(t.valor) / 100) ** 1.1, 1);
    expect(anbima).not.toBe(errada);
    // As duas são próximas — o ponto é que a implementada é a primeira.
    expect(anbima).toBeCloseTo((1 + (DIARIA / 100) * 1.1) ** 252, 10);
  });

  it("100% do índice é o índice puro", () => {
    const taxas = serie(60);
    const puro = taxas.reduce((f, t) => f * (1 + Number(t.valor) / 100), 1);
    expect(fatorAcumulado(taxas, { percentual: 1 })).toBeCloseTo(puro, 12);
  });

  it("spread de 2% a.a. rende ~2% a mais em 252 dias úteis", () => {
    const taxas = serie(252);
    const semSpread = fatorAcumulado(taxas, { percentual: 1 });
    const comSpread = fatorAcumulado(taxas, { spread: 0.02 });
    expect(comSpread / semSpread).toBeCloseTo(1.02, 6);
  });
});

describe("fatorAcumulado — pré-fixado", () => {
  it("252 dias a 15% devolvem exatamente 15%", () => {
    expect(fatorAcumulado(serie(252), { prefixado: 0.15 })).toBeCloseTo(1.15, 12);
  });

  it("meia janela devolve a raiz — é proporcional a dias úteis", () => {
    expect(fatorAcumulado(serie(126), { prefixado: 0.15 })).toBeCloseTo(1.15 ** 0.5, 12);
  });

  it("zero dias não rende", () => {
    expect(fatorAcumulado([], { prefixado: 0.15 })).toBe(1);
  });

  // O teste que prova que os modos não vazam um no outro: a lista entra como
  // calendário, e os valores dela são irrelevantes.
  it("ignora os valores das taxas — só conta quantas são", () => {
    const normal = serie(60);
    const absurdo = normal.map((t) => ({ ...t, valor: 99 }));
    const zerado = normal.map((t) => ({ ...t, valor: 0 }));
    const esperado = fatorAcumulado(normal, { prefixado: 0.15 });
    expect(fatorAcumulado(absurdo, { prefixado: 0.15 })).toBe(esperado);
    expect(fatorAcumulado(zerado, { prefixado: 0.15 })).toBe(esperado);
  });
});

describe("taxasAplicaveis", () => {
  const taxas = serie(10); // 05/01 a 14/01

  // Conferido contra o extrato real na Task 130: o dia da compra conta.
  it("o dia da aquisição rende", () => {
    const r = taxasAplicaveis(taxas, { dataAquisicao: "2026-01-05" });
    expect(r).toHaveLength(10);
    expect(r[0].dia).toBe("2026-01-05");
  });

  it("aquisição em dia sem taxa não inventa rendimento", () => {
    // 04/01/2026 é domingo — não existe na série, então nada incide por ele.
    const r = taxasAplicaveis(taxas, { dataAquisicao: "2026-01-04" });
    expect(r.map((t) => t.dia)).not.toContain("2026-01-04");
    expect(r).toHaveLength(10);
  });

  it("o vencimento trunca a série — vencido não rende", () => {
    const r = taxasAplicaveis(taxas, { dataAquisicao: "2026-01-05", vencimento: "2026-01-08" });
    expect(r.map((t) => t.dia)).toEqual(["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"]);
  });

  it("aquisição depois do último dia publicado não rende nada", () => {
    expect(taxasAplicaveis(taxas, { dataAquisicao: "2026-02-01" })).toHaveLength(0);
  });
});

describe("valorCorrigido", () => {
  const posicao = {
    base: 10000,
    indexador: "PERCENTUAL_CDI",
    taxa: 110,
    dataAquisicao: "2026-01-04",
    vencimento: "2030-01-01",
  };

  it("corrige pela base, não pelo valor de aquisição", () => {
    // `base` é o remanescente do M29 — a liquidação parcial do M33 depende disto.
    const parcial = { ...posicao, base: 5500 };
    const cheio = valorCorrigido(posicao, serie(30));
    const meio = valorCorrigido(parcial, serie(30));
    expect(meio / cheio).toBeCloseTo(0.55, 12);
  });

  it("sem taxa nenhuma devolve a base intacta — é o caminho do BC fora do ar", () => {
    expect(valorCorrigido(posicao, [])).toBe(10000);
  });

  it("pré-fixado rende pela própria taxa, contando os dias da série", () => {
    // Aquisição em 04/01 e série começando em 05/01: os 252 dias contam.
    const pre = { ...posicao, indexador: "PREFIXADO", taxa: 15 };
    expect(valorCorrigido(pre, serie(252))).toBeCloseTo(11500, 6);
  });

  it("pré-fixado vencido para de render", () => {
    const pre = { ...posicao, indexador: "PREFIXADO", taxa: 15, vencimento: "2026-01-14" };
    // 05/01 a 14/01 = 10 dias na série.
    expect(valorCorrigido(pre, serie(252))).toBeCloseTo(10000 * 1.15 ** (10 / 252), 6);
  });

  it("IPCA+ sem índice nenhum rende só o spread", () => {
    const ipca = { ...posicao, indexador: "IPCA_MAIS", taxa: 6 };
    const v = valorCorrigido(ipca, serie(252), []);
    expect(v).toBeCloseTo(10000 * 1.06, 6);
  });

  it("um ano a 110% do CDI bate com a conta feita à mão", () => {
    const esperado = 10000 * (1 + (DIARIA / 100) * 1.1) ** 252;
    expect(valorCorrigido(posicao, serie(252))).toBeCloseTo(esperado, 6);
    // Âncora calculada por fora, em Python, com produtório e com exponenciação
    // — as duas dão 11539,15. Serve para o teste não conferir a implementação
    // contra ela mesma.
    expect(valorCorrigido(posicao, serie(252))).toBeCloseTo(11539.15, 2);
  });

  it("vencido para de render na data de vencimento", () => {
    const vencido = { ...posicao, vencimento: "2026-01-14" };
    const ateOVencimento = valorCorrigido(vencido, serie(10));
    const comSerieLonga = valorCorrigido(vencido, serie(252));
    expect(comSerieLonga).toBe(ateOVencimento);
  });
});

describe("SERIE_DO_INDEXADOR", () => {
  it("cobre os seis indexadores do schema", () => {
    expect(Object.keys(SERIE_DO_INDEXADOR).sort()).toEqual(
      ["CDI_MAIS", "IPCA_MAIS", "PERCENTUAL_CDI", "PERCENTUAL_SELIC", "PREFIXADO", "SELIC_MAIS"]
    );
  });

  it("todos os seis têm série diária: as quatro por taxa, duas por calendário", () => {
    expect(Object.values(SERIE_DO_INDEXADOR).filter((s) => s === null)).toHaveLength(0);
    expect(SERIE_DO_INDEXADOR.PREFIXADO).toBe("CDI");
    expect(SERIE_DO_INDEXADOR.IPCA_MAIS).toBe("CDI");
  });

  it("só o IPCA+ tem índice mensal", () => {
    expect(Object.keys(SERIE_MENSAL_DO_INDEXADOR)).toEqual(["IPCA_MAIS"]);
  });
});

describe("IPCA+ (M36)", () => {
  const meses = (lista) => lista.map(([mes, valor]) => ({ mes, valor }));
  const base = {
    base: 10000, indexador: "IPCA_MAIS", taxa: 0,
    dataAquisicao: "2026-03-15", vencimento: "2030-01-01",
  };

  it("um mês fechado a 0,5% rende 0,5%", () => {
    expect(fatorInflacao(meses([["2026-04-01", 0.5]]), 0)).toBeCloseTo(1.005, 12);
  });

  // O que nenhum outro indexador do app faz.
  it("mês negativo DERRUBA o valor abaixo da base", () => {
    const v = valorCorrigido(base, [], meses([["2026-03-01", -0.36]]));
    expect(v).toBeLessThan(10000);
    expect(v).toBeCloseTo(10000 * 0.9964, 6);
  });

  it("não existe piso: deflação seguida derruba mais", () => {
    const um = valorCorrigido(base, [], meses([["2026-03-01", -0.3]]));
    const dois = valorCorrigido(base, [], meses([["2026-03-01", -0.3], ["2026-04-01", -0.3]]));
    expect(dois).toBeLessThan(um);
  });

  it("o mês da compra conta inteiro, mesmo comprando no dia 28", () => {
    const tarde = { ...base, dataAquisicao: "2026-03-28" };
    const doMes = meses([["2026-03-01", 1.0]]);
    expect(valorCorrigido(tarde, [], doMes)).toBeCloseTo(10100, 6);
  });

  it("meses anteriores à compra não entram", () => {
    const anteriores = meses([["2026-01-01", 5], ["2026-02-01", 5], ["2026-03-01", 0.5]]);
    expect(valorCorrigido(base, [], anteriores)).toBeCloseTo(10050, 6);
  });

  it("o vencimento trunca os meses", () => {
    const curto = { ...base, vencimento: "2026-04-30" };
    const lista = meses([["2026-03-01", 1], ["2026-04-01", 1], ["2026-05-01", 1]]);
    expect(valorCorrigido(curto, [], lista)).toBeCloseTo(10000 * 1.01 * 1.01, 6);
  });

  it("índice e spread se multiplicam", () => {
    const comSpread = { ...base, taxa: 6 };
    const lista = meses([["2026-03-01", 1]]);
    const v = valorCorrigido(comSpread, Array(252).fill({ dia: "2026-03-16", valor: 0 }), lista);
    expect(v).toBeCloseTo(10000 * 1.01 * 1.06, 4);
  });
});

describe("indicesAplicaveis", () => {
  const lista = [["2026-01-01", 1], ["2026-02-01", 1], ["2026-03-01", 1], ["2026-04-01", 1]]
    .map(([mes, valor]) => ({ mes, valor }));

  it("abre no primeiro dia do mês da aquisição", () => {
    const r = indicesAplicaveis(lista, { dataAquisicao: "2026-02-20" });
    expect(r.map((m) => m.mes)).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
  });

  it("fecha no vencimento", () => {
    const r = indicesAplicaveis(lista, { dataAquisicao: "2026-01-05", vencimento: "2026-03-31" });
    expect(r.map((m) => m.mes)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });
});
