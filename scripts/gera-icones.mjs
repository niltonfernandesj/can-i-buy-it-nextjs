// Gera os ícones do PWA a partir de scripts/icone-fonte.png (Design §19.2).
//
// A arte-fonte fica em scripts/, NÃO em public/: tudo em public/ é empacotado
// no deploy e servido: 1MB de insumo de geração viajaria a cada build sem ter
// serventia alguma em runtime.
//
// Rodar da raiz do projeto, com o Playwright instalado de forma efêmera:
//   npm install playwright --no-save && node scripts/gera-icones.mjs
//
// O que faz, e por quê:
//   1. Troca o fundo quase preto do original pelo #1B1B1F dos cards do app —
//      medido uniforme (variação de 1-2 níveis), então a substituição é segura.
//      A faixa de transição evita halo no antisserrilhado do contorno.
//   2. Recorta centrado NO CONTEÚDO, não na imagem: as cédulas puxam o eixo
//      para a esquerda, e centralizar pela imagem deixaria o personagem torto.
//      Alvo de 80% de ocupação, contra os 70,7% do original — presença
//      equivalente à dos ícones nativos vizinhos.
//   3. Reduz por halving sucessivo; reduzir 1108 -> 180 num passo só serrilha
//      a linha do contorno.
//   4. Força alfa 255 em todo pixel: o iOS pinta branco sob qualquer
//      transparência, o que num ícone escuro criaria moldura branca.

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const b64 = readFileSync("scripts/icone-fonte.png").toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage();

const resultado = await page.evaluate(async (s) => {
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = "data:image/png;base64," + s; });

  const W = img.width, H = img.height;
  const base = document.createElement("canvas");
  base.width = W; base.height = H;
  const bctx = base.getContext("2d");
  bctx.drawImage(img, 0, 0);
  const dados = bctx.getImageData(0, 0, W, H);
  const d = dados.data;

  // Fundo de origem: média dos quatro cantos (medido uniforme, variação de 1-2).
  const cantos = [[4,4],[W-5,4],[4,H-5],[W-5,H-5]].map(([x,y]) => {
    const i = (y*W+x)*4; return [d[i], d[i+1], d[i+2]];
  });
  const velho = [0,1,2].map(k => Math.round(cantos.reduce((a,c) => a + c[k], 0) / 4));
  const novo = [0x1B, 0x1B, 0x1F]; // #1B1B1F, cor dos cards do app

  // Substituição com faixa de transição: pixel claramente de fundo vira a cor
  // nova; pixel claramente do desenho fica intacto; no meio (antisserrilhado
  // da borda do contorno) mistura proporcionalmente, para não criar halo.
  const DENTRO = 10, FORA = 24;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.max(
      Math.abs(d[i] - velho[0]),
      Math.abs(d[i+1] - velho[1]),
      Math.abs(d[i+2] - velho[2])
    );
    if (dist <= DENTRO) {
      d[i] = novo[0]; d[i+1] = novo[1]; d[i+2] = novo[2];
    } else if (dist < FORA) {
      const t = (dist - DENTRO) / (FORA - DENTRO); // 0 = fundo, 1 = desenho
      d[i]   = Math.round(novo[0] * (1-t) + d[i]   * t);
      d[i+1] = Math.round(novo[1] * (1-t) + d[i+1] * t);
      d[i+2] = Math.round(novo[2] * (1-t) + d[i+2] * t);
    }
    d[i+3] = 255; // opaco por garantia: iOS pinta branco sob qualquer alfa
  }
  bctx.putImageData(dados, 0, 0);

  // Bbox do conteúdo, recalculada sobre o fundo novo.
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y*W+x)*4;
      if (Math.abs(d[i]-novo[0]) > 18 || Math.abs(d[i+1]-novo[1]) > 18 || Math.abs(d[i+2]-novo[2]) > 18) {
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
      }
    }
  }

  // Recorte quadrado centrado NO CONTEÚDO (não na imagem: as cédulas puxam o
  // eixo para a esquerda). Alvo: conteúdo ocupando ~80% do lado, contra os
  // 70,7% originais — presença equivalente à dos ícones nativos vizinhos.
  const larguraConteudo = Math.max(maxX-minX, maxY-minY);
  const lado = Math.round(larguraConteudo / 0.80);
  const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  let x0 = Math.round(cx - lado/2), y0 = Math.round(cy - lado/2);
  // Se o recorte sair da imagem, traz de volta pra dentro.
  x0 = Math.max(0, Math.min(x0, W - lado));
  y0 = Math.max(0, Math.min(y0, H - lado));

  const cortado = document.createElement("canvas");
  cortado.width = lado; cortado.height = lado;
  const cctx = cortado.getContext("2d");
  cctx.fillStyle = `rgb(${novo[0]},${novo[1]},${novo[2]})`;
  cctx.fillRect(0, 0, lado, lado);
  cctx.drawImage(base, x0, y0, lado, lado, 0, 0, lado, lado);

  // Redução progressiva pela metade: reduzir 1108 -> 180 num passo só
  // serrilha o contorno; halving sucessivo preserva a linha.
  function reduzir(origem, alvo) {
    let atual = origem;
    while (atual.width / 2 > alvo) {
      const meio = document.createElement("canvas");
      meio.width = Math.round(atual.width/2); meio.height = Math.round(atual.height/2);
      const mctx = meio.getContext("2d");
      mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = "high";
      mctx.drawImage(atual, 0, 0, meio.width, meio.height);
      atual = meio;
    }
    const fim = document.createElement("canvas");
    fim.width = alvo; fim.height = alvo;
    const fctx = fim.getContext("2d");
    fctx.imageSmoothingEnabled = true; fctx.imageSmoothingQuality = "high";
    fctx.drawImage(atual, 0, 0, alvo, alvo);
    return fim.toDataURL("image/png");
  }

  return {
    velho, novo,
    bbox: { minX, minY, maxX, maxY },
    recorte: { x0, y0, lado },
    ocupacaoAntes: (Math.max(maxX-minX, maxY-minY) / W * 100).toFixed(1),
    ocupacaoDepois: (larguraConteudo / lado * 100).toFixed(1),
    png180: reduzir(cortado, 180),
    png192: reduzir(cortado, 192),
    png512: reduzir(cortado, 512),
  };
}, b64);

mkdirSync("public", { recursive: true });
const salvar = (nome, dataUrl) => {
  writeFileSync(`public/${nome}`, Buffer.from(dataUrl.split(",")[1], "base64"));
};
salvar("apple-touch-icon.png", resultado.png180);
salvar("icon-192.png", resultado.png192);
salvar("icon-512.png", resultado.png512);

console.log("fundo trocado:", `rgb(${resultado.velho})`, "->", `rgb(${resultado.novo})`);
console.log("recorte:", JSON.stringify(resultado.recorte));
console.log(`ocupação do conteúdo: ${resultado.ocupacaoAntes}% -> ${resultado.ocupacaoDepois}%`);
console.log("gerados: public/apple-touch-icon.png (180), icon-192.png, icon-512.png");

await browser.close();
