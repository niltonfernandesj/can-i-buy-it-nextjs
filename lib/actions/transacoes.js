"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calcularFatura } from "@/lib/fatura";
import { gerarParcelas } from "@/lib/parcelamento";
import { paraDataLocal as paraData } from "@/lib/datas";

const TIPOS_VALIDOS = ["ENTRADA", "SAIDA"];

/**
 * Valida o categoriaId recebido do formulário.
 *
 * `idAtual` é o categoriaId que a transação já tem: se for igual ao enviado,
 * uma categoria inativa é aceita. Sem isso, editar só o valor de um
 * lançamento antigo forçaria trocar a categoria junto (Design §18.3).
 */
async function resolverCategoria(categoriaId, idAtual) {
  if (!categoriaId) {
    return { erro: "Selecione uma categoria." };
  }

  const categoria = await db.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) {
    return { erro: "Categoria não encontrada." };
  }

  if (!categoria.ativa && categoriaId !== idAtual) {
    return { erro: `A categoria "${categoria.nome}" está inativa e não pode ser usada em novos lançamentos.` };
  }

  return { campos: { categoriaId: categoria.id } };
}

function paraNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
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
  categoriaId,
  contaId,
  dataCompra,
  ehInvestimento,
  contaInvestimentoId,
}, categoriaIdAtual) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return { erro: "Tipo de transação inválido." };
  }

  const { erro: erroCategoria, campos: camposCategoria } = await resolverCategoria(
    categoriaId,
    categoriaIdAtual
  );
  if (erroCategoria) {
    return { erro: erroCategoria };
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
      ...camposCategoria,
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
  revalidatePath("/visao-mensal");
  return { success: true };
}

async function validarConteudoBasico({ valor, descricao, categoriaId }, categoriaIdAtual) {
  const { erro: erroCategoria, campos: camposCategoria } = await resolverCategoria(
    categoriaId,
    categoriaIdAtual
  );
  if (erroCategoria) {
    return { erro: erroCategoria };
  }

  if (!descricao?.trim()) {
    return { erro: "Informe a descrição." };
  }

  const valorNum = paraNumeroPositivo(valor);
  if (valorNum === null) {
    return { erro: "Valor deve ser um número maior que zero." };
  }

  return { valores: { valor: valorNum, descricao: descricao.trim(), ...camposCategoria } };
}

// Uma parcela tem dataEfetiva/mesReferencia definidos pelo gerarParcelas
// (Task 8), não pela própria dataCompra — reaplicar o cálculo de fatura
// genérico aqui corromperia essa sequência.
function grupoDaTransacao(transacao) {
  if (transacao.parcelamentoId !== null) {
    return { campo: "parcelamentoId", id: transacao.parcelamentoId };
  }
  return null;
}

export async function editarTransacao(id, dados, { propagarParaRestantes } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.transacao.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Transação não encontrada." };
  }

  // Numa parcela, só o conteúdo (valor/descrição/categoria) é editável;
  // conta, data e tipo ficam travados no que já existe.
  const grupo = grupoDaTransacao(existente);

  // O categoriaId atual é passado adiante para que uma categoria já inativa
  // continue aceitável nesta edição (Design §18.3).
  const { erro, valores } = grupo
    ? await validarConteudoBasico(dados, existente.categoriaId)
    : await validarTransacao(dados, existente.categoriaId);

  if (erro) {
    return { error: erro };
  }

  const propagar = Boolean(propagarParaRestantes) && grupo !== null;

  if (propagar) {
    // A própria linha (dataEfetiva = existente.dataEfetiva) + todas as de
    // dataEfetiva futura do mesmo parcelamento.
    await db.transacao.updateMany({
      where: {
        [grupo.campo]: grupo.id,
        dataEfetiva: { gte: existente.dataEfetiva },
      },
      data: valores,
    });
  } else {
    await db.transacao.update({
      where: { id },
      data: valores,
    });
  }

  revalidatePath("/transacoes");
  revalidatePath("/visao-mensal");
  return { success: true };
}

export async function apagarTransacao(id, { propagarParaRestantes } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const existente = await db.transacao.findUnique({ where: { id } });
  if (!existente) {
    return { error: "Transação não encontrada." };
  }

  const grupo = grupoDaTransacao(existente);
  const propagar = Boolean(propagarParaRestantes) && grupo !== null;

  if (propagar) {
    // A própria linha + todas as de dataEfetiva futura do mesmo parcelamento.
    await db.transacao.deleteMany({
      where: {
        [grupo.campo]: grupo.id,
        dataEfetiva: { gte: existente.dataEfetiva },
      },
    });
  } else {
    await db.transacao.delete({ where: { id } });
  }

  revalidatePath("/transacoes");
  revalidatePath("/visao-mensal");
  return { success: true };
}

async function validarTransacaoParcelada({
  descricao,
  categoriaId,
  contaId,
  dataCompra,
  valorParcela,
  numeroParcelas,
}) {
  const { erro: erroCategoria, campos: camposCategoria } = await resolverCategoria(categoriaId);
  if (erroCategoria) {
    return { erro: erroCategoria };
  }

  if (!descricao?.trim()) {
    return { erro: "Informe a descrição." };
  }

  const valorParcelaNum = paraNumeroPositivo(valorParcela);
  if (valorParcelaNum === null) {
    return { erro: "Valor da parcela deve ser um número maior que zero." };
  }

  const n = Number(numeroParcelas);
  if (!Number.isInteger(n) || n < 1) {
    return { erro: "Número de parcelas deve ser um inteiro maior ou igual a 1." };
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

  if (conta.tipo !== "CARTAO_CREDITO") {
    return { erro: "Parcelamento só é permitido para compras no cartão de crédito." };
  }

  return {
    valores: {
      descricao: descricao.trim(),
      camposCategoria,
      contaId,
      dataCompra: dataCompraObj,
      valorParcela: valorParcelaNum,
      numeroParcelas: n,
      conta,
    },
  };
}

export async function criarTransacaoParcelada(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }

  const { erro, valores } = await validarTransacaoParcelada(dados);
  if (erro) {
    return { error: erro };
  }

  const { descricao, camposCategoria, contaId, dataCompra, valorParcela, numeroParcelas, conta } = valores;

  const parcelas = gerarParcelas(dataCompra, valorParcela, numeroParcelas, {
    diaFechamento: conta.diaFechamento,
    diaVencimento: conta.diaVencimento,
  });

  await db.$transaction(
    parcelas.map((parcela) =>
      db.transacao.create({
        data: {
          usuarioId: session.user.id,
          tipo: "SAIDA",
          descricao,
          ...camposCategoria,
          contaId,
          ehInvestimento: false,
          ...parcela,
        },
      })
    )
  );

  revalidatePath("/transacoes");
  revalidatePath("/visao-mensal");
  return { success: true };
}

