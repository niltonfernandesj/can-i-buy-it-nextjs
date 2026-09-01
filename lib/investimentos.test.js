import { describe, it, expect } from "vitest";
import { SOMENTE_VIVOS, agruparPor, apenasVivas, baseAtual, dataBase, estaViva, percentualNoPatrimonio, saldoEmConta, saldoInvestido } from "./investimentos";
import { valorCorrigido } from "./rendimento";
import { tributos } from "./tributos";

const CONTA_A = { id: "c1", nome: "Alfa" };
const CONTA_B = { id: "c2", nome: "Beta" };

function ativo(overrides = {}) {
  return {
    id: "a1",
    conta: CONTA_A,
    contaId: CONTA_A.id,
    mercado: "RENDA_FIXA",
    estrategia: "POS_FIXADO",
    valorAquisicao: 10000,
    dataAquisicao: new Date(2026, 0, 15),
    vencimento: new Date(2028, 2, 15),
    liquidacoes: [],
    ...overrides,
  };
}

describe("baseAtual", () => {
  it("sem liquidação, é o valor de aquisição", () => {
    expect(baseAtual(ativo())).toBe(10000);
  });

  it("com resgate parcial, é o remanescente do evento", () => {
    const a = ativo({
      liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 }],
    });
    expect(baseAtual(a)).toBe(5500);
  });

  it("com vários eventos, é o remanescente do MAIS RECENTE — não o último do array", () => {
    const a = ativo({
      liquidacoes: [
        { data: new Date(2026, 9, 1), valorRecebido: 2000, valorRemanescente: 3600 },
        { data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 },
      ],
    });
    expect(baseAtual(a)).toBe(3600);
  });
});

describe("estaViva", () => {
  it("sem evento algum, está viva", () => {
    expect(estaViva(ativo())).toBe(true);
  });

  it("com remanescente maior que zero, está viva", () => {
    const a = ativo({ liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 }] });
    expect(estaViva(a)).toBe(true);
  });

  it("com remanescente zero, encerrou", () => {
    const a = ativo({ liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 10800, valorRemanescente: 0 }] });
    expect(estaViva(a)).toBe(false);
  });

  // A regra dos Requisitos §3.13.2: o que encerra é o remanescente, não a data.
  it("vencido e não liquidado continua vivo", () => {
    const a = ativo({ vencimento: new Date(2020, 0, 1), liquidacoes: [] });
    expect(estaViva(a)).toBe(true);
  });
});

describe("saldoInvestido", () => {
  it("soma a base atual só das posições vivas", () => {
    const vivos = [
      ativo({ id: "a1", valorAquisicao: 20000 }),
      ativo({ id: "a2", valorAquisicao: 10000, liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 }] }),
      ativo({ id: "a3", valorAquisicao: 8000, liquidacoes: [{ data: new Date(2026, 5, 1), valorRecebido: 8400, valorRemanescente: 0 }] }),
    ];
    // 20.000 (sem evento) + 5.500 (remanescente) + 0 (encerrada, fora)
    expect(saldoInvestido(vivos)).toBe(25500);
    expect(apenasVivas(vivos).map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("conta sem ativo algum tem saldo investido zero", () => {
    expect(saldoInvestido([])).toBe(0);
  });

  it("vencido e não liquidado continua somando", () => {
    expect(saldoInvestido([ativo({ vencimento: new Date(2020, 0, 1), valorAquisicao: 7000 })])).toBe(7000);
  });
});

describe("saldoEmConta", () => {
  it("aporte menos aquisição é o que sobra parado", () => {
    const saldo = saldoEmConta({ aportes: 50000, ativos: [ativo({ valorAquisicao: 20000 })] });
    expect(saldo).toBe(30000);
  });

  // A sutileza que a fórmula esconde (Design §20.2).
  it("a aquisição debita PARA SEMPRE — inclusive de posição já liquidada", () => {
    const liquidada = ativo({
      valorAquisicao: 20000,
      liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 21284.5, valorRemanescente: 0 }],
    });
    // 50.000 aportados − 20.000 da aquisição + 21.284,50 recebidos = 51.284,50.
    // Se o somatório de aquisições ignorasse as liquidadas, daria 71.284,50 —
    // o caixa teria reaparecido sozinho no dia do vencimento.
    expect(saldoEmConta({ aportes: 50000, ativos: [liquidada] })).toBeCloseTo(51284.5, 2);
  });

  it("resgate para a conta corrente diminui o saldo", () => {
    expect(saldoEmConta({ aportes: 50000, resgates: 12000, ativos: [] })).toBe(38000);
  });

  it("movimento de crédito aumenta e de débito diminui", () => {
    expect(saldoEmConta({ aportes: 10000, creditos: 312.45, debitos: 27.9, ativos: [] })).toBeCloseTo(10284.55, 2);
  });

  it("resgate parcial devolve só o recebido, e a posição segue com o remanescente", () => {
    const parcial = ativo({
      valorAquisicao: 10000,
      liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 }],
    });
    // 10.000 aportados − 10.000 da aquisição + 5.000 recebidos = 5.000 parados,
    // e 5.500 seguem investidos.
    expect(saldoEmConta({ aportes: 10000, ativos: [parcial] })).toBe(5000);
    expect(saldoInvestido([parcial])).toBe(5500);
  });

  it("conta zerada em tudo devolve zero", () => {
    expect(saldoEmConta({})).toBe(0);
  });
});

