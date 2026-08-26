"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ehFutura, paraDataLocal } from "@/lib/datas";
import { saldoEmConta } from "@/lib/investimentos";
import { INDEXADORES_POR_ESTRATEGIA, MOTIVOS_POR_NATUREZA } from "@/lib/ativos";

// Investimento é registro do que aconteceu, não agendamento (Requisitos
// §3.13.5). A mensagem é uma só nas cinco operações: o motivo é o mesmo, e
// repetir a redação abriria espaço para elas divergirem.
const ERRO_DATA_FUTURA = "A data não pode ser futura — investimento se registra depois que acontece.";

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
  if (ehFutura(aquisicao)) return { erro: ERRO_DATA_FUTURA };
  // O vencimento NÃO passa por ehFutura: é a data em que o título vence, e
  // precisa ser futura. A checagem dele é a de estar depois da aquisição.

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

export async function registrarAtivo(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  const { erro, valores } = await validar(dados);
  if (erro) return { error: erro };

  await db.ativo.create({ data: { ...valores, usuarioId: session.user.id } });

  // Só /investimentos: registrar um ativo não cria transação nenhuma, e
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
  if (ehFutura(quando)) return { error: ERRO_DATA_FUTURA };
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

/**
 * Registra um movimento avulso do caixa da corretora — cupom, taxa de
 * custódia, corretagem ou ajuste (Requisitos §3.13.3).
 *
 * Não é transação: não aparece em /transacoes e não afeta Entradas, Saídas nem
 * o Disponível de mês nenhum. O que separa os dois casos é a pergunta "isso
 * muda quanto a família pode gastar neste mês?" — aqui, não.
 */
export async function registrarMovimento({ contaId, natureza, motivo, data, valor, descricao }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  if (!contaId) return { error: "Selecione a conta de investimento." };

  const conta = await db.conta.findUnique({ where: { id: contaId } });
  if (!conta || conta.tipo !== "CONTA_INVESTIMENTO") {
    return { error: "A conta escolhida não é uma conta de investimento." };
  }

  if (!MOTIVOS_POR_NATUREZA[natureza]) return { error: "Natureza inválida." };
  if (!MOTIVOS_POR_NATUREZA[natureza].includes(motivo)) {
    return { error: "Esse motivo não existe nessa natureza." };
  }

  const quando = paraDataLocal(data);
  if (!quando) return { error: "Data inválida." };
  if (ehFutura(quando)) return { error: ERRO_DATA_FUTURA };

  const montante = numeroPositivo(valor);
  if (montante === null) return { error: "Valor deve ser maior que zero." };

  // Débito não pode passar do que existe parado — mesma trava do registro, e
  // pelo mesmo motivo: o saldo é derivado, não há constraint que o expresse.
  if (natureza === "DEBITO") {
    const disponivel = await saldoParadoDe(contaId);
    if (montante > disponivel) {
      return {
        error: `Saldo insuficiente em ${conta.nome}: disponível ${disponivel.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}.`,
      };
    }
  }

  await db.movimentoInvestimento.create({
    data: {
      usuarioId: session.user.id,
      contaId,
      natureza,
      motivo,
      data: quando,
      valor: montante,
      descricao: descricao?.trim() || null,
    },
  });

  revalidatePath("/investimentos");
  return { success: true };
}

/**
 * Aporte e resgate são as **únicas** operações deste arquivo que gravam
 * `Transacao` — e as únicas que revalidam além de `/investimentos`.
 *
 * A exceção é o ponto do M34 (Requisitos §3.14.1): as duas cruzam a fronteira
 * com a conta corrente e mudam quanto a família pode gastar no mês, então são
 * transação. Compra, liquidação e movimento avulso não são, e por isso
 * revalidam só a própria tela (Design §20.4). Não unifique.
 */
async function validarMovimentacao({ contaInvestimentoId, contaCorrenteId, valor, data }) {
  if (!contaInvestimentoId) return { erro: "Selecione a conta de investimento." };
  if (!contaCorrenteId) return { erro: "Selecione a conta corrente." };

  const [investimento, corrente] = await Promise.all([
    db.conta.findUnique({ where: { id: contaInvestimentoId } }),
    db.conta.findUnique({ where: { id: contaCorrenteId } }),
  ]);

  if (!investimento || investimento.tipo !== "CONTA_INVESTIMENTO") {
    return { erro: "A conta escolhida não é uma conta de investimento." };
  }
  if (!corrente || corrente.tipo !== "CONTA_CORRENTE") {
    return { erro: "A origem/destino precisa ser uma conta corrente." };
  }

  const quando = paraDataLocal(data);
  if (!quando) return { erro: "Data inválida." };
  if (ehFutura(quando)) return { erro: ERRO_DATA_FUTURA };

  const montante = numeroPositivo(valor);
  if (montante === null) return { erro: "Valor deve ser maior que zero." };

  return { valores: { investimento, corrente, quando, montante } };
}

/**
 * Grava a transação de aporte ou resgate. `categoriaId` fica nulo — aporte não
 * é despesa de consumo nem resgate é receita (Requisitos §3.14.2); a coluna
 * virou opcional na Task 116 exatamente para isto.
 *
 * `mesReferencia`/`anoReferencia` saem da própria data: conta corrente não
 * passa por cálculo de fatura, então não há caminho especial aqui.
 */
async function gravarMovimentacao({ usuarioId, tipo, corrente, investimento, quando, montante, descricao }) {
  await db.transacao.create({
    data: {
      usuarioId,
      tipo,
      valor: montante,
      descricao,
      categoriaId: null,
      contaId: corrente.id,
      dataCompra: quando,
      dataEfetiva: quando,
      mesReferencia: quando.getMonth() + 1,
      anoReferencia: quando.getFullYear(),
      ehInvestimento: true,
      contaInvestimentoId: investimento.id,
    },
  });

  // As três, ao contrário de todo o resto do arquivo: a linha nova aparece em
  // /transacoes e entra no Disponível da Visão mensal.
  revalidatePath("/investimentos");
  revalidatePath("/visao-mensal");
  revalidatePath("/transacoes");
}

export async function aportar(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  const { erro, valores } = await validarMovimentacao(dados);
  if (erro) return { error: erro };

  const { investimento, corrente, quando, montante } = valores;

  await gravarMovimentacao({
    usuarioId: session.user.id,
    tipo: "SAIDA",
    corrente,
    investimento,
    quando,
    montante,
    descricao: dados.descricao?.trim() || `Aporte em ${investimento.nome}`,
  });

  return { success: true };
}

export async function resgatar(dados) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado." };

  const { erro, valores } = await validarMovimentacao(dados);
  if (erro) return { error: erro };

  const { investimento, corrente, quando, montante } = valores;

  // Não dá para resgatar mais do que está parado: o que está aplicado precisa
  // ser liquidado antes de virar caixa. Mesma trava do débito avulso.
  const disponivel = await saldoParadoDe(investimento.id);
  if (montante > disponivel) {
    return {
      error: `Saldo insuficiente em ${investimento.nome}: disponível ${disponivel.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}. Liquide uma posição antes de resgatar.`,
    };
  }

  await gravarMovimentacao({
    usuarioId: session.user.id,
    tipo: "ENTRADA",
    corrente,
    investimento,
    quando,
    montante,
    descricao: dados.descricao?.trim() || `Resgate de ${investimento.nome}`,
  });

  return { success: true };
}
