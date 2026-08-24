export const TIPO_LABELS = { SAIDA: "Saída", ENTRADA: "Entrada" };

// Paleta fixa de cores de categoria (Design §18.4). O banco grava o `slug`;
// os tokens correspondentes vivem em globals.css e tailwind.config.js.
export const PALETA_CATEGORIAS = [
  { slug: "verde", rotulo: "Verde" },
  { slug: "azul", rotulo: "Azul" },
  { slug: "ambar", rotulo: "Âmbar" },
  { slug: "rosa", rotulo: "Rosa" },
  { slug: "roxo", rotulo: "Roxo" },
  { slug: "ciano", rotulo: "Ciano" },
  { slug: "laranja", rotulo: "Laranja" },
  { slug: "lima", rotulo: "Lima" },
  { slug: "indigo", rotulo: "Índigo" },
  { slug: "cinza", rotulo: "Cinza" },
];

export const CORES_CATEGORIA_VALIDAS = PALETA_CATEGORIAS.map((c) => c.slug);

// Mapa explícito, não `bg-categoria-${slug}`: o JIT do Tailwind só gera a
// classe se encontrar a string literal no código-fonte — nome montado em
// tempo de execução é descartado na build e o marcador sairia sem cor.
export const CLASSE_COR_CATEGORIA = {
  verde: "bg-categoria-verde",
  azul: "bg-categoria-azul",
  ambar: "bg-categoria-ambar",
  rosa: "bg-categoria-rosa",
  roxo: "bg-categoria-roxo",
  ciano: "bg-categoria-ciano",
  laranja: "bg-categoria-laranja",
  lima: "bg-categoria-lima",
  indigo: "bg-categoria-indigo",
  cinza: "bg-categoria-cinza",
};

// Fallback pra cor inválida ou ausente — nunca deixa o marcador invisível.
export const COR_CATEGORIA_PADRAO = "cinza";

export const CATEGORIA_LABELS = {
  MERCADO: "Mercado",
  LAZER: "Lazer",
  SAUDE: "Saúde",
  TRANSPORTE: "Transporte",
  MORADIA: "Moradia",
  SALARIO: "Salário",
  OUTROS: "Outros",
};
