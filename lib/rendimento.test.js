import { describe, it, expect } from "vitest";
import {
  SERIE_DO_INDEXADOR,
  SERIE_MENSAL_DO_INDEXADOR,
  fatorAcumulado,
  fatorInflacao,
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

describe("IPCA+ por janelas defasadas (M39)", () => {
  // Calendário de dias úteis: todos os dias de semana do período.
  const calendario = (() => {
    const dias = [];
    for (const d = new Date("2026-01-01T00:00:00Z"); d < new Date("2026-10-01T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
      if (![0, 6].includes(d.getUTCDay())) dias.push({ dia: d.toISOString().slice(0, 10), valor: 0 });
    }
    return dias;
  })();
  const ipca = [["2026-02", 0.7], ["2026-03", 0.88], ["2026-04", 0.67], ["2026-05", 0.58],
                ["2026-06", 0.16], ["2026-07", 0.07]].map(([m, v]) => ({ mes: `${m}-01`, valor: v }));

  // O caso real que originou o marco: CDB do BMG, R$ 7.000 a IPCA + 8,92%,
  // comprado em 08/04/2026. Extrato da corretora em 01/09: R$ 7.412,03.
  it("reproduz o CDB do BMG contra o extrato", () => {
    const v = valorCorrigido(
      { base: 7000, indexador: "IPCA_MAIS", taxa: 8.92,
        dataAquisicao: "2026-04-08", vencimento: "2028-04-07", defasagemMeses: 2 },
      calendario.filter((t) => t.dia >= "2026-04-08" && t.dia <= "2026-08-31"),
      ipca,
    );
    expect(v).toBeGreaterThan(7400);
    expect(v).toBeLessThan(7425);
  });

  // O off-by-one do rótulo: "M-2" conta do mês corrente, e a janela abriu um
  // mês antes. A janela de 15/04 com M-2 aplica MARÇO, não fevereiro.
  it("o rótulo M-N desloca N-1 meses a partir do mês da janela", () => {
    const m2 = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                     defasagemMeses: 2, calendario });
    const m1 = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                     defasagemMeses: 1, calendario });
    const m3 = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                     defasagemMeses: 3, calendario });
    expect(m2).toBeCloseTo(1.0088, 6); // março
    expect(m1).toBeCloseTo(1.0067, 6); // abril, o próprio mês da janela
    expect(m3).toBeCloseTo(1.007, 6);  // fevereiro
  });

  it("janela integralmente vivida dá o fator cheio", () => {
    const f = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                    defasagemMeses: 2, calendario });
    expect(f).toBeCloseTo(1.0088, 8);
  });

  it("meia janela dá aproximadamente a raiz", () => {
    const meia = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-04-30",
                                       defasagemMeses: 2, calendario });
    expect(meia).toBeGreaterThan(1);
    expect(meia).toBeLessThan(1.0088);
  });

  it("mês sem índice publicado não quebra nem inventa", () => {
    const f = fatorInflacao([], { dataAquisicao: "2026-04-15", corte: "2026-08-15",
                                  defasagemMeses: 2, calendario });
    expect(f).toBe(1);
  });

  it("deflação derruba o fator abaixo de 1", () => {
    // Janela [15/05,15/06) com M-2 aplica ABRIL.
    const negativo = [{ mes: "2026-04-01", valor: -0.36 }];
    const f = fatorInflacao(negativo, { dataAquisicao: "2026-05-15", corte: "2026-06-15",
                                        defasagemMeses: 2, calendario });
    expect(f).toBeLessThan(1);
  });

  it("corte antes da aquisição não rende nada", () => {
    expect(fatorInflacao(ipca, { dataAquisicao: "2026-06-01", corte: "2026-05-01",
                                 defasagemMeses: 2, calendario })).toBe(1);
  });
});
