"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MESES } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function useNavegacaoPeriodo(mes, ano) {
  const router = useRouter();

  function irPara(novoMes, novoAno) {
    router.push(`/visao-geral?mes=${novoMes}&ano=${novoAno}`);
  }

  function mesAnterior() {
    if (mes === 1) irPara(12, ano - 1);
    else irPara(mes - 1, ano);
  }

  function mesSeguinte() {
    if (mes === 12) irPara(1, ano + 1);
    else irPara(mes + 1, ano);
  }

  return { irPara, mesAnterior, mesSeguinte };
}

function GradeMeses({ mes, ano, anoGrade, onMudarAno, onSelecionarMes }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMudarAno(anoGrade - 1)} aria-label="Ano anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{anoGrade}</span>
        <Button variant="ghost" size="icon" onClick={() => onMudarAno(anoGrade + 1)} aria-label="Próximo ano">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MESES.map((nome, i) => {
          const numeroMes = i + 1;
          const selecionado = numeroMes === mes && anoGrade === ano;
          return (
            <button
              key={nome}
              type="button"
              onClick={() => onSelecionarMes(numeroMes)}
              className={cn(
                "rounded-md px-2 py-2 text-sm",
                selecionado
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {nome.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SeletorPeriodo({ mes, ano }) {
  const { irPara, mesAnterior, mesSeguinte } = useNavegacaoPeriodo(mes, ano);
  const [anoGradeDesktop, setAnoGradeDesktop] = useState(ano);
  const [anoGradeMobile, setAnoGradeMobile] = useState(ano);
  const [abertoDesktop, setAbertoDesktop] = useState(false);
  const [abertoMobile, setAbertoMobile] = useState(false);

  const rotulo = `${MESES[mes - 1]} ${ano}`;

  const classeSeta =
    "flex h-10 w-10 items-center justify-center rounded-full border bg-background text-foreground shadow-sm hover:bg-muted";
  const classePill =
    "items-center gap-2 rounded-full bg-periodo px-4 py-2 text-sm font-semibold text-periodo-foreground shadow-sm hover:bg-periodo/90";

  return (
    <div className="flex items-center gap-3">
      <button type="button" className={classeSeta} onClick={mesAnterior} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Popover
        open={abertoDesktop}
        onOpenChange={(open) => {
          setAbertoDesktop(open);
          if (open) setAnoGradeDesktop(ano);
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" className={cn("hidden md:inline-flex", classePill)}>
            <Calendar className="h-4 w-4" />
            {rotulo}
            <ChevronDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <GradeMeses
            mes={mes}
            ano={ano}
            anoGrade={anoGradeDesktop}
            onMudarAno={setAnoGradeDesktop}
            onSelecionarMes={(novoMes) => {
              irPara(novoMes, anoGradeDesktop);
              setAbertoDesktop(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Sheet
        open={abertoMobile}
        onOpenChange={(open) => {
          setAbertoMobile(open);
          if (open) setAnoGradeMobile(ano);
        }}
      >
        <SheetTrigger asChild>
          <button type="button" className={cn("inline-flex md:hidden", classePill)}>
            <Calendar className="h-4 w-4" />
            {rotulo}
            <ChevronDown className="h-4 w-4" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Selecionar período</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <GradeMeses
              mes={mes}
              ano={ano}
              anoGrade={anoGradeMobile}
              onMudarAno={setAnoGradeMobile}
              onSelecionarMes={(novoMes) => {
                irPara(novoMes, anoGradeMobile);
                setAbertoMobile(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <button type="button" className={classeSeta} onClick={mesSeguinte} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
