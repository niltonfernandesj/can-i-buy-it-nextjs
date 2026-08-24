"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CORES_CATEGORIA_VALIDAS } from "@/lib/categorias";

// Categoria aparece em toda tela que exibe ou escolhe categoria — omitir
// alguma reproduz o bug de cache já ocorrido com contas (Design §8.5).
function revalidarTelasDeCategoria() {
  revalidatePath("/categorias");
  revalidatePath("/lancamento");
  revalidatePath("/transacoes");
  revalidatePath("/visao-mensal");
  revalidatePath("/valores-padrao");
}

function validarCategoria({ nome, cor }) {
  if (!nome?.trim()) {
    return { erro: "Informe o nome da categoria." };
  }

  if (!CORES_CATEGORIA_VALIDAS.includes(cor)) {
    return { erro: "Cor inválida." };
  }

  return { valores: { nome: nome.trim(), cor } };
}

// O nome é único (Design §18.1). A checagem antes do insert dá a mensagem
// boa; o índice único no banco é a garantia contra corrida entre dois
// salvamentos simultâneos — por isso o P2002 também é tratado.
async function nomeJaExiste(nome, ignorarId) {
  const existente = await db.categoria.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
  });
  return Boolean(existente);
}

export async function criarCategoria({ nome, cor }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = validarCategoria({ nome, cor });
  if (erro) {
    return { error: erro };
  }

  if (await nomeJaExiste(valores.nome)) {
    return { error: `Já existe uma categoria chamada "${valores.nome}".` };
  }

  try {
    await db.categoria.create({ data: valores });
  } catch (err) {
    if (err.code === "P2002") {
      return { error: `Já existe uma categoria chamada "${valores.nome}".` };
    }
    throw err;
  }

  revalidarTelasDeCategoria();
  return { success: true };
}

export async function editarCategoria(id, { nome, cor }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.categoria.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Categoria não encontrada." };
  }

  const { erro, valores } = validarCategoria({ nome, cor });
  if (erro) {
    return { error: erro };
  }

  if (await nomeJaExiste(valores.nome, id)) {
    return { error: `Já existe uma categoria chamada "${valores.nome}".` };
  }

  try {
    await db.categoria.update({ where: { id }, data: valores });
  } catch (err) {
    if (err.code === "P2002") {
      return { error: `Já existe uma categoria chamada "${valores.nome}".` };
    }
    throw err;
  }

  revalidarTelasDeCategoria();
  return { success: true };
}

// Desativar é o caminho para aposentar uma categoria sem perder histórico
// (Requisitos §3.10): ela some dos formulários, mas segue exibida e
// filtrável nos lançamentos que já a usam.
export async function alternarAtivaCategoria(id, ativa) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.categoria.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Categoria não encontrada." };
  }

  await db.categoria.update({ where: { id }, data: { ativa: Boolean(ativa) } });

  revalidarTelasDeCategoria();
  return { success: true };
}

export async function apagarCategoria(id) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.categoria.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Categoria não encontrada." };
  }

  // A mensagem precisa dizer quantos itens impedem e apontar a saída
  // (desativar) — um "não é possível excluir" seco deixaria o usuário sem
  // caminho (Design §18.3).
  const [transacoes, valoresPadrao] = await Promise.all([
    db.transacao.count({ where: { categoriaId: id } }),
    db.valorPadrao.count({ where: { categoriaId: id } }),
  ]);

  if (transacoes > 0 || valoresPadrao > 0) {
    const partes = [];
    if (transacoes > 0) {
      partes.push(`${transacoes} ${transacoes === 1 ? "lançamento" : "lançamentos"}`);
    }
    if (valoresPadrao > 0) {
      partes.push(`${valoresPadrao} ${valoresPadrao === 1 ? "valor padrão" : "valores padrão"}`);
    }
    const verbo = transacoes + valoresPadrao === 1 ? "usa" : "usam";
    return {
      error: `Não é possível apagar "${existente.nome}": ${partes.join(" e ")} ${verbo} esta categoria. Desative-a para parar de oferecê-la em novos lançamentos, sem perder o histórico.`,
    };
  }

  try {
    await db.categoria.delete({ where: { id } });
  } catch (err) {
    // Garantia final da FK (ON DELETE RESTRICT), caso algo tenha passado a
    // usar a categoria entre a contagem acima e o delete.
    if (err.code === "P2003") {
      return {
        error: `Não é possível apagar "${existente.nome}": há lançamentos usando esta categoria.`,
      };
    }
    throw err;
  }

  revalidarTelasDeCategoria();
  return { success: true };
}
