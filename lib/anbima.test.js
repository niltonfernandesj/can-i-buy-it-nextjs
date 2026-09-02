import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { extrairProjecao } from "./anbima";

// A página real, salva em 01/09/2026. **Lida como latin-1**, que é como ela
// chega: a ANBIMA não declara charset e o conteúdo é ISO-8859-1.
const PAGINA = readFileSync(new URL("./fixtures/anbima-vna.html", import.meta.url), "latin1");

describe("extrairProjecao", () => {
  it("lê a projeção da página real", () => {
    const { projecao, erro } = extrairProjecao(PAGINA);
    expect(erro).toBeUndefined();
    expect(projecao).toEqual({
      serie: "IPCA",
      mes: "2026-08-01",
      valor: -0.28,
      fechado: false, // marca "P" — projeção, não índice fechado
    });
  });

  it("não confunde o IPCA da NTN-B com o IGP-M da NTN-C", () => {
    // A mesma página traz IGP-M -0,22 marcado "F" logo abaixo. Ler o bloco
    // errado devolveria um número plausível e silenciosamente errado.
    const { projecao } = extrairProjecao(PAGINA);
    expect(projecao.valor).toBe(-0.28);
    expect(projecao.valor).not.toBe(-0.22);
  });

  it("não confunde o índice com o VNA", () => {
    // O VNA é a coluna vizinha e vale 4.736,099925 — a cerca de sanidade
    // existe para que um deslocamento de coluna vire erro, não rendimento.
    const { projecao } = extrairProjecao(PAGINA);
    expect(Math.abs(projecao.valor)).toBeLessThan(5);
  });

  // Requisitos §3.24.6 — o ponto da task. Nenhum destes pode lançar, e nenhum
  // pode devolver número: quem chama trata `erro` como "mês não publicado".
  describe("caminhos de falha", () => {
    const casos = [
      ["página vazia", ""],
      ["não é string", null],
      ["HTML sem o bloco da NTN-B", "<html><body><p>Em manutenção</p></body></html>"],
      ["bloco presente e vazio", "<div id='listaNTN-B'><table></table></div>"],
      [
        "índice fora de faixa",
        "<div id='listaNTN-B'><table><tr><td>760199</td><td>4.736,09</td>" +
          "<td>4.736,09</td><td>P</td><td>27/08/2026</td></tr></table></div>",
      ],
      [
        "data impossível",
        "<div id='listaNTN-B'><table><tr><td>760199</td><td>4.736,09</td>" +
          "<td>-0,28</td><td>P</td><td>31/02/2026</td></tr></table></div>",
      ],
      [
        "marca desconhecida",
        "<div id='listaNTN-B'><table><tr><td>760199</td><td>4.736,09</td>" +
          "<td>-0,28</td><td>X</td><td>27/08/2026</td></tr></table></div>",
      ],
    ];

    for (const [nome, html] of casos) {
      it(`devolve erro sem lançar: ${nome}`, () => {
        const resultado = extrairProjecao(html);
        expect(resultado.erro).toBeTruthy();
        expect(resultado.projecao).toBeUndefined();
      });
    }
  });

  describe("mês de referência", () => {
    const pagina = (validade, marca = "P") =>
      "<div id='listaNTN-B'><table><tr><td>760199</td><td>4.736,09</td>" +
      `<td>-0,28</td><td>${marca}</td><td>${validade}</td></tr></table></div>`;

    // A janela [15/M, 15/M+1) acumula a projeção do mês M. Do dia 15 em
    // diante a validade aponta para o próprio mês.
    it("validade do dia 15 em diante aponta para o próprio mês", () => {
      expect(extrairProjecao(pagina("27/08/2026")).projecao.mes).toBe("2026-08-01");
      expect(extrairProjecao(pagina("15/08/2026")).projecao.mes).toBe("2026-08-01");
    });

    // Em 05/09 a janela aberta ainda é a de 15/08, e a projeção vigente
    // continua sendo a de agosto — não a de setembro.
    it("validade antes do dia 15 ainda aponta para o mês anterior", () => {
      expect(extrairProjecao(pagina("05/09/2026")).projecao.mes).toBe("2026-08-01");
      expect(extrairProjecao(pagina("14/09/2026")).projecao.mes).toBe("2026-08-01");
    });

    it("vira o ano corretamente", () => {
      expect(extrairProjecao(pagina("03/01/2027")).projecao.mes).toBe("2026-12-01");
    });
  });

  it("marca F vira índice fechado", () => {
    const html =
      "<div id='listaNTN-B'><table><tr><td>760199</td><td>4.736,09</td>" +
      "<td>0,31</td><td>F</td><td>16/09/2026</td></tr></table></div>";
    expect(extrairProjecao(html).projecao.fechado).toBe(true);
  });
});
