import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarSerie, lacunas, SGS } from "./bc";

afterEach(() => vi.unstubAllGlobals());

const responder = (status, corpo) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({
    status, ok: status >= 200 && status < 300, json: async () => corpo,
  })));

describe("buscarSerie — o parse", () => {
  it("converte data brasileira em ISO e valor de string em número", async () => {
    responder(200, [{ data: "25/08/2026", valor: "0.051660" }]);
    const { pontos } = await buscarSerie("CDI", "2026-08-25", "2026-08-25");
    expect(pontos).toEqual([{ dia: "2026-08-25", valor: 0.05166 }]);
  });

  it("pede o intervalo no formato DD/MM/YYYY que a API exige", async () => {
    responder(200, []);
    await buscarSerie("CDI", "2026-01-05", "2026-02-10");
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("dataInicial=05/01/2026");
    expect(url).toContain("dataFinal=10/02/2026");
    expect(url).toContain(`bcdata.sgs.${SGS.CDI}/`);
  });
});

describe("buscarSerie — as falhas", () => {
  // A armadilha central: um fim de semana responde 404.
  it("404 é sucesso com zero pontos, não erro", async () => {
    responder(404, { erro: { statusCode: 404, detail: "Value(s) not found" } });
    const r = await buscarSerie("CDI", "2026-08-22", "2026-08-23");
    expect(r).toEqual({ pontos: [] });
    expect(r.erro).toBeUndefined();
  });

  it("500 é erro de verdade, mas não lança", async () => {
    responder(500, {});
    const r = await buscarSerie("CDI", "2026-08-01", "2026-08-25");
    expect(r.erro).toMatch(/500/);
    expect(r.pontos).toBeUndefined();
  });

  it("corpo inesperado vira erro em vez de quebrar o parse", async () => {
    responder(200, { erro: "manutenção" });
    expect((await buscarSerie("CDI", "2026-08-01", "2026-08-25")).erro).toMatch(/formato inesperado/);
  });

  it("rede fora devolve erro, nunca exceção", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND"); }));
    const r = await buscarSerie("CDI", "2026-08-01", "2026-08-25");
    expect(r.erro).toMatch(/ENOTFOUND/);
  });

  it("intervalo invertido nem chega a chamar a API", async () => {
    responder(200, []);
    expect(await buscarSerie("CDI", "2026-08-25", "2026-08-01")).toEqual({ pontos: [] });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("lacunas", () => {
  const janela = { desejadoDe: "2026-01-05", desejadoAte: "2026-08-26" };

  it("tabela vazia pede a janela inteira", () => {
    expect(lacunas({ ...janela, guardadoDe: null, guardadoAte: null }))
      .toEqual([{ de: "2026-01-05", ate: "2026-08-26" }]);
  });

  it("nada a fazer quando o guardado cobre a janela", () => {
    expect(lacunas({ ...janela, guardadoDe: "2026-01-01", guardadoAte: "2026-08-26" })).toEqual([]);
  });

  it("pede só o fim quando falta atualizar", () => {
    expect(lacunas({ ...janela, guardadoDe: "2026-01-01", guardadoAte: "2026-08-20" }))
      .toEqual([{ de: "2026-08-21", ate: "2026-08-26" }]);
  });

  // O caso que justifica as duas bordas: uma posição antiga cadastrada depois.
  it("pede só o começo quando uma aquisição mais antiga aparece", () => {
    expect(lacunas({ ...janela, guardadoDe: "2026-06-01", guardadoAte: "2026-08-26" }))
      .toEqual([{ de: "2026-01-05", ate: "2026-05-31" }]);
  });

  it("pede as duas bordas quando falta dos dois lados", () => {
    expect(lacunas({ ...janela, guardadoDe: "2026-06-01", guardadoAte: "2026-08-20" }))
      .toEqual([{ de: "2026-01-05", ate: "2026-05-31" }, { de: "2026-08-21", ate: "2026-08-26" }]);
  });

  it("atravessa a virada do mês sem errar o dia", () => {
    expect(lacunas({ desejadoDe: "2026-02-01", desejadoAte: "2026-03-05",
                     guardadoDe: "2026-02-01", guardadoAte: "2026-02-28" }))
      .toEqual([{ de: "2026-03-01", ate: "2026-03-05" }]);
  });
});
