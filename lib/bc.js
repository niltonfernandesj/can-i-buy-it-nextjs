/**
 * Cliente das séries do Banco Central (SGS) — Design §23.2.
 *
 * Primeira chamada externa do projeto. Três características da API, medidas em
 * 26/08/2026, moldam este arquivo:
 *
 * 1. A série traz **só dias úteis**. Não é preciso calendário de feriados.
 * 2. Ela **atrasa**: o último ponto costuma ser o dia útil anterior.
 * 3. Intervalo sem dia útil devolve **404**, não lista vazia.
 */

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

/**
 * Número da série no SGS.
 *
 * O IPCA é **mensal** e vai para outra tabela (`IndiceMensal`), mas o cliente
 * é o mesmo: o payload da 433 tem exatamente a forma da 12 —
 * `{ data: "01/07/2026", valor: "0.07" }`. Só muda onde se grava.
 */
export const SGS = { CDI: 12, SELIC: 11, IPCA: 433 };

const TIMEOUT_MS = 15000;

/** "YYYY-MM-DD" → "DD/MM/YYYY", que é o que a API aceita no filtro. */
function paraFormatoBC(dia) {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/** "DD/MM/YYYY" → "YYYY-MM-DD". A API responde no formato brasileiro. */
function paraISO(dataBR) {
  const [d, mes, ano] = dataBR.split("/");
  return `${ano}-${mes}-${d}`;
}

/**
 * Busca um intervalo fechado de uma série.
 *
 * Devolve `{ pontos }` em caso de sucesso e `{ erro }` em falha — **nunca
 * lança**. A página não pode quebrar porque o BC caiu: quem chama segue com o
 * que a tabela já tem (Requisitos §3.16.5).
 *
 * **404 é sucesso com zero pontos.** Um intervalo sem dia útil — um fim de
 * semana, ou "do último dia guardado até hoje" quando não há nada novo —
 * responde 404 com corpo `{"erro": ...}`. Tratar como falha quebraria a
 * sincronização todo sábado.
 */
export async function buscarSerie(serie, de, ate) {
  const numero = SGS[serie];
  if (!numero) return { erro: `Série sem número SGS: ${serie}` };
  if (de > ate) return { pontos: [] }; // intervalo vazio, nem chega a pedir

  const url =
    `${BASE}.${numero}/dados?formato=json` +
    `&dataInicial=${paraFormatoBC(de)}&dataFinal=${paraFormatoBC(ate)}`;

  try {
    const resposta = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // A série passada nunca muda; o cache do Next evita repetir a chamada
      // dentro da mesma janela, mas quem garante o resto é a tabela.
      next: { revalidate: 3600 },
    });

    if (resposta.status === 404) return { pontos: [] };
    if (!resposta.ok) return { erro: `Banco Central respondeu ${resposta.status}` };

    const dados = await resposta.json();
    if (!Array.isArray(dados)) return { erro: "Resposta do Banco Central em formato inesperado" };

    // Duas armadilhas do payload: a data vem dd/MM/yyyy (não ISO) e o valor
    // vem string ("0.051660"), não número.
    return {
      pontos: dados.map((p) => ({ dia: paraISO(p.data), valor: Number(p.valor) })),
    };
  } catch (e) {
    return { erro: e?.name === "TimeoutError" ? "Banco Central não respondeu a tempo" : String(e?.message ?? e) };
  }
}

/**
 * As duas bordas que faltam entre o que já está guardado e a janela desejada.
 *
 * São duas, não uma: cobrir só o fim assumiria que o guardado começa cedo o
 * bastante — falso assim que uma posição antiga é cadastrada depois de a
 * tabela já ter os dias recentes.
 *
 * Função **pura**, para poder ser testada sem banco.
 */
export function lacunas({ desejadoDe, desejadoAte, guardadoDe, guardadoAte }) {
  if (!guardadoDe || !guardadoAte) return [{ de: desejadoDe, ate: desejadoAte }];

  const faltando = [];
  if (desejadoDe < guardadoDe) faltando.push({ de: desejadoDe, ate: diaAnterior(guardadoDe) });
  if (desejadoAte > guardadoAte) faltando.push({ de: diaSeguinte(guardadoAte), ate: desejadoAte });
  return faltando;
}

function deslocar(dia, dias) {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
const diaAnterior = (dia) => deslocar(dia, -1);
const diaSeguinte = (dia) => deslocar(dia, 1);
