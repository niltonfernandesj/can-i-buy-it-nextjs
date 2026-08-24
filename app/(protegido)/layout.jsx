import { NavegacaoPrincipal } from "@/components/navegacao/navegacao-principal";
import { AbasDados } from "@/components/navegacao/abas-dados";

export default function ProtegidoLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <NavegacaoPrincipal />
      {/* As barras fixas crescem com os insets do sistema; este espaçamento
          precisa crescer junto, senão o conteúdo passa por baixo delas. */}
      <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] md:pb-0 md:pl-56 md:pt-0">
        <AbasDados />
        {children}
      </div>
    </div>
  );
}
