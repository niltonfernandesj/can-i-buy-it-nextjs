"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const TIPOS_VALIDOS = ["ENTRADA", "SAIDA"];
const MEIOS_VALIDOS = ["CREDITO", "DEBITO"];

function paraNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function validarValorPadrao({ descricao, valor, tipo, meio }) {
  if (!descricao?.trim()) {
    return { erro: "Informe a descrição." };
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return { erro: "Tipo inválido." };
  }

  const valorNum = paraNumeroPositivo(valor);
  if (valorNum === null) {
    return { erro: "Valor deve ser um número maior que zero." };
  }

  if (tipo === "SAIDA") {
    if (!MEIOS_VALIDOS.includes(meio)) {
      return { erro: "Informe se a despesa padrão é no crédito ou no débito." };
    }
    return { valores: { descricao: descricao.trim(), valor: valorNum, tipo, meio } };
  }

  return { valores: { descricao: descricao.trim(), valor: valorNum, tipo, meio: null } };
}

function revalidarTelasAfetadas() {
  // Valores padrão entram na composição da Visão geral (Design §13) e da
  // Projeção (Design §14) — omitir alguma reproduz o bug de cache já ocorrido
  // com contas, onde uma tela ficava com dado desatualizado.
  revalidatePath("/valores-padrao");
  revalidatePath("/visao-geral");
  revalidatePath("/projecao");
}

export async function criarValorPadrao(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = validarValorPadrao(dados);
  if (erro) {
    return { error: erro };
  }

  await db.valorPadrao.create({
    data: {
      ...valores,
      usuarioId: session.user.id,
    },
  });

  revalidarTelasAfetadas();
  return { success: true };
}

export async function editarValorPadrao(id, dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.valorPadrao.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Valor padrão não encontrado." };
  }

  const { erro, valores } = validarValorPadrao(dados);
  if (erro) {
    return { error: erro };
  }

  await db.valorPadrao.update({
    where: { id },
    data: valores,
  });

  revalidarTelasAfetadas();
  return { success: true };
}

export async function apagarValorPadrao(id) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.valorPadrao.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Valor padrão não encontrado." };
  }

  await db.valorPadrao.delete({ where: { id } });

  revalidarTelasAfetadas();
  return { success: true };
}
