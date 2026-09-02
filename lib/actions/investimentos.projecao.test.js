import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A action vive num módulo "use server" que arrasta next-auth e o Prisma. O
// que se testa aqui é a POLÍTICA de sincronização — cache, recuo após falha,
// sobrescrita —, então as duas pontas são dubladas: o banco e a ANBIMA.
const db = {
  projecaoIndice: { findFirst: vi.fn(), upsert: vi.fn() },
};
const buscarProjecaoIPCA = vi.fn();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/anbima", () => ({ buscarProjecaoIPCA }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const AGORA = new Date("2026-09-01T22:00:00Z");
const linhaDe = (horasAtras, valor = -0.28) => ({
  serie: "IPCA",
  mes: new Date("2026-08-01T00:00:00Z"),
  valor,
  fechado: false,
  capturadoEm: new Date(AGORA.getTime() - horasAtras * 3600 * 1000),
});

const OK = { projecao: { serie: "IPCA", mes: "2026-08-01", valor: -0.31, fechado: false } };

let sincronizarProjecao;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
  db.projecaoIndice.findFirst.mockReset();
  db.projecaoIndice.upsert.mockReset();
  buscarProjecaoIPCA.mockReset();
  // Reimportado a cada teste porque o recuo após falha é estado de MÓDULO —
  // sem isso, um teste de falha envenenaria os seguintes.
  vi.resetModules();
  ({ sincronizarProjecao } = await import("./investimentos"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sincronizarProjecao", () => {
  it("busca e grava quando não há nada guardado", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(null);
    buscarProjecaoIPCA.mockResolvedValue(OK);

    const r = await sincronizarProjecao("IPCA");

    expect(r).toEqual({ mes: "2026-08-01", valor: -0.31 });
    expect(buscarProjecaoIPCA).toHaveBeenCalledOnce();
    expect(db.projecaoIndice.upsert).toHaveBeenCalledOnce();
  });

  it("não toca a rede enquanto a leitura guardada é recente", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(linhaDe(3));

    const r = await sincronizarProjecao("IPCA");

    expect(r).toEqual({ mes: "2026-08-01", valor: -0.28 });
    expect(buscarProjecaoIPCA).not.toHaveBeenCalled();
  });

  it("busca de novo quando a leitura guardada passou de 12h", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(linhaDe(13));
    buscarProjecaoIPCA.mockResolvedValue(OK);

    const r = await sincronizarProjecao("IPCA");

    expect(buscarProjecaoIPCA).toHaveBeenCalledOnce();
    expect(r.valor).toBe(-0.31); // o valor novo, não o de 13h atrás
  });

  // O requisito do marco (Requisitos §3.24.6): falhar na ANBIMA não pode
  // comprometer o cálculo. O pior caso é o valor ficar mais velho.
  it("devolve a leitura guardada quando a ANBIMA falha", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(linhaDe(13));
    buscarProjecaoIPCA.mockResolvedValue({ erro: "ANBIMA respondeu 503" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await sincronizarProjecao("IPCA");

    expect(r).toEqual({ mes: "2026-08-01", valor: -0.28 });
    expect(db.projecaoIndice.upsert).not.toHaveBeenCalled();
  });

  it("devolve null quando falha e não há nada guardado", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(null);
    buscarProjecaoIPCA.mockResolvedValue({ erro: "fetch failed" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sincronizarProjecao("IPCA")).toBeNull();
  });

  // Sem recuo, uma ANBIMA fora do ar custaria o timeout inteiro a CADA render:
  // a falha não atualiza `capturadoEm`, então o cache de 12h nunca fecha.
  it("recua após uma falha em vez de tentar a cada chamada", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(linhaDe(13));
    buscarProjecaoIPCA.mockResolvedValue({ erro: "timeout" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sincronizarProjecao("IPCA");
    await sincronizarProjecao("IPCA");
    await sincronizarProjecao("IPCA");

    expect(buscarProjecaoIPCA).toHaveBeenCalledOnce();
  });

  it("volta a tentar depois de passada a espera", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(linhaDe(13));
    buscarProjecaoIPCA.mockResolvedValue({ erro: "timeout" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await sincronizarProjecao("IPCA");
    vi.setSystemTime(new Date(AGORA.getTime() + 31 * 60 * 1000));
    await sincronizarProjecao("IPCA");

    expect(buscarProjecaoIPCA).toHaveBeenCalledTimes(2);
  });

  it("sobrescreve o mês em vez de acumular histórico", async () => {
    db.projecaoIndice.findFirst.mockResolvedValue(null);
    buscarProjecaoIPCA.mockResolvedValue(OK);

    await sincronizarProjecao("IPCA");

    const [args] = db.projecaoIndice.upsert.mock.calls[0];
    expect(args.where).toEqual({
      serie_mes: { serie: "IPCA", mes: new Date("2026-08-01T00:00:00Z") },
    });
    expect(args.update.valor).toBe(-0.31);
  });

  it("índice sem projeção publicada não chega a consultar", async () => {
    expect(await sincronizarProjecao("IGPM")).toBeNull();
    expect(db.projecaoIndice.findFirst).not.toHaveBeenCalled();
    expect(buscarProjecaoIPCA).not.toHaveBeenCalled();
  });
});
