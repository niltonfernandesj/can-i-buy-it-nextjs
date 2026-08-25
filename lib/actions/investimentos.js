"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { paraDataLocal } from "@/lib/datas";
import { saldoEmConta } from "@/lib/investimentos";
import { INDEXADORES_POR_ESTRATEGIA } from "@/lib/ativos";

const PRODUTOS = ["CDB", "LCA", "LCI", "TESOURO_DIRETO"];
const ESTRATEGIAS = ["POS_FIXADO", "PRE_FIXADO", "INFLACAO"];

/**
 * Saldo parado de uma conta de investimento, pelas mesmas regras da tela
 * (Design §20.2). Vive aqui porque a trava de saldo é da Server Action: o
 * saldo é derivado, então não existe constraint no banco que o expresse —
 * mesma situação de "não exclui categoria em uso" (§18.3).
 */
async function saldoParadoDe(contaId) {
  const [aportes, resgates, movimentos, ativos] = await Promise.all([
    db.transacao.aggregate({
      where: { ehInvestimento: true, tipo: "SAIDA", contaInvestimentoId: contaId },
      _sum: { valor: true },
    }),
    db.transacao.aggregate({
      where: { ehInvestimento: true, tipo: "ENTRADA", contaInvestimentoId: contaId },
      _sum: { valor: true },
    }),
    db.movimentoInvestimento.groupBy({
      by: ["natureza"],
      where: { contaId },
      _sum: { valor: true },
    }),
    db.ativo.findMany({ where: { contaId }, include: { liquidacoes: true } }),
  ]);

  const porNatureza = (n) =>
    Number(movimentos.find((m) => m.natureza === n)?._sum.valor ?? 0);

  return saldoEmConta({
    aportes: Number(aportes._sum.valor ?? 0),
    resgates: Number(resgates._sum.valor ?? 0),
    creditos: porNatureza("CREDITO"),
    debitos: porNatureza("DEBITO"),
    ativos,
  });
}

function numeroPositivo(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function validar(dados) {
  const { contaId, estrategia, produto, emissor, indexador, taxa, dataAquisicao, vencimento, valorAquisicao } = dados;

  if (!contaId) return { erro: "Selecione a conta de investimento." };

  const conta = await db.conta.findUnique({ where: { id: contaId } });
  if (!conta || conta.tipo !== "CONTA_INVESTIMENTO") {
    return { erro: "A conta escolhida não é uma conta de investimento." };
  }

  if (!ESTRATEGIAS.includes(estrategia)) return { erro: "Estratégia inválida." };
  if (!PRODUTOS.includes(produto)) return { erro: "Produto inválido." };

  // O indexador é restrito pela estratégia (Requisitos §3.13.2). A tela já
  // filtra, mas a trava vive aqui: um formulário não é uma garantia.
  if (!INDEXADORES_POR_ESTRATEGIA[estrategia].includes(indexador)) {
    return { erro: "Esse indexador não pertence à estratégia escolhida." };
  }

  if (!emissor?.trim()) return { erro: "Informe o emissor." };

  const taxaNum = numeroPositivo(taxa);
  if (taxaNum === null) return { erro: "Taxa deve ser um número maior que zero." };

  const aquisicao = paraDataLocal(dataAquisicao);
  if (!aquisicao) return { erro: "Data de aquisição inválida." };

  const venc = paraDataLocal(vencimento);
  if (!venc) return { erro: "Data de vencimento inválida." };
  if (venc <= aquisicao) return { erro: "O vencimento precisa ser depois da aquisição." };

  const valor = numeroPositivo(valorAquisicao);
  if (valor === null) return { erro: "Valor de aquisição deve ser maior que zero." };

  const disponivel = await saldoParadoDe(contaId);
  if (valor > disponivel) {
    return {
      erro: `Saldo insuficiente em ${conta.nome}: disponível ${disponivel.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`,
    };
  }

  return {
    valores: {
      contaId,
      mercado: "RENDA_FIXA",
      estrategia,
      produto,
      emissor: emissor.trim(),
      indexador,
      taxa: taxaNum,
      dataAquisicao: aquisicao,
      vencimento: venc,
      valorAquisicao: valor,
    },
  };
}

export async function criarAtivo(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  const { erro, valores } = await validar(dados);
  if (erro) return { error: erro };

  await db.ativo.create({ data: { ...valores, usuarioId: session.user.id } });

  // Só /investimentos: comprar um ativo não cria transação nenhuma, e
  // revalidar /visao-mensal ou /transacoes sugeriria o contrário (Design §20.4).
  revalidatePath("/investimentos");
  return { success: true };
}

/**
 * Liquida uma posição. No M29 toda liquidação é total, então o evento nasce
 * com `valorRemanescente: 0` — o campo existe porque o resgate parcial (M33)
 * precisa dele, e liquidação total é o caso em que ele é zero.
 *
 * O valor é o **recebido**, informado pelo usuário: é um fato lido do extrato,
 * já líquido de IR e IOF, que na renda fixa são retidos na fonte. A partir do
 * M30 o campo vem pré-preenchido pelo cálculo, e segue editável.
 */
export async function liquidarAtivo(id, { data, valor }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  const ativo = await db.ativo.findUnique({ where: { id }, include: { liquidacoes: true } });
  if (!ativo) return { error: "Posição não encontrada." };

  // Encerrada é a que teve um evento zerando o remanescente — não a vencida.
  const encerrada = ativo.liquidacoes.some((l) => Number(l.valorRemanescente) === 0);
  if (encerrada) return { error: "Esta posição já foi liquidada." };

  const quando = paraDataLocal(data);
  if (!quando) return { error: "Data da liquidação inválida." };
  if (quando < ativo.dataAquisicao) {
    return { error: "A liquidação não pode ser anterior à aquisição." };
  }

  const recebido = numeroPositivo(valor);
  if (recebido === null) return { error: "Valor recebido deve ser maior que zero." };

  await db.liquidacaoAtivo.create({
    data: { ativoId: id, data: quando, valorRecebido: recebido, valorRemanescente: 0 },
  });

  revalidatePath("/investimentos");
  return { success: true };
}
