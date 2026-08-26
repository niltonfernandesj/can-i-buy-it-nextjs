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

/**
 * A data cai depois de hoje?
 *
 * O corte é o **fim do dia corrente**, não o instante atual: lançar algo com a
 * data de hoje é o caso normal, e comparar com `new Date()` recusaria isso a
 * partir de 00h01 — as datas vêm de `<input type="date">` e chegam sempre à
 * meia-noite local.
 *
 * Usada para recusar operação de investimento com data futura (Requisitos
 * §3.13.5): investimento é registro do que aconteceu, não agendamento.
 */
export function ehFutura(data) {
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);
  return data > fimDeHoje;
}

/** "YYYY-MM-DD" de hoje, para o `max` de um `<input type="date">`. */
export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * `Date` → "YYYY-MM-DD" pelos componentes **locais**.
 *
 * Para datas gravadas por `paraDataLocal` (meia-noite local), que é o caso de
 * `dataAquisicao` e `vencimento`. Usar `toISOString()` aqui devolveria o dia
 * anterior em qualquer fuso a oeste de Greenwich.
 */
export function paraDiaISO(data) {
  const d = data instanceof Date ? data : new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
