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

/** Desloca "YYYY-MM" em `n` meses. */
function deslocarMes(anoMes, n) {
  const [ano, mes] = anoMes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** "YYYY-MM-15" da janela que começa naquele mês. */
const dia15 = (anoMes) => `${anoMes}-15`;

/**
 * Fator do índice de inflação, por **janelas do dia 15** (Design §30.2).
 *
 * Um título indexado ao IPCA não acumula meses de calendário: o índice corre
 * em janelas `[15/M, 15/M+1)`, distribuído **pro rata por dias úteis**.
 *
 * **Cuidado com o off-by-one do rótulo.** `defasagemMeses` guarda o número que
 * a corretora informa — "M-2" —, e esse rótulo conta a partir do **mês
 * corrente**, não do mês em que a janela abriu. Em 01/09 a janela vigente
 * abriu em 15/08 e aplica o IPCA de **julho**: setembro menos dois, mas agosto
 * menos **um**. Por isso o deslocamento é `defasagemMeses − 1`, e trocá-lo por
 * `defasagemMeses` erra um mês inteiro sem estourar nada.
 *
 * **O piso em zero não é elegância, é o limite do que foi medido.** O mapa
 * rótulo→deslocamento foi ajustado contra extrato em **dois pontos**: M-2 (um
 * mês atrás) e M0 (o próprio mês da janela, que é a convenção da NTN-B). Sem o
 * `Math.max`, M0 vira deslocamento `+1` e cada janela aplica o mês SEGUINTE —
 * índice errado nas antigas, mês inexistente nas recentes, e essas somem em
 * silêncio porque o laço trata `undefined` como "não publicado". O título vira
 * um pré-fixado sem avisar (Requisitos §3.24.1).
 *
 * Defasagem 1 cai no mesmo caso do 0 por extrapolação — ninguém cadastrou uma
 * ainda, e nenhum extrato a confirmou.
 *
 * `calendario` é a série diária do CDI — contar dias úteis exige saber quais
 * dias são úteis, o mesmo uso que o pré-fixado faz dela. A janela corrente
 * costuma ir além do último dia publicado; ali a contagem completa com dias de
 * semana, e a imprecisão fica limitada ao mês aberto.
 *
 * **A janela em que a compra cai conta, a partir do dia da compra.** O M39
 * fazia o contrário — ignorava essa janela — e isso era um **artefato do mês
 * que faltava**: o fit foi feito quando o app não tinha o índice do mês
 * corrente, e ignorar a primeira janela compensava, por acaso, a última que
 * sumia. Com a projeção da ANBIMA no lugar, a compensação deixa de existir e a
 * regra ad hoc só atrapalha (Requisitos §3.24.5).
 *
 * Medido contra três extratos, com agosto a −0,28% e corte em 29/08:
 *
 * ```
 *              ignorando a janela    contando pro rata
 * Fibra 1 (M0)      −R$ 26,52            +R$  0,23
 * Fibra 2 (M0)      −R$  3,08            −R$  0,63
 * BMG    (M-2)      −R$  9,27            +R$  3,04
 * ```
 *
 * O BMG **acompanha, não confirma**: o resíduo dele é da ordem de um dia de
 * rendimento e a data de leitura daquele extrato não ficou registrada. Quem
 * decide é o par do Fibra, onde a diferença é de duas ordens de grandeza.
 *
 * **Sem piso.** Um mês de deflação derruba o valor, que é o que acontece com o
 * título (§3.19.3).
 */
export function fatorInflacao(indices, { dataAquisicao, corte, defasagemMeses = 2, calendario = [] }) {
  if (!corte || corte < dataAquisicao) return 1;

  const porMes = new Map(indices.map((m) => [m.mes.slice(0, 7), Number(m.valor)]));
  const dias = calendario.map((t) => t.dia);
  const primeiroPublicado = dias[0];
  const ultimoPublicado = dias.at(-1);
  const guardado = new Set(dias);

  /**
   * Dias úteis em [de, ate).
   *
   * **Fora do intervalo publicado, cai para dias de semana.** Isso vale nas
   * duas pontas, não só no futuro: o calendário que chega é a janela já
   * recortada pela aquisição, então a primeira janela do índice — que abre no
   * dia 15 do mês anterior à compra — fica parcialmente antes dele. Sem esse
   * fallback o denominador encolhe e a fração vira 1, aplicando o mês inteiro
   * onde deveria entrar só um pedaço.
   */
  function diasUteis(de, ate) {
    if (ate <= de) return 0;
    let n = 0;
    for (const d = new Date(`${de}T00:00:00Z`); d.toISOString().slice(0, 10) < ate; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const publicado = primeiroPublicado && iso >= primeiroPublicado && iso <= ultimoPublicado;
      if (publicado ? guardado.has(iso) : ![0, 6].includes(d.getUTCDay())) n += 1;
    }
    return n;
  }

  let fator = 1;
  // A janela [15/M, 15/M+1) que CONTÉM a compra. Antes do dia 15, é a que
  // abriu no mês anterior; do dia 15 em diante, a do próprio mês — o 15 é o
  // primeiro dia da janela nova, não o último da velha.
  let mesJanela = dataAquisicao.slice(8, 10) < "15"
    ? deslocarMes(dataAquisicao.slice(0, 7), -1)
    : dataAquisicao.slice(0, 7);

  while (dia15(mesJanela) < corte) {
    const inicio = dia15(mesJanela);
    const fim = dia15(deslocarMes(mesJanela, 1));

    // O denominador é a janela INTEIRA. Encolhê-lo junto com o numerador
    // aplicaria o mês cheio num pedaço de janela — só o numerador anda.
    const total = diasUteis(inicio, fim);
    const de = inicio < dataAquisicao ? dataAquisicao : inicio;
    const vividos = diasUteis(de, fim < corte ? fim : corte);

    const valor = porMes.get(deslocarMes(mesJanela, -Math.max(defasagemMeses - 1, 0)));
    if (total > 0 && vividos > 0 && valor !== undefined) {
      fator *= (1 + valor / 100) ** (vividos / total);
    }
    mesJanela = deslocarMes(mesJanela, 1);
  }

  return fator;
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
  { base, indexador, taxa, dataAquisicao, vencimento, defasagemMeses = 2 },
  taxas = [],
  indices = [],
) {
  const parametros = parametrosDoIndexador(indexador, taxa);
  if (!parametros) return Number(base);

  const incidentes = taxasAplicaveis(taxas, { dataAquisicao, vencimento });

  // IPCA+ é o único que combina duas fontes: os meses trazem a inflação e as
  // taxas diárias entram só como contagem de dias úteis para o spread.
  if (parametros.inflacao !== undefined) {
    const corte = incidentes.at(-1)?.dia;
    const indice = fatorInflacao(indices, {
      dataAquisicao,
      corte,
      defasagemMeses,
      calendario: taxas,
    });
    const spread = (1 + parametros.inflacao) ** (incidentes.length / DIAS_UTEIS_NO_ANO);
    return Number(base) * indice * spread;
  }

  return Number(base) * fatorAcumulado(incidentes, parametros);
}
