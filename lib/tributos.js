/**
 * Imposto sobre renda fixa (Requisitos §3.18, Design §25).
 *
 * Módulo **puro** — sem `db`, sem `fetch`. Vive fora de `lib/rendimento.js` de
 * propósito: rendimento ramifica por **indexador** e conta dias **úteis**;
 * tributo ramifica por **produto** e conta dias **corridos**. São dois eixos, e
 * juntá-los faria um arquivo só ramificar pelos dois ao mesmo tempo.
 */

/** LCI e LCA são isentas de IR e de IOF para pessoa física. */
const ISENTOS = ["LCI", "LCA"];

/**
 * IOF regressivo dos primeiros 30 dias, em % do rendimento.
 *
 * Vai como tabela literal porque é **tabela legal**, não fórmula. A
 * aproximação óbvia — `(30 − n) / 30` — erra em quase todos os dias: no dia 10
 * daria 66,7% contra os 66% da tabela, e assim por diante.
 *
 * Índice = dias corridos. A posição 0 nunca é usada (não existe dia zero).
 */
const IOF_POR_DIA = [
  null, 96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
];

/** Faixas de IR por dias **corridos**, não úteis. */
export function aliquotaIR(diasCorridos) {
  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.20;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
}

/** Alíquota de IOF por dias corridos. Zero a partir do trigésimo dia. */
export function aliquotaIOF(diasCorridos) {
  if (diasCorridos >= 30) return 0;
  if (diasCorridos < 1) return 0;
  return IOF_POR_DIA[diasCorridos] / 100;
}

/**
 * Dias **corridos** entre duas datas "YYYY-MM-DD".
 *
 * Datas em string pelo mesmo motivo de `lib/rendimento.js`: a comparação fica
 * livre de fuso. Aqui a subtração é feita em UTC, onde as duas pontas estão na
 * mesma base, então a diferença é exata.
 */
export function diasCorridos(de, ate) {
  const ms = new Date(`${ate}T00:00:00Z`) - new Date(`${de}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * Imposto e valor líquido de uma posição.
 *
 * `corte` é a data até onde o rendimento foi calculado — o último dia
 * publicado, ou o vencimento —, **não hoje**. Assim as duas contagens terminam
 * no mesmo ponto e o imposto incide exatamente sobre o rendimento exibido.
 *
 * **A ordem é legal:** IOF sobre o rendimento, IR sobre o que sobrou. Ela não
 * muda o total — `R·a + (R − R·a)·b` e `R·b + (R − R·b)·a` são ambos
 * `R(a + b − ab)`, o que um teste comprova. O que ela muda é a **repartição**
 * entre os dois tributos: na ordem legal são R$ 66,00 de IOF e R$ 7,65 de IR;
 * invertida, R$ 51,15 e R$ 22,50. Como o app exibe os dois separadamente, a
 * ordem importa para o que se lê, não para o líquido.
 */
export function tributos({ produto, base, corrigido, dataAquisicao, corte }) {
  const bruto = Number(corrigido);
  const rendimento = bruto - Number(base);

  // Isentos e posições sem rendimento saem antes de qualquer conta — sem isto,
  // uma posição comprada hoje geraria imposto negativo.
  if (ISENTOS.includes(produto) || rendimento <= 0) {
    return { ir: 0, iof: 0, liquido: bruto };
  }

  // Mínimo de um dia quando houve rendimento. A série do BC atrasa, então o
  // corte é sempre uma data passada — mas numa posição comprada no próprio dia
  // do último ponto publicado, `corte − aquisição` dá zero enquanto o
  // rendimento já existe. Sem este piso, uma posição de um dia escaparia do
  // IOF de 96%, que é justamente quando ele mais pesa. Não desloca nenhuma
  // faixa: só o caso degenerado muda.
  const dias = Math.max(1, diasCorridos(dataAquisicao, corte));
  const iof = rendimento * aliquotaIOF(dias);
  const ir = (rendimento - iof) * aliquotaIR(dias);

  return { ir, iof, liquido: bruto - iof - ir };
}
