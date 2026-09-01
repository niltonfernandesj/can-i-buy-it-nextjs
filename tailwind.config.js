/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ também precisa ser varrido: mapas de classe literal vivem aqui
    // (ex.: CLASSE_COR_CATEGORIA em lib/categorias.js). Sem esta linha o JIT
    // não encontra bg-categoria-* e os marcadores saem sem cor.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			},
  			entrada: 'var(--entrada)',
  			investimento: 'var(--investimento)',
  			'saida-debito': 'var(--saida-debito)',
  			'saida-credito': 'var(--saida-credito)',
  			// Tons translúcidos: o modificador /NN não funciona com tokens em
  			// hexadecimal (Task 139), então cada transparência é um token.
  			'vencido-fundo': 'var(--vencido-fundo)',
  			'vencido-borda': 'var(--vencido-borda)',
  			'vencido-selo': 'var(--vencido-selo)',
  			'superficie-sutil': 'var(--superficie-sutil)',
  			'controle-hover': 'var(--controle-hover)',
  			'vencido-hover': 'var(--vencido-hover)',
  			estimado: 'var(--estimado)',
  			// Régua do percentual do disponível (Design §14.4). O componente usa
  			// um mapa literal de classe, não `text-disponivel-${faixa}` — nome
  			// montado em runtime é descartado pelo JIT (mesma regra de §18.4).
  			disponivel: {
  				otimo: 'var(--disponivel-otimo)',
  				bom: 'var(--disponivel-bom)',
  				atencao: 'var(--disponivel-atencao)',
  				baixo: 'var(--disponivel-baixo)',
  				critico: 'var(--disponivel-critico)'
  			},
  			periodo: {
  				DEFAULT: 'var(--periodo-bg)',
  				foreground: 'var(--periodo-fg)'
  			},
  			// Paleta de categorias (Design §18.4). O slug gravado no banco é a
  			// chave aqui — ex.: cor 'verde' vira a classe bg-categoria-verde.
  			categoria: {
  				verde: 'var(--categoria-verde)',
  				azul: 'var(--categoria-azul)',
  				ambar: 'var(--categoria-ambar)',
  				rosa: 'var(--categoria-rosa)',
  				roxo: 'var(--categoria-roxo)',
  				ciano: 'var(--categoria-ciano)',
  				laranja: 'var(--categoria-laranja)',
  				lima: 'var(--categoria-lima)',
  				indigo: 'var(--categoria-indigo)',
  				cinza: 'var(--categoria-cinza)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
