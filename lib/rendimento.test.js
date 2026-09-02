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

describe("IPCA+ por janelas defasadas (M39, revisto no M40)", () => {
  // Os seis feriados que a série do CDI de fato pula em 2026 — carnaval,
  // sexta-feira santa, Tiradentes, 1º de maio e Corpus Christi. Sem eles o
  // calendário sintético conta ~6 dias úteis a mais que o real, o que infla o
  // spread o bastante para tornar qualquer conferência contra extrato inútil.
  const FERIADOS = new Set(["2026-02-16", "2026-02-17", "2026-04-03",
                            "2026-04-21", "2026-05-01", "2026-06-04"]);
  const calendario = (() => {
    const dias = [];
    for (const d = new Date("2026-01-01T00:00:00Z"); d < new Date("2026-10-01T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (![0, 6].includes(d.getUTCDay()) && !FERIADOS.has(iso)) dias.push({ dia: iso, valor: 0 });
    }
    return dias;
  })();
  // Agosto é a PROJEÇÃO da ANBIMA (−0,28%), não índice publicado: em 01/09 o
  // IPCA de agosto ainda não saiu. Sem ele nenhum M0 fecha, porque a janela
  // aberta de um M0 depende sempre do mês corrente (Requisitos §3.24.2).
  const ipca = [["2026-02", 0.7], ["2026-03", 0.88], ["2026-04", 0.67], ["2026-05", 0.58],
                ["2026-06", 0.16], ["2026-07", 0.07], ["2026-08", -0.28]]
                .map(([m, v]) => ({ mes: `${m}-01`, valor: v }));

  const corrigir = (posicao, ate = "2026-08-28") =>
    valorCorrigido(
      { indexador: "IPCA_MAIS", vencimento: "2028-12-15", ...posicao },
      calendario.filter((t) => t.dia >= posicao.dataAquisicao && t.dia <= ate),
      ipca,
    );

  // O caso que originou o M39: CDB do BMG, R$ 7.000 a IPCA + 8,92%, comprado
  // em 08/04/2026, extrato de R$ 7.412,03.
  //
  // **A banda é larga de propósito, e a razão é desconfortável.** A data em que
  // esse extrato foi lido não ficou registrada, e um dia de rendimento vale
  // ~R$ 2,70 aqui. Nessa incerteza o BMG não só deixa de decidir entre as duas
  // regras — ele **troca de lado**: com o calendário deste teste a regra antiga
  // erra −R$ 1,24 e a nova +R$ 10,52, enquanto com o calendário real do CDI a
  // ordem se inverte. O BMG acompanha a regra unificada, não a confirma; quem
  // confirma é o par do Fibra abaixo, onde a diferença é de −R$ 25,84 contra
  // +R$ 0,92 (Requisitos §3.24.5).
  it("acompanha o CDB do BMG dentro da incerteza da data", () => {
    const v = corrigir({ base: 7000, taxa: 8.92, dataAquisicao: "2026-04-08",
                         vencimento: "2028-04-07", defasagemMeses: 2 });
    expect(v).toBeGreaterThan(7405);
    expect(v).toBeLessThan(7430);
  });

  // O par que decidiu a regra unificada: dois M0 do Banco Fibra, saldos lidos
  // no mesmo dia. Ignorando a janela da compra, o modelo erra R$ 26,52 e
  // R$ 3,08; contando-a pro rata, erra centavos.
  it("reproduz o primeiro CDB do Fibra (M0)", () => {
    const v = corrigir({ base: 5000, taxa: 8.6, dataAquisicao: "2026-05-19", defasagemMeses: 0 });
    expect(v).toBeGreaterThan(5150);
    expect(v).toBeLessThan(5155);
  });

  it("reproduz o segundo CDB do Fibra (M0)", () => {
    const v = corrigir({ base: 5000, taxa: 8.75, dataAquisicao: "2026-07-24", defasagemMeses: 0 });
    // Piso apertado de propósito: a regra antiga dava R$ 5.037,40 e passaria
    // numa banda folgada. O teste precisa distinguir as duas regras, não só
    // cercar o extrato.
    expect(v).toBeGreaterThan(5038.5);
    expect(v).toBeLessThan(5041);
  });

  // A regra revogada no M40: a janela da compra ENTRA, contada do dia da
  // compra. Comprar no dia 20 e comprar no dia 1º do mês seguinte caem em
  // janelas diferentes e rendem diferente — antes, os dois começavam no mesmo
  // dia 15 e a compra do dia 20 perdia o pedaço a que tinha direito.
  it("a janela da compra conta pro rata a partir do dia da compra", () => {
    const noDia20 = fatorInflacao(ipca, { dataAquisicao: "2026-05-20", corte: "2026-06-15",
                                          defasagemMeses: 2, calendario });
    expect(noDia20).toBeGreaterThan(1); // antes do M40 isto era exatamente 1
    expect(noDia20).toBeLessThan(1.0067); // e menos que a janela cheia de abril
  });

  it("compra antes do dia 15 cai na janela que abriu no mês anterior", () => {
    // 08/04 está dentro de [15/03, 15/04). Com M-2, essa janela aplica
    // FEVEREIRO, que só entra no cálculo se a janela for considerada.
    const semFevereiro = fatorInflacao(
      ipca.filter((m) => m.mes !== "2026-02-01"),
      { dataAquisicao: "2026-04-08", corte: "2026-04-15", defasagemMeses: 2, calendario },
    );
    const comFevereiro = fatorInflacao(ipca, { dataAquisicao: "2026-04-08", corte: "2026-04-15",
                                               defasagemMeses: 2, calendario });
    expect(semFevereiro).toBe(1);
    expect(comFevereiro).toBeGreaterThan(1);
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

  // M0 é a convenção da NTN-B: a janela aplica o índice do PRÓPRIO mês. Sem o
  // piso em zero o deslocamento vira +1 e a janela aplica o mês SEGUINTE — o
  // defeito que o M40 corrigiu (Requisitos §3.24.1).
  it("defasagem 0 aplica o índice do próprio mês da janela", () => {
    const f = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                    defasagemMeses: 0, calendario });
    expect(f).toBeCloseTo(1.0067, 6); // abril, a própria janela — não maio
  });

  // A regressão que o defeito produzia: com o mapa completo, M0 não "some",
  // ele aplica o mês errado. Fixar os dois lados garante que uma volta ao
  // `-(defasagem - 1)` derrube o teste em vez de passar despercebida.
  it("defasagem 0 não aplica o mês seguinte ao da janela", () => {
    const f = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                    defasagemMeses: 0, calendario });
    expect(f).not.toBeCloseTo(1.0058, 6); // maio, que é o que o defeito aplicava
  });

  // Defasagem 1 já caía no próprio mês antes da correção, e continua caindo:
  // o `Math.max` só muda o comportamento em 0.
  it("defasagem 2 segue no mês anterior ao da janela", () => {
    const f = fatorInflacao(ipca, { dataAquisicao: "2026-04-15", corte: "2026-05-15",
                                    defasagemMeses: 2, calendario });
    expect(f).toBeCloseTo(1.0088, 6); // março
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
