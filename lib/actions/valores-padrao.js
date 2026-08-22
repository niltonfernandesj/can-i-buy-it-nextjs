"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const TIPOS_VALIDOS = ["ENTRADA", "SAIDA"];
const MEIOS_VALIDOS = ["CREDITO", "DEBITO"];
const CATEGORIAS_VALIDAS = ["MERCADO", "LAZER", "SAUDE", "TRANSPORTE", "MORADIA", "SALARIO", "OUTROS"];

function paraNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function paraNumeroNaoNegativo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

// "YYYY-MM-DD" (formato de <input type="date">) precisa ser interpretado como
// data local — new Date(string) trata esse formato como UTC meia-noite, o que
// "volta" um dia em fusos atrás de UTC (mesma armadilha de lib/actions/transacoes.js).
function paraData(valor) {
  const partesData = typeof valor === "string" ? valor.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (partesData) {
    const [, ano, mes, dia] = partesData;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return Number.isNaN(data.getTime()) ? null : data;
  }
  return null;
}

function validarValorPadrao({ descricao, valor, tipo, meio, categoria }) {
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
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return { erro: "Informe a categoria da despesa padrão." };
    }
    return { valores: { descricao: descricao.trim(), valor: valorNum, tipo, meio, categoria } };
  }

  return { valores: { descricao: descricao.trim(), valor: valorNum, tipo, meio: null, categoria: null } };
}

function revalidarTelasAfetadas() {
  // Valores padrão entram na composição da Visão mensal (Design §13) e da
  // Projeção (Design §14) — omitir alguma reproduz o bug de cache já ocorrido
  // com contas, onde uma tela ficava com dado desatualizado.
  revalidatePath("/valores-padrao");
  revalidatePath("/visao-mensal");
  revalidatePath("/projecao");
}

function revalidarTelasDeDespesa() {
  // Consolidação de despesa (Design §13.6) cria/apaga Transacao — /transacoes
  // também precisa revalidar, diferente da consolidação de receita, que só
  // ajusta um número e não toca em lançamentos.
  revalidatePath("/visao-mensal");
  revalidatePath("/projecao");
  revalidatePath("/transacoes");
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

  // Consolidações (spec-01 §3.8, §3.9) referenciam o item via FK RESTRICT —
  // sem apagá-las primeiro, apagar um item consolidado falha com violação de
  // integridade referencial. As transações geradas por consolidação de
  // despesa sobrevivem (spec-01 §3.9) — só o registro de vínculo é apagado,
  // e o lançamento volta a aparecer no agrupamento por dia.
  await db.$transaction([
    db.consolidacaoReceitaPadrao.deleteMany({ where: { valorPadraoId: id } }),
    db.consolidacaoDespesaPadrao.deleteMany({ where: { valorPadraoId: id } }),
    db.valorPadrao.delete({ where: { id } }),
  ]);

  revalidarTelasAfetadas();
  return { success: true };
}

// Consolidação mensal de receita padrão (spec-01 §3.8, spec-02 §13.5) —
// substitui ValorPadrao.valor só num mês específico, editada inline na
// Visão mensal (não nesta tela).

export async function consolidarReceitaPadrao({ valorPadraoId, mesReferencia, anoReferencia, valor }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const item = await db.valorPadrao.findUnique({ where: { id: valorPadraoId } });
  if (!item) {
    return { error: "Valor padrão não encontrado." };
  }
  if (item.tipo !== "ENTRADA") {
    return { error: "Só receitas padrão podem ser consolidadas por mês." };
  }

  const valorNum = paraNumeroPositivo(valor);
  if (valorNum === null) {
    return { error: "Valor deve ser um número maior que zero." };
  }

  await db.consolidacaoReceitaPadrao.upsert({
    where: {
      valorPadraoId_mesReferencia_anoReferencia: { valorPadraoId, mesReferencia, anoReferencia },
    },
    create: { valorPadraoId, mesReferencia, anoReferencia, valor: valorNum },
    update: { valor: valorNum },
  });

  revalidarTelasAfetadas();
  return { success: true };
}

export async function removerConsolidacaoReceitaPadrao({ valorPadraoId, mesReferencia, anoReferencia }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  await db.consolidacaoReceitaPadrao.deleteMany({
    where: { valorPadraoId, mesReferencia, anoReferencia },
  });

  revalidarTelasAfetadas();
  return { success: true };
}

