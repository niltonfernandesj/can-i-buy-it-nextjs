import { describe, it, expect } from "vitest";
import {
  dataFechamentoDaReferencia,
  creditoAindaEstimavel,
  debitoAindaEstimavel,
  comporMes,
} from "./projecao";

describe("dataFechamentoDaReferencia", () => {
  it("cartão fech. 25, venc. 5 (venc < fech) — mês de referência set/2026 fechou em 25/ago/2026", () => {
    const resultado = dataFechamentoDaReferencia(9, 2026, { diaFechamento: 25, diaVencimento: 5 });
    expect(resultado).toEqual(new Date(2026, 7, 25, 23, 59, 59, 999));
  });

  it("cartão fech. 10, venc. 17 (venc >= fech) — mês de referência ago/2026 fechou em 10/ago/2026", () => {
    const resultado = dataFechamentoDaReferencia(8, 2026, { diaFechamento: 10, diaVencimento: 17 });
    expect(resultado).toEqual(new Date(2026, 7, 10, 23, 59, 59, 999));
  });

  it("caso 11 — fechamento dia 31, mês de referência de 30 dias (abril) clampa pro último dia", () => {
    const resultado = dataFechamentoDaReferencia(4, 2026, { diaFechamento: 31, diaVencimento: 31 });
    expect(resultado).toEqual(new Date(2026, 3, 30, 23, 59, 59, 999));
  });
});

describe("creditoAindaEstimavel", () => {
  it("caso 6 — fatura já fechada em todos os cartões → false", () => {
    const cartao = { diaFechamento: 10, diaVencimento: 17 }; // fecha 10/ago/2026
    const hoje = new Date(2026, 7, 15); // 15/ago, depois do fechamento
    expect(creditoAindaEstimavel(8, 2026, [cartao], hoje)).toBe(false);
  });

  it("caso 7 — dois cartões com fechamentos distintos, um fechado e outro não → true", () => {
    const cartaoFechado = { diaFechamento: 5, diaVencimento: 10 }; // fecha 5/ago/2026
    const cartaoAberto = { diaFechamento: 25, diaVencimento: 28 }; // fecha 25/ago/2026
    const hoje = new Date(2026, 7, 15); // depois do primeiro, antes do segundo
    expect(creditoAindaEstimavel(8, 2026, [cartaoFechado, cartaoAberto], hoje)).toBe(true);
  });

  it("caso 8 — nenhum cartão cadastrado → false", () => {
    const hoje = new Date(2026, 7, 1);
    expect(creditoAindaEstimavel(8, 2026, [], hoje)).toBe(false);
  });

  it("caso 11 — fechamento dia 31 em mês de 30 dias, hoje ainda dentro da fronteira clampada → true", () => {
    const cartao = { diaFechamento: 31, diaVencimento: 31 }; // clampa pra 30/abr/2026
    const hoje = new Date(2026, 3, 30, 12); // 30/abr ao meio-dia, ainda antes de 23:59:59.999
    expect(creditoAindaEstimavel(4, 2026, [cartao], hoje)).toBe(true);
  });

  it("caso 11 — mesmo cartão, um instante depois da fronteira clampada → false", () => {
    const cartao = { diaFechamento: 31, diaVencimento: 31 };
    const hoje = new Date(2026, 4, 1); // já em maio
    expect(creditoAindaEstimavel(4, 2026, [cartao], hoje)).toBe(false);
  });
});

describe("debitoAindaEstimavel", () => {
  it("dentro do mês de referência → true", () => {
    expect(debitoAindaEstimavel(8, 2026, new Date(2026, 7, 15))).toBe(true);
  });

  it("depois do fim do mês de referência → false", () => {
    expect(debitoAindaEstimavel(8, 2026, new Date(2026, 8, 1))).toBe(false);
  });
});

