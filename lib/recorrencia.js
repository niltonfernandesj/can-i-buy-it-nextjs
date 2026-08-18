import { createId as cuid } from "@paralleldrive/cuid2";
import { calcularFatura } from "@/lib/fatura";
import { ultimoDiaDoMes } from "@/lib/parcelamento";

export function proximaDataMensal(dataBase, mesesAFrente) {
  const ano = dataBase.getFullYear();
  const mes = dataBase.getMonth() + 1; // 1-12
  const dia = dataBase.getDate();

  let novoMes = mes + mesesAFrente;
  const novoAno = ano + Math.floor((novoMes - 1) / 12);
  novoMes = ((novoMes - 1) % 12) + 1;

  const diaClampado = Math.min(dia, ultimoDiaDoMes(novoAno, novoMes));
  return new Date(novoAno, novoMes - 1, diaClampado);
}

/**
 * @param {Date} dataCompra
 * @param {number} valor
 * @param {number} n - quantidade de meses/ocorrências
 * @param {{ tipo: string, diaFechamento?: number, diaVencimento?: number }} conta
 */
export function gerarOcorrenciasRecorrencia(dataCompra, valor, n, conta) {
  const recorrenciaId = cuid();
  const ocorrencias = [];

  for (let i = 1; i <= n; i++) {
    const data = proximaDataMensal(dataCompra, i - 1);

    const { mesReferencia, anoReferencia } =
      conta.tipo === "CARTAO_CREDITO"
        ? calcularFatura(data, conta.diaFechamento, conta.diaVencimento)
        : { mesReferencia: data.getMonth() + 1, anoReferencia: data.getFullYear() };

    ocorrencias.push({
      numeroOcorrencia: i,
      totalOcorrencias: n,
      recorrenciaId,
      dataCompra: data,
      dataEfetiva: data,
      mesReferencia,
      anoReferencia,
      valor,
    });
  }

  return ocorrencias; // inserir todas em uma transaction do Prisma
}
