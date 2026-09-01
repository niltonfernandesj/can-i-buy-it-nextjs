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

/**
 * Série do BC que cada indexador consulta. `null` = não rende ainda.
 *
 * **`PREFIXADO` aponta para CDI, mas não usa a taxa dele** — usa a série como
 * *calendário de dias úteis* (Design §24.2). O app não tem tabela de feriados,
 * e a série do BC já vem só com dias úteis. Não devolva isto para `null`
 * achando que é engano: sem a série, não há como contar os dias.
 */
/**
 * Índice mensal que o indexador consulta. Só o IPCA+ tem um — e ele é o único
 * que precisa de **duas** fontes: este para a inflação, e a série diária do
 * mapa abaixo como calendário de dias úteis para o spread (Design §29.3).
 */
export const SERIE_MENSAL_DO_INDEXADOR = {
  IPCA_MAIS: "IPCA",
};

export const SERIE_DO_INDEXADOR = {
  PERCENTUAL_CDI: "CDI",
  CDI_MAIS: "CDI",
  PERCENTUAL_SELIC: "SELIC",
  SELIC_MAIS: "SELIC",
  PREFIXADO: "CDI",
  IPCA_MAIS: "CDI", // calendário do spread, como o pré-fixado
};

const DIAS_UTEIS_NO_ANO = 252;

/**
 * As taxas que de fato incidem sobre a posição.
 *
 * Abre em `dataAquisicao` **inclusive** — o dia da compra rende. A primeira
 * versão o excluía e o Design chamava isso de "aproximação de ±1 dia"; não
 * era. Conferido contra o extrato da corretora numa posição de 87 dias úteis:
 * com o dia da compra, o app dá R$ 5.251,92 e o extrato diz R$ 5.251,92
 * (Task 130).
 *
 * Fecha no vencimento, se ele já passou: vencido continua no saldo, mas para
 * de render (Requisitos §3.16.4). Essa ponta **não foi verificada** — a
 * convenção de mercado sugere `<` em vez de `<=`, e a diferença só aparece
 * numa posição já vencida.
 */
export function taxasAplicaveis(taxas, { dataAquisicao, vencimento }) {
  return taxas.filter(
    (t) => t.dia >= dataAquisicao && (!vencimento || t.dia <= vencimento)
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
export function fatorAcumulado(taxas, { percentual = 1, spread = 0, prefixado } = {}) {
  // Terceiro modo: o pré-fixado consome só a **quantidade** de dias, não os
  // valores. A lista entra como calendário — a taxa já está no papel
  // (Design §24.1). Alimentar valores diferentes não pode mudar o resultado.
  if (prefixado !== undefined) {
    return (1 + prefixado) ** (taxas.length / DIAS_UTEIS_NO_ANO);
  }

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
  if (indexador === "IPCA_MAIS") {
    return { inflacao: n };
  }
  if (indexador === "PERCENTUAL_CDI" || indexador === "PERCENTUAL_SELIC") {
    return { percentual: n };
  }
  if (indexador === "CDI_MAIS" || indexador === "SELIC_MAIS") {
    return { spread: n };
  }
  if (indexador === "PREFIXADO") {
    return { prefixado: n };
  }
  return null;
}

/**
 * Os meses de índice que incidem sobre a posição.
 *
 * Abre no **primeiro dia do mês da aquisição** — o mês da compra conta inteiro
 * (Requisitos §3.19.2), o único ponto do app em que o valor pode ficar acima
 * do real. Fecha no vencimento.
 */
export function indicesAplicaveis(indices, { dataAquisicao, vencimento }) {
  const primeiroDoMes = `${dataAquisicao.slice(0, 7)}-01`;
  return indices.filter(
    (m) => m.mes >= primeiroDoMes && (!vencimento || m.mes <= vencimento),
  );
}

/**
 * Fator do IPCA+: produtório dos meses fechados, mais o spread proporcional
 * aos dias úteis decorridos.
 *
 * **Sem piso.** Um mês de deflação tem fator abaixo de 1 e o resultado cai —
 * é o que acontece com o título de verdade (Requisitos §3.19.3), e um
 * `Math.max` acidental aqui passaria despercebido.
 */
export function fatorInflacao(indices, diasUteis, { spread = 0 } = {}) {
  const porIndice = indices.reduce((f, m) => f * (1 + Number(m.valor) / 100), 1);
  const porSpread = spread ? (1 + spread) ** (diasUteis / DIAS_UTEIS_NO_ANO) : 1;
  return porIndice * porSpread;
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
export function valorCorrigido(
  { base, indexador, taxa, dataAquisicao, vencimento },
  taxas = [],
  indices = [],
) {
  const parametros = parametrosDoIndexador(indexador, taxa);
  if (!parametros) return Number(base);

  const incidentes = taxasAplicaveis(taxas, { dataAquisicao, vencimento });

  // IPCA+ é o único que combina duas fontes: os meses trazem a inflação e as
  // taxas diárias entram só como contagem de dias úteis para o spread.
  if (parametros.inflacao !== undefined) {
    const meses = indicesAplicaveis(indices, { dataAquisicao, vencimento });
    return Number(base) * fatorInflacao(meses, incidentes.length, { spread: parametros.inflacao });
  }

  return Number(base) * fatorAcumulado(incidentes, parametros);
}