describe("comporMes", () => {
  const CARTOES = [{ diaFechamento: 10, diaVencimento: 17 }]; // fecha dia 10

  const VALORES_PADRAO = [
    { id: "salario", tipo: "ENTRADA", valor: 8000, meio: null },
    { id: "aluguel", tipo: "SAIDA", valor: 1000, meio: "DEBITO" },
    { tipo: "SAIDA", valor: 500, meio: "CREDITO" },
  ];

  function contaCorrente(overrides = {}) {
    return {
      tipo: "SAIDA",
      ehInvestimento: false,
      parcelamentoId: null,
      mesReferencia: 8,
      anoReferencia: 2026,
      conta: { tipo: "CONTA_CORRENTE" },
      ...overrides,
    };
  }

  function cartaoCredito(overrides = {}) {
    return {
      tipo: "SAIDA",
      ehInvestimento: false,
      parcelamentoId: null,
      mesReferencia: 8,
      anoReferencia: 2026,
      conta: { tipo: "CARTAO_CREDITO" },
      ...overrides,
    };
  }

  it("caso 1 — mês futuro sem lançamento algum: estimativa integral em crédito, débito e receita", () => {
    const hoje = new Date(2026, 6, 1); // antes do mês de referência, ambas fronteiras abertas
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 0, estimado: 8000, total: 8000 });
    expect(resultado.debito).toEqual({ real: 0, estimado: 1000, total: 1000 });
    expect(resultado.credito).toEqual({ real: 0, estimado: 500, total: 500 });
    expect(resultado.disponivel).toBe(6500);
  });

  it("caso 2 (só crédito, Task 78) — gasto avulso menor que o teto: estimativa = teto − avulso", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 300 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: 300, estimado: 200, total: 500 });
  });

  it("caso 3 (só crédito, Task 78) — gasto avulso maior que o teto: estimativa zero, total = real", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 700 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: 700, estimado: 0, total: 700 });
  });

  it("caso 4 — parcela soma por cima do teto, sem consumi-lo", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 200, parcelamentoId: "p1" })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    // teto (500) não é consumido pela parcela — estimado continua cheio, real é só a parcela.
    expect(resultado.credito).toEqual({ real: 200, estimado: 500, total: 700 });
  });

  it("caso 5 (só crédito, Task 78) — ocorrência de recorrência consome o teto, como um avulso", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 300, recorrenciaId: "r1" })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    // mesma matemática do caso 2 — recorrência não é parcela, consome o teto.
    expect(resultado.credito).toEqual({ real: 300, estimado: 200, total: 500 });
  });

  it("caso 9 — mês passado: estimativa de despesa zero, receita padrão continua presente", () => {
    const hoje = new Date(2026, 11, 1); // bem depois do fechamento do cartão e do fim do mês
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 0, estimado: 8000, total: 8000 });
    expect(resultado.debito).toEqual({ real: 0, estimado: 0, total: 0 });
    expect(resultado.credito).toEqual({ real: 0, estimado: 0, total: 0 });
    expect(resultado.disponivel).toBe(8000);
  });

  it("caso 10 — entrada real pontual soma à receita padrão, sem descontá-la", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [
        { tipo: "ENTRADA", valor: 1000, mesReferencia: 8, anoReferencia: 2026 },
      ],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 1000, estimado: 8000, total: 9000 });
  });

  it("caso 12 — item de receita padrão com consolidação no mês composto usa o valor consolidado", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesReceita: [
        { valorPadraoId: "salario", mesReferencia: 8, anoReferencia: 2026, valor: 6500 },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 0, estimado: 6500, total: 6500 });
  });

  it("caso 13 — consolidação de outro mês não vaza pro mês composto", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesReceita: [
        { valorPadraoId: "salario", mesReferencia: 9, anoReferencia: 2026, valor: 6500 },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 0, estimado: 8000, total: 8000 });
  });

  it("caso 14 — dois itens de receita padrão, só um consolidado: soma valor consolidado + valor genérico", () => {
    const hoje = new Date(2026, 6, 1);
    const valoresPadraoComFreela = [
      ...VALORES_PADRAO,
      { id: "freela", tipo: "ENTRADA", valor: 500, meio: null },
    ];
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: valoresPadraoComFreela,
      consolidacoesReceita: [
        { valorPadraoId: "salario", mesReferencia: 8, anoReferencia: 2026, valor: 6500 },
      ],
      cartoes: CARTOES,
      hoje,
    });

    // salário consolidado (6500) + freela no valor genérico (500)
    expect(resultado.entradas).toEqual({ real: 0, estimado: 7000, total: 7000 });
  });

  it("caso 15 — entrada real pontual soma por cima do valor consolidado, sem descontá-lo", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [
        { tipo: "ENTRADA", valor: 1000, mesReferencia: 8, anoReferencia: 2026 },
      ],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesReceita: [
        { valorPadraoId: "salario", mesReferencia: 8, anoReferencia: 2026, valor: 6500 },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 1000, estimado: 6500, total: 7500 });
  });

  // Casos 16-24 (Task 78): virada do débito de teto consumido pra previsão
  // fixa por item, resolvida por consolidação (spec-01 §3.5 revisado + 3.9).

  it("caso 16 — gasto avulso no débito não consome a previsão; soma por cima", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 300 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 300, estimado: 1000, total: 1300 });
  });

  it("caso 17 — ocorrência de recorrência no débito não consome a previsão, mesmo comportamento do avulso", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 300, recorrenciaId: "r1" })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 300, estimado: 1000, total: 1300 });
  });

  it("caso 18 — gasto avulso no débito maior que a soma dos itens padrão: estimado continua cheio", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 1500 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 1500, estimado: 1000, total: 2500 });
  });

  it("caso 19 — item de despesa padrão no débito consolidado no mês sai da previsão; o lançamento entra em real", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 950 })],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesDespesa: [
        { valorPadraoId: "aluguel", mesReferencia: 8, anoReferencia: 2026, transacaoId: "t1" },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 950, estimado: 0, total: 950 });
  });

  it("caso 20 — dois itens no débito, só um consolidado: consolidado entra por real, pendente mantém previsão cheia", () => {
    const hoje = new Date(2026, 6, 1);
    const valoresPadraoComInternet = [
      ...VALORES_PADRAO,
      { id: "internet", tipo: "SAIDA", valor: 100, meio: "DEBITO" },
    ];
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 950 })],
      valoresPadrao: valoresPadraoComInternet,
      consolidacoesDespesa: [
        { valorPadraoId: "aluguel", mesReferencia: 8, anoReferencia: 2026, transacaoId: "t1" },
      ],
      cartoes: CARTOES,
      hoje,
    });

    // aluguel consolidado (real, via lançamento) + internet ainda pendente (100)
    expect(resultado.debito).toEqual({ real: 950, estimado: 100, total: 1050 });
  });

  it("caso 21 — consolidação de despesa por R$ 0 (transacaoId nulo): item sai da previsão, nada entra em real", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesDespesa: [
        { valorPadraoId: "aluguel", mesReferencia: 8, anoReferencia: 2026, transacaoId: null },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 0, estimado: 0, total: 0 });
  });

  it("caso 22 — consolidação de despesa num outro mês não vaza pro mês composto; item continua previsto", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesDespesa: [
        { valorPadraoId: "aluguel", mesReferencia: 9, anoReferencia: 2026, transacaoId: "t1" },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 0, estimado: 1000, total: 1000 });
  });

  it("caso 23 — mês passado com item de débito não consolidado: estimado zero, mas lançamento real do mês continua somando", () => {
    const hoje = new Date(2026, 11, 1); // bem depois do fim do mês de referência
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ valor: 300 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.debito).toEqual({ real: 300, estimado: 0, total: 300 });
  });

  it("caso 24 — item de despesa padrão no crédito nunca é afetado por consolidações de despesa; segue a regra do teto", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 300 })],
      valoresPadrao: VALORES_PADRAO,
      consolidacoesDespesa: [
        { valorPadraoId: "aluguel", mesReferencia: 8, anoReferencia: 2026, transacaoId: "t1" },
      ],
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: 300, estimado: 200, total: 500 });
  });

  // --- Estorno no crédito (M27, spec-01 §3.11) ---
  // Uma ENTRADA vinculada a um cartão. Não é receita: abate o real do crédito
  // e não entra em Entradas.
  function estorno(overrides = {}) {
    return cartaoCredito({ tipo: "ENTRADA", ...overrides });
  }

  it("caso 25 — estorno não soma em entradas.real", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [estorno({ valor: 200 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas).toEqual({ real: 0, estimado: 8000, total: 8000 });
  });

  it("caso 26 — estorno abate credito.real no valor exato, e credito.total cai junto", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 300 }), estorno({ valor: 200 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: 100, estimado: 200, total: 300 });
  });

  it("caso 27 — estorno não devolve teto: credito.estimado é o mesmo com e sem ele", () => {
    const hoje = new Date(2026, 6, 1);
    const argumentos = {
      mesReferencia: 8,
      anoReferencia: 2026,
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    };

    const semEstorno = comporMes({ ...argumentos, transacoes: [cartaoCredito({ valor: 300 })] });
    const comEstorno = comporMes({
      ...argumentos,
      transacoes: [cartaoCredito({ valor: 300 }), estorno({ valor: 200 })],
    });

    // O consumidor do teto continua bruto (300), não 300 − 200.
    expect(semEstorno.credito.estimado).toBe(200);
    expect(comEstorno.credito.estimado).toBe(200);
  });

  it("caso 28 — estorno maior que os gastos: credito.real negativo, sem truncar em zero", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [estorno({ valor: 700 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: -700, estimado: 500, total: -200 });
  });

  it("caso 29 — disponivel sobe exatamente o valor do estorno (guarda contra contagem dupla)", () => {
    const hoje = new Date(2026, 6, 1);
    const argumentos = {
      mesReferencia: 8,
      anoReferencia: 2026,
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    };

    const semEstorno = comporMes({ ...argumentos, transacoes: [cartaoCredito({ valor: 300 })] });
    const comEstorno = comporMes({
      ...argumentos,
      transacoes: [cartaoCredito({ valor: 300 }), estorno({ valor: 200 })],
    });

    expect(comEstorno.disponivel - semEstorno.disponivel).toBe(200);
  });

  it("caso 30 — entrada em conta corrente e estorno no mesmo mês não se misturam", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [contaCorrente({ tipo: "ENTRADA", valor: 1000 }), estorno({ valor: 200 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas.real).toBe(1000);
    expect(resultado.credito.real).toBe(-200);
  });

  it("caso 31 — estorno com a fatura já fechada em todos os cartões: estimado zero, real já abatido", () => {
    const hoje = new Date(2026, 7, 15); // depois do fechamento (dia 10)
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [cartaoCredito({ valor: 300 }), estorno({ valor: 200 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.credito).toEqual({ real: 100, estimado: 0, total: 100 });
  });

  it("caso 32 — estorno de outro mês de referência não vaza para o mês composto", () => {
    const hoje = new Date(2026, 6, 1);
    const resultado = comporMes({
      mesReferencia: 8,
      anoReferencia: 2026,
      transacoes: [estorno({ valor: 200, mesReferencia: 9 })],
      valoresPadrao: VALORES_PADRAO,
      cartoes: CARTOES,
      hoje,
    });

    expect(resultado.entradas.real).toBe(0);
    expect(resultado.credito).toEqual({ real: 0, estimado: 500, total: 500 });
  });
});
