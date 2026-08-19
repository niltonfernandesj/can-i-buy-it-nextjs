import { NavegacaoPrincipal } from "@/components/navegacao/navegacao-principal";

export default function ProtegidoLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <NavegacaoPrincipal />
      <div className="flex-1 pb-16 pt-14 md:pb-0 md:pt-0">{children}</div>
    </div>
  );
}
