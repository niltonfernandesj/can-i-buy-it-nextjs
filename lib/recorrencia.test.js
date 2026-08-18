import { describe, it, expect } from "vitest";
import { proximaDataMensal, gerarOcorrenciasRecorrencia } from "./recorrencia";

describe("proximaDataMensal", () => {
  it("avança meses normalmente, mantendo o dia", () => {
    expect(proximaDataMensal(new Date(2026, 0, 10), 2)).toEqual(new Date(2026, 2, 10));
  });

  it("não altera a data quando mesesAFrente = 0", () => {
    expect(proximaDataMensal(new Date(2026, 0, 10), 0)).toEqual(new Date(2026, 0, 10));
  });

  it("rola para o ano seguinte quando ultrapassa dezembro", () => {
    expect(proximaDataMensal(new Date(2026, 10, 5), 3)).toEqual(new Date(2027, 1, 5)); // nov/2026 + 3 = fev/2027
  });

  it("clampa dia 31 para o último dia de fevereiro (não bissexto)", () => {
    expect(proximaDataMensal(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
  });

  it("clampa dia 31 para 29 em fevereiro de ano bissexto", () => {
    expect(proximaDataMensal(new Date(2028, 0, 31), 1)).toEqual(new Date(2028, 1, 29));
  });
});

describe("gerarOcorrenciasRecorrencia", () => {
  it("gera exatamente N ocorrências, com recorrenciaId consistente e numeroOcorrencia/totalOcorrencias corretos", () => {
    const conta = { tipo: "CONTA_CORRENTE" };
    const dataCompra = new Date(2026, 7, 5); // 5/ago/2026
    const ocorrencias = gerarOcorrenciasRecorrencia(dataCompra, 200, 4, conta);

    expect(ocorrencias).toHaveLength(4);

    const recorrenciaId = ocorrencias[0].recorrenciaId;
    ocorrencias.forEach((ocorrencia, index) => {
      expect(ocorrencia.numeroOcorrencia).toBe(index + 1);
      expect(ocorrencia.totalOcorrencias).toBe(4);
      expect(ocorrencia.recorrenciaId).toBe(recorrenciaId);
      expect(ocorrencia.valor).toBe(200);
      expect(ocorrencia.dataCompra).toEqual(ocorrencia.dataEfetiva);
    });
  });

  it("débito: mês de referência é sempre o mês da própria data da ocorrência", () => {
    const conta = { tipo: "CONTA_CORRENTE" };
    const dataCompra = new Date(2026, 0, 31); // 31/jan/2026
    const ocorrencias = gerarOcorrenciasRecorrencia(dataCompra, 100, 3, conta);

    expect(
      ocorrencias.map((o) => ({
        dataCompra: o.dataCompra,
        mesReferencia: o.mesReferencia,
        anoReferencia: o.anoReferencia,
      }))
    ).toEqual([
      { dataCompra: new Date(2026, 0, 31), mesReferencia: 1, anoReferencia: 2026 },
      { dataCompra: new Date(2026, 1, 28), mesReferencia: 2, anoReferencia: 2026 }, // clamp, não bissexto
      { dataCompra: new Date(2026, 2, 31), mesReferencia: 3, anoReferencia: 2026 },
    ]);
  });

  it("crédito: mês de referência calculado via calcularFatura de forma independente por ocorrência", () => {
    const conta = { tipo: "CARTAO_CREDITO", diaFechamento: 17, diaVencimento: 24 };
    const dataCompra = new Date(2026, 7, 5); // 5/ago/2026
    const ocorrencias = gerarOcorrenciasRecorrencia(dataCompra, 150, 3, conta);

    expect(
      ocorrencias.map((o) => `${o.mesReferencia}/${o.anoReferencia}`)
    ).toEqual(["8/2026", "9/2026", "10/2026"]);
  });

  it("crédito: cada ocorrência pode cair em mês de referência diferente do mês da compra, conforme fechamento/vencimento", () => {
    // fechamento dia 25, vencimento dia 5: dia 26 do mês já entra na fatura seguinte,
    // com vencimento no mês seguinte a essa fatura.
    const conta = { tipo: "CARTAO_CREDITO", diaFechamento: 25, diaVencimento: 5 };
    const dataCompra = new Date(2026, 7, 26); // 26/ago/2026
    const ocorrencias = gerarOcorrenciasRecorrencia(dataCompra, 150, 2, conta);

    expect(ocorrencias.map((o) => `${o.mesReferencia}/${o.anoReferencia}`)).toEqual([
      "10/2026", // compra 26/ago -> fecha em set -> vence out
      "11/2026", // compra 26/set -> fecha em out -> vence nov
    ]);
  });
});
