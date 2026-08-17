"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const TIPOS_VALIDOS = ["CONTA_CORRENTE", "CARTAO_CREDITO", "CONTA_INVESTIMENTO"];

function paraInteiroOuNull(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return null;
  }
  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : NaN;
}

function validarConta({ nome, tipo, diaFechamento, diaVencimento }) {
  if (!nome?.trim()) {
    return { erro: "Informe o nome da conta." };
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return { erro: "Tipo de conta inválido." };
  }

  const ehCartao = tipo === "CARTAO_CREDITO";

  if (!ehCartao) {
    return { valores: { nome: nome.trim(), tipo, diaFechamento: null, diaVencimento: null } };
  }

  const diaFechamentoNum = paraInteiroOuNull(diaFechamento);
  const diaVencimentoNum = paraInteiroOuNull(diaVencimento);

  if (diaFechamentoNum === null || diaVencimentoNum === null) {
    return { erro: "Dia de fechamento e dia de vencimento são obrigatórios para cartão de crédito." };
  }

  if (Number.isNaN(diaFechamentoNum) || diaFechamentoNum < 1 || diaFechamentoNum > 31) {
    return { erro: "Dia de fechamento deve ser um número entre 1 e 31." };
  }

  if (Number.isNaN(diaVencimentoNum) || diaVencimentoNum < 1 || diaVencimentoNum > 31) {
    return { erro: "Dia de vencimento deve ser um número entre 1 e 31." };
  }

  return {
    valores: {
      nome: nome.trim(),
      tipo,
      diaFechamento: diaFechamentoNum,
      diaVencimento: diaVencimentoNum,
    },
  };
}

export async function criarConta({ nome, tipo, diaFechamento, diaVencimento }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = validarConta({ nome, tipo, diaFechamento, diaVencimento });
  if (erro) {
    return { error: erro };
  }

  await db.conta.create({
    data: {
      ...valores,
      usuarioId: session.user.id,
    },
  });

  revalidatePath("/contas");
  return { success: true };
}

export async function editarConta(id, { nome, tipo, diaFechamento, diaVencimento }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = validarConta({ nome, tipo, diaFechamento, diaVencimento });
  if (erro) {
    return { error: erro };
  }

  await db.conta.update({
    where: { id },
    data: valores,
  });

  revalidatePath("/contas");
  return { success: true };
}

export async function apagarConta(id) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  try {
    await db.conta.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2003") {
      return { error: "Não é possível apagar esta conta: existem transações vinculadas a ela." };
    }
    throw err;
  }

  revalidatePath("/contas");
  return { success: true };
}