describe("percentualNoPatrimonio", () => {
  it("calcula a participação", () => {
    expect(percentualNoPatrimonio(35000, 60700)).toBeCloseTo(57.66, 2);
  });

  it("patrimônio zerado devolve null, não zero", () => {
    expect(percentualNoPatrimonio(0, 0)).toBeNull();
    expect(percentualNoPatrimonio(100, -5)).toBeNull();
  });

  // Requisitos §3.13.4: o card de saldo parado, ao final, é o que fecha os
  // 100% — sozinhos, os grupos de posições não fecham.
  it("o parado fecha os 100% do patrimônio", () => {
    const patrimonio = 60700;
    const grupos = [35000, 12000, 10000];
    const somaGrupos = grupos.reduce((t, v) => t + percentualNoPatrimonio(v, patrimonio), 0);
    expect(somaGrupos).toBeLessThan(100);
    expect(somaGrupos + percentualNoPatrimonio(3700, patrimonio)).toBeCloseTo(100, 6);
  });
});

describe("agruparPor", () => {
  const carteira = [
    ativo({ id: "a1", conta: CONTA_A, contaId: "c1", estrategia: "POS_FIXADO", valorAquisicao: 20000 }),
    ativo({ id: "a2", conta: CONTA_B, contaId: "c2", estrategia: "POS_FIXADO", valorAquisicao: 15000 }),
    ativo({ id: "a3", conta: CONTA_B, contaId: "c2", estrategia: "PRE_FIXADO", valorAquisicao: 12000 }),
    ativo({ id: "a4", conta: CONTA_A, contaId: "c1", estrategia: "INFLACAO", valorAquisicao: 10000 }),
    ativo({ id: "a5", conta: CONTA_A, contaId: "c1", estrategia: "POS_FIXADO", valorAquisicao: 9000,
            liquidacoes: [{ data: new Date(2026, 5, 1), valorRecebido: 9400, valorRemanescente: 0 }] }),
  ];

  it("agrupa por estratégia, em ordem decrescente de valor", () => {
    const grupos = agruparPor(carteira, "estrategia");
    expect(grupos.map((g) => [g.chave, g.total])).toEqual([
      ["POS_FIXADO", 35000],
      ["PRE_FIXADO", 12000],
      ["INFLACAO", 10000],
    ]);
  });

  it("posição encerrada não entra em grupo nenhum", () => {
    const grupos = agruparPor(carteira, "estrategia");
    const ids = grupos.flatMap((g) => g.contas.flatMap((c) => c.ativos.map((a) => a.id)));
    expect(ids).not.toContain("a5");
  });

  it("dentro do grupo, uma seção por conta, ordenada por nome", () => {
    const posFixado = agruparPor(carteira, "estrategia")[0];
    expect(posFixado.contas.map((c) => [c.nome, c.total])).toEqual([
      ["Alfa", 20000],
      ["Beta", 15000],
    ]);
  });

  it("a mesma função agrupa por mercado, com um card só hoje", () => {
    const grupos = agruparPor(carteira, "mercado");
    expect(grupos).toHaveLength(1);
    expect(grupos[0].chave).toBe("RENDA_FIXA");
    expect(grupos[0].total).toBe(57000);
  });

  it("usa a base atual, não o valor de aquisição, em posição parcialmente resgatada", () => {
    const parcial = ativo({ id: "p", valorAquisicao: 10000,
      liquidacoes: [{ data: new Date(2026, 6, 1), valorRecebido: 5000, valorRemanescente: 5500 }] });
    expect(agruparPor([parcial], "estrategia")[0].total).toBe(5500);
  });

  it("carteira vazia devolve lista vazia", () => {
    expect(agruparPor([], "estrategia")).toEqual([]);
  });
});

describe("SOMENTE_VIVOS", () => {
  it("é o filtro Prisma de posição sem evento que zerou o remanescente", () => {
    expect(SOMENTE_VIVOS).toEqual({ liquidacoes: { none: { valorRemanescente: 0 } } });
  });
});

