import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Pode Comprá?",
  description: "App de finanças pessoais (familiar)",
  // O iPhone ignora os `icons` do manifest para a tela inicial e usa só o
  // apple-touch-icon (Design §19.1). Sem esta linha o ícone sai em branco
  // ou como um recorte da página.
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Pó Comprá?",
    // "black", não "black-translucent": o translúcido faz o conteúdo passar
    // por baixo da barra de status, o que só é seguro depois do tratamento de
    // área segura da Task 96 (Design §19.2 e §19.4).
    statusBarStyle: "black",
  },
};

export const viewport = {
  themeColor: "#131316",
  // Sem viewport-fit=cover, env(safe-area-inset-*) devolve zero e o
  // tratamento de área segura abaixo não teria efeito algum (Design §19.4).
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
