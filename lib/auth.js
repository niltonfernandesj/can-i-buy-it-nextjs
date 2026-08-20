import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Limitação de taxa no login (spec-02 §17.3) — contador em memória do processo,
// não em banco. Reinicia se a função da Vercel reiniciar, o que reduz a
// proteção mas não a anula (o custo do bcrypt permanece).
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const tentativasPorEmail = new Map();

function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

function estaBloqueado(email) {
  const registro = tentativasPorEmail.get(email);
  if (!registro) return false;

  if (Date.now() - registro.primeiraFalhaEm > JANELA_BLOQUEIO_MS) {
    tentativasPorEmail.delete(email);
    return false;
  }

  return registro.contagem >= MAX_TENTATIVAS;
}

function registrarFalha(email) {
  const agora = Date.now();
  const registro = tentativasPorEmail.get(email);

  if (!registro || agora - registro.primeiraFalhaEm > JANELA_BLOQUEIO_MS) {
    tentativasPorEmail.set(email, { contagem: 1, primeiraFalhaEm: agora });
    return;
  }

  registro.contagem += 1;
}

function limparTentativas(email) {
  tentativasPorEmail.delete(email);
}

export const authOptions = {
  session: {
    strategy: "jwt",
    // Explícito em vez de herdar o padrão de 30 dias do NextAuth (Design §17.5).
    // Sessões JWT não são revogáveis do lado do servidor — este valor é a única
    // forma de limitar quanto tempo um token vazado continua válido.
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizarEmail(credentials.email);

        // Bloqueia antes de tocar no banco/bcrypt — nem a existência do email
        // nem a senha são verificadas enquanto a janela estiver ativa. O erro
        // devolvido ao usuário é o mesmo de "senha incorreta" (ver login/page.jsx),
        // então o bloqueio não confirma a existência da conta.
        if (estaBloqueado(email)) {
          return null;
        }

        const usuario = await db.usuario.findUnique({
          where: { email: credentials.email },
        });

        if (!usuario) {
          registrarFalha(email);
          return null;
        }

        const senhaValida = await bcrypt.compare(
          credentials.password,
          usuario.senhaHash
        );

        if (!senhaValida) {
          registrarFalha(email);
          return null;
        }

        limparTentativas(email);

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          ehAdmin: usuario.ehAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.ehAdmin = user.ehAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.ehAdmin = token.ehAdmin;
      }
      return session;
    },
  },
};
