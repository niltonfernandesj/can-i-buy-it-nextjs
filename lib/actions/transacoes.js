"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calcularFatura } from "@/lib/fatura";

const TIPOS_VALIDOS = ["ENTRADA", "SAIDA"];
const CATEGORIAS_VALIDAS = [
  "MERCADO",
  "LAZER",
  "SAUDE",
  "TRANSPORTE",
  "MORADIA",
  "SALARIO",
  "OUTROS",
];

function paraNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function paraData(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  // "YYYY-MM-DD" (formato de <input type="date">) precisa ser interpretado como
  // data local — new Date(string) trata esse formato como UTC meia-noite, o que
  // "volta" um dia em fusos atrás de UTC (ex: America/Sao_Paulo) e corrompe o
  // cálculo de fatura, que é sensível ao dia exato.
  const partesData = typeof valor === "string" ? valor.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (partesData) {
    const [, ano, mes, dia] = partesData;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Calcula dataEfetiva/mesReferencia/anoReferencia para uma transação não parcelada.
 * Cartão de crédito passa pelo cálculo de fatura; conta corrente usa a própria data da compra.
 */
function calcularReferencia(dataCompra, conta) {
  if (conta.tipo === "CARTAO_CREDITO") {
    const { mesReferencia, anoReferencia } = calcularFatura(
      dataCompra,
      conta.diaFechamento,
      conta.diaVencimento
    );
    return { dataEfetiva: dataCompra, mesReferencia, anoReferencia };
  }

  return {
    dataEfetiva: dataCompra,
    mesReferencia: dataCompra.getMonth() + 1,
    anoReferencia: dataCompra.getFullYear(),
  };
}

async function validarTransacao({
  tipo,
  valor,
  descricao,
  categoria,
  contaId,
  dataCompra,
  ehInvestimento,
  contaInvestimentoId,
}) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return { erro: "Tipo de transação inválido." };
  }

  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return { erro: "Categoria inválida." };
  }

  if (!descricao?.trim()) {
    return { erro: "Informe a descrição." };
  }

  const valorNum = paraNumeroPositivo(valor);
  if (valorNum === null) {
    return { erro: "Valor deve ser um número maior que zero." };
  }

  const dataCompraObj = paraData(dataCompra);
  if (!dataCompraObj) {
    return { erro: "Data da compra inválida." };
  }

  if (!contaId) {
    return { erro: "Selecione uma conta." };
  }

  const conta = await db.conta.findUnique({ where: { id: contaId } });
  if (!conta) {
    return { erro: "Conta não encontrada." };
  }

  if (conta.tipo === "CONTA_INVESTIMENTO") {
    return { erro: "Uma transação não pode ser lançada diretamente numa conta de investimento." };
  }

  const investimento = Boolean(ehInvestimento);

  if (investimento) {
    if (conta.tipo !== "CONTA_CORRENTE") {
      return {
        erro:
          "Aporte/resgate de investimento só pode ser lançado numa conta corrente (a origem/destino do investimento é indicada separadamente).",
      };
    }

    if (!contaInvestimentoId) {
      return { erro: "Selecione a conta de investimento de destino/origem." };
    }

    const contaInvestimento = await db.conta.findUnique({ where: { id: contaInvestimentoId } });
    if (!contaInvestimento || contaInvestimento.tipo !== "CONTA_INVESTIMENTO") {
      return { erro: "Conta de investimento inválida." };
    }
  }

  const { dataEfetiva, mesReferencia, anoReferencia } = calcularReferencia(dataCompraObj, conta);

  return {
    valores: {
      tipo,
      valor: valorNum,
      descricao: descricao.trim(),
      categoria,
      contaId,
      dataCompra: dataCompraObj,
      dataEfetiva,
      mesReferencia,
      anoReferencia,
      ehInvestimento: investimento,
      contaInvestimentoId: investimento ? contaInvestimentoId : null,
    },
  };
}

export async function criarTransacao(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = await validarTransacao(dados);
  if (erro) {
    return { error: erro };
  }

  await db.transacao.create({
    data: {
      ...valores,
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/transacoes");
  revalidatePath("/acompanhamento");
  return { success: true };
}
