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
import { formatarDataCurta, formatarMesReferencia } from "@/lib/datas";
import { TIPO_LABELS, CATEGORIA_LABELS } from "@/lib/categorias";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function paraISO(data) {
  const d = new Date(data);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const COLUNAS_BASE = [
  { id: "conta", header: "Conta", accessorFn: (row) => row.conta?.nome ?? "—" },
  { id: "tipo", header: "Tipo", accessorFn: (row) => TIPO_LABELS[row.tipo] ?? row.tipo },
  { id: "descricao", header: "Descrição", accessorFn: (row) => row.descricao },
  { id: "valor", header: "Valor", accessorFn: (row) => formatarReais(row.valor) },
  {
    id: "categoria",
    header: "Categoria",
    accessorFn: (row) => CATEGORIA_LABELS[row.categoria] ?? row.categoria,
  },
  {
    id: "dataCompra",
    header: "Data da compra",
    accessorFn: (row) => formatarDataCurta(row.dataCompra),
  },
  {
    id: "dataEfetiva",
    header: "Data efetiva",
    accessorFn: (row) => formatarDataCurta(row.dataEfetiva),
  },
  {
    id: "mesReferencia",
    header: "Mês de referência",
    accessorFn: (row) => formatarMesReferencia(row.mesReferencia, row.anoReferencia),
  },
  {
    id: "parcela",
    header: "Parcela",
    accessorFn: (row) => (row.numeroParcela ? `${row.numeroParcela} de ${row.totalParcelas}` : "—"),
  },
  {
    id: "ehInvestimento",
    header: "É investimento",
    accessorFn: (row) => (row.ehInvestimento ? "Sim" : "Não"),
  },
  {
    id: "contaInvestimento",
    header: "Conta de investimento",
    accessorFn: (row) => row.contaInvestimento?.nome ?? "—",
  },
].map((coluna) => ({ ...coluna, cell: (info) => info.getValue() }));

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
            {contasParaSelecao.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
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

function EditarTransacaoConteudo({ transacao, contas, onSalvo, onCancelar }) {
  const ehParcela = transacao.parcelamentoId !== null;

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

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const dados = ehParcela
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
      propagarParaRestantes: ehParcela ? form.propagarParaRestantes : false,
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

      {!ehParcela && <CamposCompletos form={form} setForm={setForm} contas={contas} />}

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

      {ehParcela && transacao.numeroParcela < transacao.totalParcelas && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-propagar"
            checked={form.propagarParaRestantes}
            onCheckedChange={(v) => setForm({ ...form, propagarParaRestantes: v })}
          />
          <Label htmlFor="edit-propagar">Aplicar às parcelas restantes desta compra</Label>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditarTransacaoDialog({ transacao, contas, open, onOpenChange, onSalvo }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
        </DialogHeader>
        {transacao && (
          <EditarTransacaoConteudo
            key={transacao.id}
            transacao={transacao}
            contas={contas}
            onSalvo={onSalvo}
            onCancelar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApagarTransacaoDialog({ transacao, open, onOpenChange, onApagado }) {
  const ehParcela = transacao?.parcelamentoId != null;

  async function apagar(propagarParaRestantes) {
    const resultado = await apagarTransacao(transacao.id, { propagarParaRestantes });
    if (resultado?.error) {
      window.alert(resultado.error);
      return;
    }
    onApagado();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar transação</AlertDialogTitle>
          <AlertDialogDescription>
            {ehParcela
              ? `Esta é a parcela ${transacao.numeroParcela} de ${transacao.totalParcelas}. Apagar só esta parcela, ou também as parcelas restantes desta compra?`
              : "Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {ehParcela && (
            <AlertDialogAction onClick={() => apagar(true)}>
              Apagar esta e as restantes
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={() => apagar(false)}>
            {ehParcela ? "Apagar só esta" : "Apagar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TransacoesClient({ transacoes, contas }) {
  const router = useRouter();
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [transacaoApagando, setTransacaoApagando] = useState(null);

  const columns = useMemo(
    () => [
      ...COLUNAS_BASE,
      {
        id: "acoes",
        header: "Ações",
        enableColumnFilter: false,
        cell: (info) => {
          const t = info.row.original;
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setTransacaoEditando(t)}>
                Editar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setTransacaoApagando(t)}>
                Apagar
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

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
    setTransacaoEditando(null);
    setTransacaoApagando(null);
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
                <TableRow key={row.id}>
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

      <EditarTransacaoDialog
        transacao={transacaoEditando}
        contas={contas}
        open={!!transacaoEditando}
        onOpenChange={(open) => !open && setTransacaoEditando(null)}
        onSalvo={aposMudanca}
      />

      <ApagarTransacaoDialog
        transacao={transacaoApagando}
        open={!!transacaoApagando}
        onOpenChange={(open) => !open && setTransacaoApagando(null)}
        onApagado={aposMudanca}
      />
    </div>
  );
}
