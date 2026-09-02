/**
 * Leitor da página pública de VNA da ANBIMA (M40 — Design §31.3).
 *
 * **A quarta fonte externa do projeto, e a primeira sem contrato de API.** O
 * portal de desenvolvedores da ANBIMA tem endpoint de projeção de IPCA, mas o
 * acesso de produção depende de contato comercial; a página de VNA responde
 * 200 sem autenticação e traz o mesmo número (Requisitos §3.24.4).
 *
 * Existe porque um título com defasagem 0 depende sempre do mês corrente: a
 * janela que abre em 15/08 precisa do IPCA de agosto, que o Banco Central só
 * publica por volta de 10/09. Sem projeção, um M0 passa um mês parado.
 *
 * **Mesmo contrato de `lib/bc.js`: devolve `{ projecao }` ou `{ erro }`, e
 * NUNCA lança.** Sem contrato de API, o layout pode mudar sem aviso — e o
 * requisito do marco é que falhar aqui não comprometa cálculo nenhum
 * (Requisitos §3.24.6). Erro daqui equivale a "o índice daquele mês não
 * existe", situação que o cálculo já trata desde o M36.
 */

export const URL_VNA = "https://www.anbima.com.br/informacoes/vna/vna.asp";

const TIMEOUT_MS = 15000;

/**
 * Teto de sanidade do índice mensal, em % ao mês.
 *
 * Não é validação de negócio, é cerca contra lixo: se o parser pegar a coluna
 * errada — o VNA, por exemplo, que é da ordem de 4.700 — o número passaria
 * despercebido e corromperia o rendimento de toda posição indexada. O IPCA
 * mensal brasileiro não chega perto de 5% desde a estabilização.
 */
const LIMITE_PERCENTUAL = 5;

/** "-0,28" → -0.28. Devolve `null` se não for número. */
function paraNumero(texto) {
  const n = Number(String(texto).trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** "27/08/2026" → { ano, mes, dia }, ou `null` se não casar ou não existir. */
function paraData(texto) {
  const partes = String(texto).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;

  const [, dia, mes, ano] = partes.map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  // 31/02 casa a regex e vira 03/03 no Date — só a volta detecta.
  if (d.getUTCDate() !== dia || d.getUTCMonth() !== mes - 1) return null;

  return { ano, mes, dia };
}

/**
 * Mês de referência da projeção, a partir da data de validade.
 *
 * Não é o mês de hoje: é o mês da **janela aberta** naquela data. A janela
 * `[15/M, 15/M+1)` acumula a projeção do mês M, então uma validade do dia 15
 * em diante aponta para o próprio mês, e antes disso ainda para o anterior.
 * Em 05/09 a janela aberta continua sendo a de 15/08, e a projeção vigente
 * ainda é a de agosto.
 */
function mesDeReferencia({ ano, mes, dia }) {
  const deslocamento = dia >= 15 ? 0 : -1;
  const d = new Date(Date.UTC(ano, mes - 1 + deslocamento, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * HTML → `{ projecao }` ou `{ erro }`. **Pura**, para ser testável sem rede.
 *
 * A página tem três blocos na mesma tela — NTN-B (IPCA), NTN-C (IGP-M) e LFT
 * (Selic) —, então o recorte vem primeiro: só o `<div id='listaNTN-B'>`
 * interessa. Ancorar no id, e não na ordem dos blocos ou no código Selic do
 * papel de referência, é o que sobrevive a eles trocarem o título usado.
 *
 * Dentro do bloco, a linha de dados é reconhecida pela **forma** — código,
 * VNA, índice, marca, data —, não pela posição. Uma coluna a mais no meio da
 * tabela faz o casamento falhar em vez de deslocar a leitura em silêncio, que
 * é a diferença entre devolver nada e devolver lixo com cara de índice.
 */
export function extrairProjecao(html) {
  if (typeof html !== "string" || !html) return { erro: "Página da ANBIMA veio vazia" };

  const bloco = html.match(/id=['"]listaNTN-B['"][\s\S]*?<\/table>/i);
  if (!bloco) return { erro: "Bloco da NTN-B não encontrado na página da ANBIMA" };

  const celulas = [...bloco[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim(),
  );

  for (let i = 0; i + 4 < celulas.length; i += 1) {
    const [codigo, vna, indice, marca, validade] = celulas.slice(i, i + 5);

    if (!/^\d{6}$/.test(codigo)) continue;
    if (paraNumero(vna) === null) continue;
    if (!/^[FP]$/i.test(marca)) continue;

    const data = paraData(validade);
    if (!data) continue;

    const valor = paraNumero(indice);
    if (valor === null) return { erro: `Índice ilegível na página da ANBIMA: "${indice}"` };
    if (Math.abs(valor) > LIMITE_PERCENTUAL) {
      return { erro: `Índice fora de faixa na página da ANBIMA: ${valor}% ao mês` };
    }

    return {
      projecao: {
        serie: "IPCA",
        mes: mesDeReferencia(data),
        valor,
        // (P) projeção do Comitê de Acompanhamento Macroeconômico, (F) fechado.
        fechado: marca.toUpperCase() === "F",
      },
    };
  }

  return { erro: "Linha da NTN-B não encontrada na página da ANBIMA" };
}

/**
 * Busca a projeção corrente do IPCA. Nunca lança.
 *
 * **A página não declara charset e é ISO-8859-1.** Deixar o `fetch` decidir
 * entrega UTF-8, que quebra "Válido" e "Projeção" — e com eles qualquer
 * âncora acentuada. Por isso `arrayBuffer()` e decodificação explícita.
 */
export async function buscarProjecaoIPCA() {
  try {
    const resposta = await fetch(URL_VNA, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Segunda linha de defesa, não a primeira: quem garante é a tabela.
      next: { revalidate: 3600 },
    });

    if (!resposta.ok) return { erro: `ANBIMA respondeu ${resposta.status}` };

    const bytes = await resposta.arrayBuffer();
    return extrairProjecao(new TextDecoder("iso-8859-1").decode(bytes));
  } catch (e) {
    return {
      erro: e?.name === "TimeoutError" ? "ANBIMA não respondeu a tempo" : String(e?.message ?? e),
    };
  }
}