describe("dataBase — a âncora do rendimento (M33)", () => {
  const compra = new Date(2026, 0, 15);

  it("sem evento, ancora na aquisição", () => {
    expect(dataBase({ dataAquisicao: compra, liquidacoes: [] })).toEqual(compra);
  });

  it("com evento, ancora nele — a base nova só existe a partir dali", () => {
    const resgate = new Date(2026, 5, 10);
    expect(dataBase({
      dataAquisicao: compra,
      liquidacoes: [{ data: resgate, valorRecebido: 5000, valorRemanescente: 5500 }],
    })).toEqual(resgate);
  });

  it("com vários eventos, ancora no mais recente", () => {
    const primeiro = new Date(2026, 2, 1);
    const segundo = new Date(2026, 6, 1);
    expect(dataBase({
      dataAquisicao: compra,
      liquidacoes: [
        { data: primeiro, valorRecebido: 1000, valorRemanescente: 9000 },
        { data: segundo, valorRecebido: 2000, valorRemanescente: 7000 },
      ],
    })).toEqual(segundo);
  });

  // O buraco que a liquidação repetível abre: com um evento por posição a
  // ordem nunca importava.
  it("dois eventos no MESMO dia: vale o mais recente por criadoEm", () => {
    const dia = new Date(2026, 6, 1);
    const ativo = {
      dataAquisicao: compra,
      liquidacoes: [
        { data: dia, criadoEm: new Date(2026, 6, 1, 9), valorRecebido: 1000, valorRemanescente: 9000 },
        { data: dia, criadoEm: new Date(2026, 6, 1, 17), valorRecebido: 2000, valorRemanescente: 7000 },
      ],
    };
    expect(baseAtual(ativo)).toBe(7000);
    // E a ordem de entrada não pode mudar o resultado.
    const invertido = { ...ativo, liquidacoes: [...ativo.liquidacoes].reverse() };
    expect(baseAtual(invertido)).toBe(7000);
  });
});

describe("rendimento por trechos (M33)", () => {
  const taxa = { valor: 0.05 };
  const serie = (de, dias) => Array.from({ length: dias }, (_, i) => {
    const d = new Date(`${de}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { dia: d.toISOString().slice(0, 10), ...taxa };
  });

  it("a base remanescente rende só a partir do evento", () => {
    const todas = serie("2026-01-05", 100);
    const posEvento = todas.filter((t) => t.dia >= "2026-03-01");

    const comSerieInteira = valorCorrigido(
      { base: 5500, indexador: "PERCENTUAL_CDI", taxa: 100,
        dataAquisicao: "2026-03-01", vencimento: "2030-01-01" }, todas);
    const soComOTrecho = valorCorrigido(
      { base: 5500, indexador: "PERCENTUAL_CDI", taxa: 100,
        dataAquisicao: "2026-03-01", vencimento: "2030-01-01" }, posEvento);

    // A âncora recorta a série: alimentar tudo dá o mesmo que alimentar o trecho.
    expect(comSerieInteira).toBeCloseTo(soComOTrecho, 10);
    // E é menos do que corrigir desde a compra, que seria o erro.
    const errado = valorCorrigido(
      { base: 5500, indexador: "PERCENTUAL_CDI", taxa: 100,
        dataAquisicao: "2026-01-05", vencimento: "2030-01-01" }, todas);
    expect(errado).toBeGreaterThan(comSerieInteira);
  });
});

describe("as duas âncoras não se confundem (M33)", () => {
  it("resgate recente NÃO derruba a alíquota de uma posição antiga", () => {
    // Comprada há mais de 720 dias: faixa de 15%.
    const aquisicao = "2023-01-10";
    const evento = "2026-08-30";
    const corte = "2026-09-01";

    const certo = tributos({ produto: "CDB", base: 10000, corrigido: 11000,
                             dataAquisicao: aquisicao, corte });
    const erradoAncorandoNoEvento = tributos({ produto: "CDB", base: 10000, corrigido: 11000,
                                               dataAquisicao: evento, corte });

    // O certo: 720+ dias corridos, faixa de 15% e nenhum IOF.
    expect(certo.ir).toBeCloseTo(1000 * 0.15, 6);
    expect(certo.iof).toBe(0);

    // O erro não é "alíquota menor" — é a posição parecer NOVA: dois dias
    // corridos disparam IOF de 93%, e o imposto total quase sextuplica.
    expect(erradoAncorandoNoEvento.iof).toBeGreaterThan(0);
    const totalCerto = certo.ir + certo.iof;
    const totalErrado = erradoAncorandoNoEvento.ir + erradoAncorandoNoEvento.iof;
    expect(totalErrado).toBeGreaterThan(totalCerto * 5);
    expect(erradoAncorandoNoEvento.liquido).toBeLessThan(certo.liquido);
  });
});
