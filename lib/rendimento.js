/**
 * Correção de posições pós-fixadas (Requisitos §3.16, Design §23.3).
 *
 * Módulo **puro**: sem `db`, sem `fetch`. Recebe as taxas já carregadas —
 * mesmo desenho de `lib/fatura.js` e `lib/investimentos.js`, e é o que permite
 * provar a matemática sem banco nem rede.
 *
 * **Datas são strings "YYYY-MM-DD", nunca `Date`.** É deliberado: a série vem
 * de uma coluna `@db.Date` (meia-noite UTC) e a aquisição vem de `DateTime`
 * gravado em meia-noite local. Comparar os dois como `Date` erra por um dia em
 * qualquer fuso a oeste de Greenwich — a mesma armadilha que `paraDataLocal`
 * existe para evitar. Com string ISO a comparação é lexicográfica e não tem
 * fuso nenhum envolvido.
 */

/** Série do BC que cada indexador consulta. `null` = não rende ainda (M31). */
export const SERIE_DO_INDEXADOR = {
  PERCENTUAL_CDI: "CDI",
  CDI_MAIS: "CDI",
  PERCENTUAL_SELIC: "SELIC",
  SELIC_MAIS: "SELIC",
  PREFIXADO: null,
  IPCA_MAIS: null,
};

const DIAS_UTEIS_NO_ANO = 252;

/**
 * As taxas que de fato incidem sobre a posição.
 *
 * Abre em `dataAquisicao` (exclusivo — o dia da compra não rende) e fecha no
 * vencimento, se ele já passou: vencido continua no saldo, mas para de render
 * (Requisitos §3.16.4).
 */
export function taxasAplicaveis(taxas, { dataAquisicao, vencimento }) {
  return taxas.filter(
    (t) => t.dia > dataAquisicao && (!vencimento || t.dia <= vencimento)
  );
}

/**
 * Produtório dos fatores diários.
 *
 * `percentual` é fração (1.1 para 110% do índice) e `spread` é fração ao ano
 * (0.02 para +2% a.a.). Os dois nunca aparecem juntos: um indexador é ou
 * percentual do índice, ou índice mais spread.
 *
 * A convenção do percentual é a do mercado (ANBIMA): `1 + taxa × percentual`,
 * e **não** `(1 + taxa) ^ percentual`. Medido contra a série real, as duas
 * diferem em R$ 0,05 sobre R$ 10.000 num ano — a escolha é por ser a
 * conferível contra o extrato da corretora, não por precisão.
 */
export function fatorAcumulado(taxas, { percentual = 1, spread = 0 } = {}) {
  const fatorSpread = spread ? (1 + spread) ** (1 / DIAS_UTEIS_NO_ANO) : 1;

  return taxas.reduce((fator, t) => {
    const diaria = Number(t.valor) / 100; // o BC devolve em % ao dia
    return fator * (1 + diaria * percentual) * fatorSpread;
  }, 1);
}

/**
 * Traduz o par (indexador, taxa) do ativo nos argumentos de `fatorAcumulado`.
 *
 * O campo `taxa` muda de sentido com o indexador — 110 é fração em "% do CDI"
 * e spread em "CDI +" —, e é essa ambiguidade que esta função isola.
 */
export function parametrosDoIndexador(indexador, taxa) {
  const n = Number(taxa) / 100;
  if (indexador === "PERCENTUAL_CDI" || indexador === "PERCENTUAL_SELIC") {
    return { percentual: n };
  }
  if (indexador === "CDI_MAIS" || indexador === "SELIC_MAIS") {
    return { spread: n };
  }
  return null; // pré-fixado e IPCA+ não rendem no M30
}

/**
 * Valor corrigido de uma posição.
 *
 * `base` é o remanescente da última liquidação (`baseAtual` do M29), não o
 * valor de aquisição — é o que faz a liquidação parcial do M33 funcionar sem
 * refazer nada aqui.
 *
 * Devolve a própria base, sem erro, quando o indexador ainda não rende ou
 * quando não há taxa nenhuma — que é exatamente o caminho de quando o Banco
 * Central nunca respondeu (Requisitos §3.16.5).
 */
export function valorCorrigido({ base, indexador, taxa, dataAquisicao, vencimento }, taxas = []) {
  const parametros = parametrosDoIndexador(indexador, taxa);
  if (!parametros) return Number(base);

  const incidentes = taxasAplicaveis(taxas, { dataAquisicao, vencimento });
  return Number(base) * fatorAcumulado(incidentes, parametros);
}
