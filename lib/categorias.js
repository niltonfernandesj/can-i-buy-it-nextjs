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

// Escrita dupla da Task 92 (Design §18.2): a coluna `categoria` (enum) é
// NOT NULL e continua existindo até a Task 94, então toda gravação precisa
// preencher as duas — assim um rollback desta task não encontra linha
// quebrada. A correspondência é por nome; categoria criada pelo usuário (ou
// renomeada) não tem equivalente no enum e cai em OUTROS. É perda tolerada:
// a fonte da verdade já é `categoriaId`, e a coluna antiga morre na Task 94.
const ENUM_LEGADO_POR_NOME = {
  Mercado: "MERCADO",
  Lazer: "LAZER",
  "Saúde": "SAUDE",
  Transporte: "TRANSPORTE",
  Moradia: "MORADIA",
  "Salário": "SALARIO",
  Outros: "OUTROS",
};

export function enumLegadoDaCategoria(nome) {
  return ENUM_LEGADO_POR_NOME[nome] ?? "OUTROS";
}
