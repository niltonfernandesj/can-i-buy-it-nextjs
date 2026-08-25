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
