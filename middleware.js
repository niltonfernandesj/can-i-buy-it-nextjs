import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/usuarios")) {
        return token.ehAdmin === true;
      }
      return true;
    },
  },
});

export const config = {
  // manifest.webmanifest, apple-touch-icon e icon-* precisam ficar de fora da
  // proteção (Design §19.3): protegidos, o navegador recebe um redirecionamento
  // para /login com corpo HTML no lugar do arquivo, e a instalação na tela
  // inicial falha **em silêncio**, sem erro visível. Liberar é seguro — são
  // arquivos estáticos, sem dado algum do usuário.
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-touch-icon|icon-).*)",
  ],
};
