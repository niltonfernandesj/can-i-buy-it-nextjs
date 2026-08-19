"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { editarTransacao, apagarTransacao } from "@/lib/actions/transacoes";
import { formatarReais } from "@/lib/moeda";
import { formatarDataCurta } from "@/lib/datas";
import { TIPO_LABELS, CATEGORIA_LABELS } from "@/lib/categorias";
import { TIPO_CONTA_LABELS, TIPO_CONTA_ICONES } from "@/lib/contas";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function paraISO(data) {
  const d = new Date(data);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function BadgeTransacao({ children }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

const COLUNAS_BASE = [
  {
    id: "dataCompra",
    header: "Data da compra",
    accessorFn: (row) => formatarDataCurta(row.dataCompra),
    cell: (info) => info.getValue(),
  },
  {
    id: "descricao",
    header: "Descrição",
    accessorFn: (row) => row.descricao,
    cell: (info) => {
      const t = info.row.original;
      return (
        <span className="flex items-center gap-2">
          <span className="truncate">{t.descricao}</span>
          {t.numeroParcela && (
            <BadgeTransacao>
              {t.numeroParcela} de {t.totalParcelas}
            </BadgeTransacao>
          )}
          {t.numeroOcorrencia && (
            <BadgeTransacao>
              {t.numeroOcorrencia} de {t.totalOcorrencias} ↻
            </BadgeTransacao>
          )}
          {t.ehInvestimento && <BadgeTransacao>{t.tipo === "SAIDA" ? "Aporte" : "Resgate"}</BadgeTransacao>}
        </span>
      );
    },
  },
  {
    id: "categoria",
    header: "Categoria",
    accessorFn: (row) => CATEGORIA_LABELS[row.categoria] ?? row.categoria,
    cell: (info) => info.getValue(),
  },
  {
    id: "conta",
    header: "Conta",
    accessorFn: (row) => row.conta?.nome ?? "—",
    cell: (info) => info.getValue(),
  },
  {
    id: "valor",
    header: "Valor",
    accessorFn: (row) => formatarReais(row.valor),
    cell: (info) => {
      const t = info.row.original;
      const ehEntrada = t.tipo === "ENTRADA";
      return (
        <span className={ehEntrada ? "text-emerald-600" : "text-foreground"}>
          {ehEntrada ? "+" : "-"} {formatarReais(t.valor)}
        </span>
      );
    },
  },
];

function CamposCompletos({ form, setForm, contas }) {
  const contasParaSelecao = contas.filter((c) => c.tipo !== "CONTA_INVESTIMENTO");
  const contasInvestimento = contas.filter((c) => c.tipo === "CONTA_INVESTIMENTO");
  const contaSelecionada = contas.find((c) => c.id === form.contaId);
  const ehContaCorrente = contaSelecionada?.tipo === "CONTA_CORRENTE";

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-tipo">Tipo</Label>
        <Select value={form.tipo} onValueChange={(tipo) => setForm({ ...form, tipo })}>
          <SelectTrigger id="edit-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIPO_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-conta">Conta</Label>
        <Select value={form.contaId} onValueChange={(contaId) => setForm({ ...form, contaId })}>
          <SelectTrigger id="edit-conta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contasParaSelecao.map((c) => {
              const IconeConta = TIPO_CONTA_ICONES[c.tipo];
              return (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <IconeConta className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {c.nome}
                    <span className="text-xs text-muted-foreground">
                      · {TIPO_CONTA_LABELS[c.tipo]}
                    </span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-data">Data</Label>
        <Input
          id="edit-data"
          type="date"
          required
          value={form.dataCompra}
          onChange={(e) => setForm({ ...form, dataCompra: e.target.value })}
        />
      </div>

      {ehContaCorrente && (
        <div className="flex flex-col gap-4 rounded-md border p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-ehInvestimento"
              checked={form.ehInvestimento}
              onCheckedChange={(v) => setForm({ ...form, ehInvestimento: v })}
            />
            <Label htmlFor="edit-ehInvestimento">É investimento</Label>
          </div>

          {form.ehInvestimento && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-contaInvestimentoId">Conta de investimento</Label>
              <Select
                value={form.contaInvestimentoId}
                onValueChange={(v) => setForm({ ...form, contaInvestimentoId: v })}
              >
                <SelectTrigger id="edit-contaInvestimentoId">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contasInvestimento.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ConfirmarExclusao({ transacao, ehParcela, ehRecorrencia, ehLinhaBloqueada, onVoltar, onApagado }) {
  const [carregando, setCarregando] = useState(false);

  async function apagar(propagarParaRestantes) {
    setCarregando(true);
    const resultado = await apagarTransacao(transacao.id, { propagarParaRestantes });
    setCarregando(false);

    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }
    onApagado();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {ehParcela &&
          `Esta é a parcela ${transacao.numeroParcela} de ${transacao.totalParcelas}. Apagar só esta parcela, ou também as parcelas restantes desta compra?`}
        {ehRecorrencia &&
          `Esta é a ocorrência ${transacao.numeroOcorrencia} de ${transacao.totalOcorrencias} de uma saída recorrente. Apagar só esta ocorrência, ou também as ocorrências restantes desta recorrência?`}
        {!ehLinhaBloqueada && "Esta ação não pode ser desfeita."}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onVoltar} disabled={carregando}>
          Voltar
        </Button>
        {ehLinhaBloqueada && (
          <Button variant="destructive" onClick={() => apagar(true)} disabled={carregando}>
            Apagar esta e as restantes
          </Button>
        )}
        <Button variant="destructive" onClick={() => apagar(false)} disabled={carregando}>
          {ehLinhaBloqueada ? "Apagar só esta" : "Apagar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DetalheTransacaoConteudo({ transacao, contas, onSalvo, onApagado }) {
  const ehParcela = transacao.parcelamentoId !== null;
  const ehRecorrencia = transacao.recorrenciaId !== null;
  const ehLinhaBloqueada = ehParcela || ehRecorrencia;
  const podePropagar = ehParcela
    ? transacao.numeroParcela < transacao.totalParcelas
    : ehRecorrencia
    ? transacao.numeroOcorrencia < transacao.totalOcorrencias
    : false;

  const [modo, setModo] = useState("detalhe"); // "detalhe" | "confirmarExclusao"
  const [form, setForm] = useState({
    tipo: transacao.tipo,
    contaId: transacao.contaId,
    valorCentavos: Math.round(transacao.valor * 100),
    categoria: transacao.categoria,
    descricao: transacao.descricao,
    dataCompra: paraISO(transacao.dataCompra),
    ehInvestimento: transacao.ehInvestimento,
    contaInvestimentoId: transacao.contaInvestimentoId ?? "",
    propagarParaRestantes: false,
  });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  if (modo === "confirmarExclusao") {
    return (
      <ConfirmarExclusao
        transacao={transacao}
        ehParcela={ehParcela}
        ehRecorrencia={ehRecorrencia}
        ehLinhaBloqueada={ehLinhaBloqueada}
        onVoltar={() => setModo("detalhe")}
        onApagado={onApagado}
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const dados = ehLinhaBloqueada
      ? { valor: form.valorCentavos / 100, descricao: form.descricao, categoria: form.categoria }
      : {
          tipo: form.tipo,
          valor: form.valorCentavos / 100,
          descricao: form.descricao,
          categoria: form.categoria,
          contaId: form.contaId,
          dataCompra: form.dataCompra,
          ehInvestimento: form.ehInvestimento,
          contaInvestimentoId: form.ehInvestimento ? form.contaInvestimentoId : undefined,
        };

    const resultado = await editarTransacao(transacao.id, dados, {
      propagarParaRestantes: ehLinhaBloqueada ? form.propagarParaRestantes : false,
    });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    onSalvo();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {ehParcela && (
        <p className="text-sm text-muted-foreground">
          Parcela {transacao.numeroParcela} de {transacao.totalParcelas} — conta, data e tipo não
          são editáveis numa parcela.
        </p>
      )}

      {ehRecorrencia && (
        <p className="text-sm text-muted-foreground">
          Ocorrência {transacao.numeroOcorrencia} de {transacao.totalOcorrencias} de uma saída
          recorrente — conta, data e tipo não são editáveis numa ocorrência.
        </p>
      )}

      {!ehLinhaBloqueada && <CamposCompletos form={form} setForm={setForm} contas={contas} />}

      <CampoValor
        id="edit-valor"
        label={ehParcela ? "Valor da parcela" : "Valor"}
        valorCentavos={form.valorCentavos}
        onChange={(valorCentavos) => setForm({ ...form, valorCentavos })}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-categoria">Categoria</Label>
        <Select
          value={form.categoria}
          onValueChange={(categoria) => setForm({ ...form, categoria })}
        >
          <SelectTrigger id="edit-categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORIA_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-descricao">Descrição</Label>
        <Input
          id="edit-descricao"
          required
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
      </div>

      {podePropagar && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-propagar"
            checked={form.propagarParaRestantes}
            onCheckedChange={(v) => setForm({ ...form, propagarParaRestantes: v })}
          />
          <Label htmlFor="edit-propagar">
            {ehParcela
              ? "Aplicar às parcelas restantes desta compra"
              : "Aplicar às ocorrências restantes desta recorrência"}
          </Label>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="destructive" onClick={() => setModo("confirmarExclusao")}>
          Apagar
        </Button>
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DetalheTransacaoDialog({ transacao, contas, open, onOpenChange, onFechar }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe da transação</DialogTitle>
        </DialogHeader>
        {transacao && (
          <DetalheTransacaoConteudo
            key={transacao.id}
            transacao={transacao}
            contas={contas}
            onSalvo={onFechar}
            onApagado={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TransacoesClient({ transacoes, contas }) {
  const router = useRouter();
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);

  const columns = useMemo(() => COLUNAS_BASE, []);

  const table = useReactTable({
    data: transacoes,
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  function aposMudanca() {
    setTransacaoSelecionada(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap align-top">
                    <div className="flex flex-col gap-1">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {header.column.getCanFilter() && (
                        <Input
                          className="h-7 w-32 text-xs"
                          value={header.column.getFilterValue() ?? ""}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          placeholder="Filtrar..."
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setTransacaoSelecionada(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} ·{" "}
          {table.getFilteredRowModel().rows.length} transações
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      </div>

      <DetalheTransacaoDialog
        transacao={transacaoSelecionada}
        contas={contas}
        open={!!transacaoSelecionada}
        onOpenChange={(open) => !open && setTransacaoSelecionada(null)}
        onFechar={aposMudanca}
      />
    </div>
  );
}