// Consolidação de despesa padrão no débito (spec-01 §3.9, spec-02 §13.6) —
// diferente da de receita, esta GERA um lançamento real: cria/atualiza a
// Transacao e faz upsert do vínculo, numa $transaction.

export async function consolidarDespesaPadrao({
  valorPadraoId,
  mesReferencia,
  anoReferencia,
  valor,
  data,
  contaId,
  categoria,
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const item = await db.valorPadrao.findUnique({ where: { id: valorPadraoId } });
  if (!item) {
    return { error: "Valor padrão não encontrado." };
  }
  if (item.tipo !== "SAIDA" || item.meio !== "DEBITO") {
    return { error: "Só despesas padrão no débito podem ser consolidadas." };
  }

  const valorNum = paraNumeroNaoNegativo(valor);
  if (valorNum === null) {
    return { error: "Valor deve ser um número maior ou igual a zero." };
  }

  const registroExistente = await db.consolidacaoDespesaPadrao.findUnique({
    where: {
      valorPadraoId_mesReferencia_anoReferencia: { valorPadraoId, mesReferencia, anoReferencia },
    },
  });

  // Valor zero: "não precisei pagar neste mês" — resolve o item sem criar
  // lançamento. A ordem importa (Design §13.6): zera transacaoId no registro
  // ANTES de apagar a transação antiga, senão o onDelete: Cascade apagaria o
  // registro inteiro junto, perdendo a marca de "resolvido por R$ 0".
  if (valorNum === 0) {
    await db.$transaction(async (tx) => {
      await tx.consolidacaoDespesaPadrao.upsert({
        where: {
          valorPadraoId_mesReferencia_anoReferencia: { valorPadraoId, mesReferencia, anoReferencia },
        },
        create: { valorPadraoId, mesReferencia, anoReferencia, transacaoId: null },
        update: { transacaoId: null },
      });
      if (registroExistente?.transacaoId) {
        await tx.transacao.delete({ where: { id: registroExistente.transacaoId } });
      }
    });

    revalidarTelasDeDespesa();
    return { success: true };
  }

  const dataObj = paraData(data);
  if (!dataObj) {
    return { error: "Data inválida." };
  }
  if (dataObj.getMonth() + 1 !== mesReferencia || dataObj.getFullYear() !== anoReferencia) {
    return { error: "A data precisa cair dentro do mês exibido." };
  }

  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return { error: "Categoria inválida." };
  }

  const conta = await db.conta.findUnique({ where: { id: contaId } });
  if (!conta || conta.tipo !== "CONTA_CORRENTE") {
    return { error: "Selecione uma conta corrente." };
  }

  const dadosTransacao = {
    tipo: "SAIDA",
    valor: valorNum,
    descricao: item.descricao,
    categoria,
    contaId,
    dataCompra: dataObj,
    dataEfetiva: dataObj,
    mesReferencia,
    anoReferencia,
    ehInvestimento: false,
    usuarioId: session.user.id,
  };

  await db.$transaction(async (tx) => {
    if (registroExistente?.transacaoId) {
      await tx.transacao.update({ where: { id: registroExistente.transacaoId }, data: dadosTransacao });
    } else {
      const transacao = await tx.transacao.create({ data: dadosTransacao });
      await tx.consolidacaoDespesaPadrao.upsert({
        where: {
          valorPadraoId_mesReferencia_anoReferencia: { valorPadraoId, mesReferencia, anoReferencia },
        },
        create: { valorPadraoId, mesReferencia, anoReferencia, transacaoId: transacao.id },
        update: { transacaoId: transacao.id },
      });
    }
  });

  revalidarTelasDeDespesa();
  return { success: true };
}

export async function removerConsolidacaoDespesaPadrao({ valorPadraoId, mesReferencia, anoReferencia }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const registro = await db.consolidacaoDespesaPadrao.findUnique({
    where: {
      valorPadraoId_mesReferencia_anoReferencia: { valorPadraoId, mesReferencia, anoReferencia },
    },
  });

  if (registro?.transacaoId) {
    await db.transacao.delete({ where: { id: registro.transacaoId } }); // onDelete: Cascade apaga o registro junto
  } else if (registro) {
    await db.consolidacaoDespesaPadrao.delete({ where: { id: registro.id } });
  }

  revalidarTelasDeDespesa();
  return { success: true };
}
