export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatarMesReferencia(mes, ano) {
  return `${MESES[mes - 1]} de ${ano}`;
}

export function formatarDataCurta(data) {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Converte o valor de um <input type="date"> em Date local.
 *
 * "YYYY-MM-DD" precisa ser interpretado como data local: `new Date(string)`
 * trata esse formato como UTC meia-noite, o que "volta" um dia em fusos atrás
 * de UTC (America/Sao_Paulo) e corrompe qualquer cálculo sensível ao dia
 * exato — foi o bug que originou este cuidado no cálculo de fatura.
 *
 * Extraída de lib/actions/transacoes.js na Task 111, quando uma segunda
 * Server Action passou a precisar da mesma regra.
 */
export function paraDataLocal(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const partes = typeof valor === "string" ? valor.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (partes) {
    const [, ano, mes, dia] = partes;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}
