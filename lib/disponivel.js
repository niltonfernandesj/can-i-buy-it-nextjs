/**
 * Régua do percentual do disponível na Projeção (spec-01 §3.12, Design §14.4).
 *
 * Funções puras, sem dependência de `db` — são consumidas por um Client
 * Component (`projecao-client.jsx`).
 */

/**
 * Quanto o disponível representa das entradas do mês, em porcentagem.
 *
 * Devolve `null` quando não há base de cálculo — a camada de exibição usa isso
 * pra esconder o rótulo. Null e não zero de propósito: zero é um percentual
 * legítimo (disponível exatamente zerado, faixa crítica), e confundir os dois
 * faria um mês sem renda parecer um mês sem folga.
 *
 * A guarda é `!(entradas > 0)` e não `entradas === 0` pra cobrir também
 * negativo, `null`, `undefined` e `NaN` — nenhum `Infinity` chega à tela.
 */
export function percentualDoDisponivel(disponivel, entradas) {
  if (!(entradas > 0)) return null;
  return (disponivel / entradas) * 100;
}

/**
 * Faixa da régua. Limites inclusivos no piso: exatamente 40% já é "otimo".
 *
 * Negativo não tem tratamento próprio — qualquer valor abaixo de 5 cai em
 * "critico", que é exatamente a regra dos Requisitos.
 */
export function faixaDoPercentual(percentual) {
  if (percentual >= 40) return "otimo";
  if (percentual >= 25) return "bom";
  if (percentual >= 10) return "atencao";
  if (percentual >= 5) return "baixo";
  return "critico";
}
