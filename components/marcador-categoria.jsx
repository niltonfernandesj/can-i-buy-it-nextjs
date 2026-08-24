import { CLASSE_COR_CATEGORIA, COR_CATEGORIA_PADRAO } from "@/lib/categorias";
import { cn } from "@/lib/utils";

/**
 * Ponto colorido que identifica a categoria nas listagens (Design §18.4).
 *
 * Sempre renderizado ao lado do nome — cor nunca é a única portadora de
 * informação, mesmo princípio do §16.2 (sobrevive a daltonismo e impressão).
 * Por isso é aria-hidden: quem usa leitor de tela já recebe o nome.
 */
export function MarcadorCor({ cor, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        CLASSE_COR_CATEGORIA[cor] ?? CLASSE_COR_CATEGORIA[COR_CATEGORIA_PADRAO],
        className
      )}
    />
  );
}

/** Marcador + nome, o par usado em toda listagem que exibe categoria. */
export function CategoriaComCor({ categoria, className }) {
  if (!categoria) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <MarcadorCor cor={categoria.cor} />
      <span className="truncate">{categoria.nome}</span>
    </span>
  );
}
