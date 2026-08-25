/**
 * Rótulos exibidos dos enums de investimento (Design §20.1).
 *
 * Os enums são de domínio; o texto que aparece na tela vive aqui, no mesmo
 * padrão de TIPO_CONTA_LABELS (lib/contas.js).
 */

export const ROTULO_ESTRATEGIA = {
  POS_FIXADO: "Pós-fixado",
  PRE_FIXADO: "Pré-fixado",
  INFLACAO: "Inflação",
};

export const ROTULO_PRODUTO = {
  CDB: "CDB",
  LCA: "LCA",
  LCI: "LCI",
  TESOURO_DIRETO: "Tesouro Direto",
};

/** Quais indexadores cada estratégia oferece (Requisitos §3.13.2). */
export const INDEXADORES_POR_ESTRATEGIA = {
  POS_FIXADO: ["PERCENTUAL_CDI", "PERCENTUAL_SELIC", "CDI_MAIS", "SELIC_MAIS"],
  PRE_FIXADO: ["PREFIXADO"],
  INFLACAO: ["IPCA_MAIS"],
};

export const ROTULO_INDEXADOR = {
  PERCENTUAL_CDI: "% do CDI",
  PERCENTUAL_SELIC: "% da Selic",
  CDI_MAIS: "CDI +",
  SELIC_MAIS: "Selic +",
  PREFIXADO: "% fixo a.a.",
  IPCA_MAIS: "IPCA +",
};

/**
 * O que a taxa significa junto de cada indexador. O número muda de sentido —
 * em `% do CDI`, 110 é uma fração do índice; em `CDI +`, é um spread somado a
 * ele — e sem essa dica o campo aceitaria 110 nos dois casos sem avisar que o
 * segundo é absurdo.
 */
export const DICA_TAXA = {
  PERCENTUAL_CDI: "Fração do CDI. Ex.: 110 para 110% do CDI.",
  PERCENTUAL_SELIC: "Fração da Selic. Ex.: 100 para 100% da Selic.",
  CDI_MAIS: "Spread em % ao ano somado ao CDI. Ex.: 2 para CDI + 2%.",
  SELIC_MAIS: "Spread em % ao ano somado à Selic. Ex.: 2 para Selic + 2%.",
  PREFIXADO: "Taxa fixa em % ao ano. Ex.: 13,2.",
  IPCA_MAIS: "Spread em % ao ano somado ao IPCA. Ex.: 6,1.",
};

function formatarTaxa(taxa) {
  return Number(taxa)
    .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/,00$/, "");
}

/**
 * Como a taxa se lê junto do indexador. O sentido do número muda com ele:
 * em PERCENTUAL_CDI, 110 é "110% do CDI"; em CDI_MAIS, 2 é "CDI + 2% a.a."
 * (Requisitos §3.13.2). É por isso que o rótulo não pode ser genérico.
 */
export function rotuloIndexador(indexador, taxa) {
  const t = formatarTaxa(taxa);
  switch (indexador) {
    case "PERCENTUAL_CDI":
      return `${t}% CDI`;
    case "PERCENTUAL_SELIC":
      return `${t}% Selic`;
    case "CDI_MAIS":
      return `CDI + ${t}%`;
    case "SELIC_MAIS":
      return `Selic + ${t}%`;
    case "PREFIXADO":
      return `${t}% a.a.`;
    case "IPCA_MAIS":
      return `IPCA + ${t}%`;
    default:
      return `${t}%`;
  }
}

export const ROTULO_MOTIVO = {
  CUPOM: "Cupom",
  TAXA: "Taxa",
  CORRETAGEM: "Corretagem",
  AJUSTE: "Ajuste",
};

/**
 * Quais motivos cada natureza aceita (Requisitos §3.13.3).
 *
 * Cupom só existe entrando; taxa e corretagem, só saindo. `AJUSTE` serve aos
 * dois lados e é a válvula de escape — inclusive para transferência entre
 * corretoras, que ficou sem operação própria: quem precisar registra um débito
 * numa conta e um crédito na outra, sem amarração.
 */
export const MOTIVOS_POR_NATUREZA = {
  CREDITO: ["CUPOM", "AJUSTE"],
  DEBITO: ["TAXA", "CORRETAGEM", "AJUSTE"],
};

export const ROTULO_NATUREZA = {
  CREDITO: "Crédito — entra",
  DEBITO: "Débito — sai",
};
