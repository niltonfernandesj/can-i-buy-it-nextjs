// Rota de metadados do Next 14: serve /manifest.webmanifest (Design §19.2).
//
// Atenção: este caminho precisa estar liberado no matcher do middleware.js —
// protegido, o navegador receberia um redirecionamento para /login com corpo
// HTML no lugar do JSON, e a instalação falharia sem mensagem alguma.
export default function manifest() {
  return {
    name: "Pode Comprá?",
    // O iOS corta o rótulo sob o ícone por volta de 12 caracteres; a forma
    // abreviada tem 10 e cabe inteira, com a interrogação (spec-01 §4).
    short_name: "Pó Comprá?",
    description: "Controle de finanças da família",
    start_url: "/visao-mensal",
    display: "standalone",
    background_color: "#131316", // --background
    theme_color: "#131316",
    lang: "pt-BR",
    // O iPhone ignora esta lista e usa o apple-touch-icon declarado no layout
    // (Design §19.1); ela existe para o padrão e para os demais navegadores.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
