"use client";

import { useState } from "react";
import { ChevronDown, MoreVertical, PiggyBank, TriangleAlert } from "lucide-react";
import { formatarReais } from "@/lib/moeda";
import { MESES, formatarDataCurta } from "@/lib/datas";
import { agruparPor, percentualNoPatrimonio } from "@/lib/investimentos";
import { ROTULO_ESTRATEGIA, ROTULO_PRODUTO, rotuloEncerramento, rotuloIndexador } from "@/lib/ativos";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiquidarAtivo } from "./liquidar-ativo";

const VISOES = [
  { valor: "estrategia", rotulo: "Por estratégia" },
  { valor: "mercado", rotulo: "Por mercado" },
];

const ROTULO_MERCADO = { RENDA_FIXA: "Renda fixa" };

// Alternância construída à mão, como em Saídas no crédito (Design §8.3.16) —
// sem puxar @radix-ui/react-tabs para uma escolha binária sempre visível.
function ToggleVisao({ visao, onMudar }) {
  return (
    <div className="flex gap-5 border-b" role="tablist">
      {VISOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          role="tab"
          aria-selected={visao === opcao.valor}
          onClick={() => onMudar(opcao.valor)}
          className={cn(
            "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
            visao === opcao.valor
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function Percentual({ valor }) {
  if (valor === null) return null;
  return (
    <span className="min-w-[3.1rem] text-sm font-semibold tabular-nums text-investimento">
      {valor.toFixed(1).replace(".", ",")}%
    </span>
  );
}

// Uma posição vencida é a que passou do vencimento e ainda não foi liquidada.
// Comparação por DIA, não por instante: um título que vence hoje só conta como
// vencido amanhã (Design §20.3).
function estaVencido(ativo, hoje) {
  const venc = new Date(ativo.vencimento);
  const soData = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return soData(venc) < soData(hoje);
}

/**
 * O valor bruto, com aviso quando o índice de alguma janela não foi obtido
 * (Requisitos §3.24.7, Design §31.7).
 *
 * **Marca ausência, não provisoriedade.** Um valor vindo da projeção da ANBIMA
 * é o dado certo para o mês aberto e não recebe aviso; o que recebe é a
 * posição que atravessou uma janela sem índice nenhum e, por isso, não rendeu
 * o que devia. Também não sinaliza o atraso normal do Banco Central, que é de
 * um dia e sempre existiu (§3.16.5).
 *
 * O ícone entra DENTRO do contêiner alinhado à direita. Isso NÃO impede a
 * coluna de alargar — a tabela tem layout automático e o `td` cresce com o
 * conteúdo (medido: 142,0px → 164,5px). O que garante é que a coluna alargue
 * INTEIRA, mantendo os `tabular-nums` das linhas alinhados entre si, que é a
 * propriedade que importa. Reservar espaço fixo custaria um vão permanente em
 * toda posição, por um aviso raro.
 */
function nomeDoMes(mes) {
  return MESES[Number(mes.slice(5, 7)) - 1].toLowerCase();
}

/** "Índice de agosto" / "Índices de julho e agosto". */
function frasePendente(meses) {
  const nomes = meses.map(nomeDoMes);
  if (nomes.length === 1) return `Índice de ${nomes[0]} não obtido`;
  const ultimo = nomes.at(-1);
  return `Índices de ${nomes.slice(0, -1).join(", ")} e ${ultimo} não obtidos`;
}

function Bruto({ ativo, tamanho = 14 }) {
  const valor = formatarReais(ativo.valor ?? ativo.base);
  const meses = ativo.semIndice ?? [];
  if (meses.length === 0) return valor;

  const aviso = `${frasePendente(meses)} — o valor pode estar desatualizado.`;

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <TriangleAlert
        size={tamanho}
        className="shrink-0 text-atencao"
        role="img"
        aria-label={aviso}
      >
        <title>{aviso}</title>
      </TriangleAlert>
      <span>{valor}</span>
    </span>
  );
}

/** Uma linha rótulo → valor dentro do cartão. Bruto e Líquido têm o mesmo
 *  peso: nenhum dos dois é mais importante que o outro (Requisitos §3.20.3). */
function LinhaDado({ rotulo, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

/**
 * O menu da posição. Nasce com um item só — liquidar é a única ação que existe
 * hoje (Requisitos §3.20.5). A estrutura fica pronta para editar e apagar.
 */
function MenuDaPosicao({ ativo, vencido }) {
  const [liquidar, setLiquidar] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Ações em ${ativo.emissor}`}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground hover:bg-controle-hover",
              vencido && "border-vencido-borda text-saida-credito",
            )}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setLiquidar(true)}>
            {rotuloEncerramento(vencido).acao}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LiquidarAtivo
        ativo={ativo}
        vencido={vencido}
        aberto={liquidar}
        onAbertoMudou={setLiquidar}
      />
    </>
  );
}

/** A posição no mobile: um cartão, com as mesmas informações das colunas. */
function CartaoPosicao({ ativo, hoje }) {
  const vencido = estaVencido(ativo, hoje);

  return (
    <div
      className={cn(
        "rounded-md border bg-superficie-sutil p-3",
        vencido && "border-vencido-borda bg-vencido-fundo",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[13.5px] font-semibold leading-tight">
            {ativo.emissor}
            {/* No cartão o estado é informação de cabeçalho, não detalhe de
                uma linha como era na tabela (Requisitos §3.20.4). */}
            {vencido && (
              <span className="ml-1.5 whitespace-nowrap rounded-full bg-vencido-selo px-1.5 py-0.5 text-[10px] font-bold text-saida-credito">
                Vencido
              </span>
            )}
          </span>
          <span className="block text-[11.5px] text-muted-foreground">
            {ROTULO_PRODUTO[ativo.produto]}
          </span>
        </div>
        <MenuDaPosicao ativo={ativo} vencido={vencido} />
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        <LinhaDado rotulo="Vencimento">
          <span className={cn(vencido && "font-semibold text-saida-credito")}>
            {formatarDataCurta(ativo.vencimento)}
          </span>
        </LinhaDado>
        <LinhaDado rotulo="Taxa">
          <span className="font-mono text-investimento">
            {rotuloIndexador(ativo.indexador, ativo.taxa)}
          </span>
        </LinhaDado>
        <LinhaDado rotulo="Bruto">
          <Bruto ativo={ativo} tamanho={13} />
        </LinhaDado>
        <LinhaDado rotulo="Líquido">
          {formatarReais(ativo.liquido ?? ativo.valor ?? ativo.base)}
        </LinhaDado>
      </div>
    </div>
  );
}

/**
 * A ação da posição no desktop: escondida até o cursor (ou o foco) chegar na
 * linha (Requisitos §3.21).
 *
 * A pista `⋯` fica sempre visível e some quando o botão aparece no lugar dela —
 * só mudar o fundo da linha diria "esta linha está sob o cursor", não que há
 * algo a fazer ali.
 *
 * **`group-focus-within` não é enfeite:** hover não existe no teclado, e sem
 * ele tabular pela tabela moveria o foco para um botão invisível.
 */
function AcaoDaLinha({ ativo, vencido }) {
  return (
    <td className="relative w-px py-2 pl-3">
      <span
        aria-hidden="true"
        className={cn(
          "select-none text-sm leading-none transition-opacity",
          "opacity-40 group-hover:opacity-0 group-focus-within:opacity-0",
          vencido ? "text-saida-credito opacity-90" : "text-muted-foreground",
        )}
      >
        ⋯
      </span>
      <span
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 pl-3 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <LiquidarAtivo ativo={ativo} vencido={vencido} />
      </span>
    </td>
  );
}

function TabelaPosicoes({ ativos, hoje }) {
  return (
    <>
      {/* Cartões no mobile. A escolha é por classe, nunca por medição em JS: o
          componente renderiza no servidor, onde não há largura de janela, e um
          useEffect causaria troca visível após a hidratação (Design §26.1). */}
      <div className="flex flex-col gap-2 sm:hidden">
        {ativos.map((ativo) => (
          <CartaoPosicao key={ativo.id} ativo={ativo} hoje={hoje} />
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 text-left font-medium">Produto</th>
            <th className="pb-2 text-left font-medium">Vencimento</th>
            <th className="pb-2 text-left font-medium">Taxa</th>
            <th className="pb-2 text-right font-medium">Bruto</th>
            <th className="pb-2 text-right font-medium">Líquido</th>
            {/* Sem cabeçalho e de largura mínima: existe sempre, para o botão
                revelado no hover nunca deslocar as colunas de valor. */}
            <th className="w-px pb-2" />
          </tr>
        </thead>
        <tbody>
          {ativos.map((ativo) => {
            const vencido = estaVencido(ativo, hoje);
            return (
              <tr
                key={ativo.id}
                className={cn("group border-t", vencido && "bg-vencido-fundo")}
              >
                <td className="py-2 pr-3">
                  <span className="font-medium">{ativo.emissor}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROTULO_PRODUTO[ativo.produto]}
                  </span>
                </td>
                <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">
                  <span
                    className={cn(
                      vencido && "font-semibold text-saida-credito",
                    )}
                  >
                    {formatarDataCurta(ativo.vencimento)}
                  </span>
                  {vencido && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-vencido-selo px-1.5 py-0.5 text-[11px] font-semibold text-saida-credito">
                      Vencido
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-investimento">
                  {rotuloIndexador(ativo.indexador, ativo.taxa)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                  {/* Corrigido quando o indexador rende; base nos demais. */}
                  <Bruto ativo={ativo} />
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatarReais(ativo.liquido ?? ativo.valor ?? ativo.base)}
                </td>
                <AcaoDaLinha ativo={ativo} vencido={vencido} />
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

/**
 * Card no desktop, título com divisor no mobile (Requisitos §3.20.2).
 *
 * Abaixo de `sm` a moldura some e sobra um divisor: com o cartão de cada
 * posição dentro, três caixas aninhadas em 358px de largura útil cansavam.
 */
const SECAO = "border-b sm:rounded-lg sm:border sm:bg-card sm:text-card-foreground sm:shadow sm:border-b";

/** Cabeçalho menor no mobile — com seis dígitos ele já encostava nas bordas. */
const CABECALHO = "text-[13.5px] sm:text-base";

function CardGrupo({ grupo, rotulo, patrimonio, hoje }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={SECAO}>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        aria-expanded={expandido}
        className="flex w-full items-center justify-between gap-4 px-1 py-3 text-left sm:p-4 sm:px-5"
      >
        <span className="flex min-w-0 items-baseline gap-2.5">
          <Percentual valor={percentualNoPatrimonio(grupo.total, patrimonio)} />
          {/* truncate fica: fonte menor adia o corte, não o elimina. */}
          <span className={cn("truncate font-semibold", CABECALHO)}>{rotulo}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className={cn("font-semibold tabular-nums", CABECALHO)}>
            {formatarReais(grupo.total)}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandido && "rotate-180",
            )}
          />
        </span>
      </button>

      {expandido && (
        <div className="flex flex-col gap-5 px-1 pb-5 sm:px-5">
          {grupo.contas.map((conta, i) => (
            <div
              key={conta.contaId}
              className={cn(i > 0 && "border-t border-dashed pt-4")}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PiggyBank className="h-[0.9rem] w-[0.9rem] shrink-0 text-investimento" />
                  {conta.nome}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatarReais(conta.total)}
                </span>
              </div>
              <TabelaPosicoes ativos={conta.ativos} hoje={hoje} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Exceção ao padrão: não é um <button> e não tem ChevronDown, porque não há
// posições dentro para abrir. A ausência do chevron é o que comunica isso, sem
// precisar de rótulo explicando (Design §20.3). É este card que faz os
// percentuais fecharem 100% do patrimônio.
function CardParado({ total, patrimonio }) {
  return (
    // Acompanha os grupos: sem isso seria o único card sobrando na lista do
    // mobile (Requisitos §3.20.2).
    <div className={cn(SECAO, "flex items-center justify-between gap-4 px-1 py-3 sm:p-4 sm:px-5")}>
      <span className="flex min-w-0 items-baseline gap-2.5">
        <Percentual valor={percentualNoPatrimonio(total, patrimonio)} />
        <span className={cn("truncate font-semibold text-muted-foreground", CABECALHO)}>
          Disponível em conta
        </span>
      </span>
      <span className={cn("font-semibold tabular-nums text-entrada", CABECALHO)}>
        {formatarReais(total)}
      </span>
    </div>
  );
}

export function DetalhamentoInvestimentos({ ativos, patrimonio, parado }) {
  const [visao, setVisao] = useState("estrategia");

  const grupos = agruparPor(ativos, visao);
  const rotulos = visao === "estrategia" ? ROTULO_ESTRATEGIA : ROTULO_MERCADO;
  const hoje = new Date();
  const vazio = grupos.length === 0 && parado <= 0;

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* "Carteira", e não "Ativos": a seção termina no CardParado, que não é
          ativo nenhum (Requisitos §3.13.4). Fica fora do estado vazio porque
          lá a própria mensagem já explica o bloco. */}
      {!vazio && (
        <h2 className="text-lg font-semibold tracking-wide">Carteira</h2>
      )}

      <ToggleVisao visao={visao} onMudar={setVisao} />

      {vazio ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhuma posição ainda. Registre um ativo para começar a acompanhar.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <CardGrupo
              key={grupo.chave}
              grupo={grupo}
              rotulo={rotulos[grupo.chave] ?? grupo.chave}
              patrimonio={patrimonio}
              hoje={hoje}
            />
          ))}
          {parado > 0 && <CardParado total={parado} patrimonio={patrimonio} />}
        </div>
      )}
    </div>
  );
}
