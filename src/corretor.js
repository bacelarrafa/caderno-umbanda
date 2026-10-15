// O "aprendizado" do corretor: cada correção que você confirma vira uma
// variante do termo no glossário e passa a ser aplicada sozinha nas próximas aulas.

export const semAcento = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function escapar(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Letras portuguesas contam como parte da palavra.
const L = "A-Za-zÀ-ÖØ-öø-ÿ";

function manterCaixa(original, novo) {
  if (original[0] && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return novo[0].toUpperCase() + novo.slice(1);
  }
  return novo;
}

export function substituir(texto, errado, certo) {
  const re = new RegExp(`(?<![${L}])${escapar(errado)}(?![${L}])`, "giu");
  let n = 0;
  const saida = texto.replace(re, (m) => { n++; return manterCaixa(m, certo); });
  return { texto: saida, n };
}

// Aplica todas as variantes conhecidas do glossário.
export function aplicarGlossario(texto, glossario) {
  let total = 0;
  const pares = [];
  for (const g of glossario) for (const v of g.variantes || []) pares.push([v, g.termo]);
  pares.sort((a, b) => b[0].length - a[0].length); // variantes longas primeiro
  for (const [v, t] of pares) {
    const r = substituir(texto, v, t);
    texto = r.texto;
    total += r.n;
  }
  return { texto, total };
}

export function distancia(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function semelhanca(a, b) {
  const x = semAcento(a), y = semAcento(b);
  return 1 - distancia(x, y) / Math.max(x.length, y.length);
}

// Palavras comuns que nunca devem virar sugestão.
const COMUNS = new Set(`
quando porque então sempre também aquele aquela aquilo pessoa pessoas tocar tocando
cantar cantando ponto pontos ainda depois antes trabalho entender questão dentro
gente coisa coisas forma momento vezes outra outro outras outros muito pouco
`.split(/\s+/).filter(Boolean));

// Terminações comuns de plural e conjugação: "atravessou" não é erro de "atravessar".
const FLEXOES = new Set(["ou", "ando", "endo", "indo", "ado", "ada", "ados", "adas", "am", "ei", "aram", "avam", "oes", "aes", "ar", "er", "ir", "ava", "aste", "da", "do", "das", "dos", "r", "ndo", "va"]);
function ehFlexao(palavra, termo) {
  for (let corte = 2; corte <= 4; corte++) {
    const raiz = termo.slice(0, -corte);
    if (raiz.length >= 5 && palavra.startsWith(raiz) && FLEXOES.has(palavra.slice(raiz.length))) return true;
  }
  return false;
}

// Procura palavras parecidas com termos do glossário (possíveis erros de transcrição).
export function sugerir(texto, glossario, ignorados = []) {
  const ign = new Set(ignorados.map(semAcento));
  const termos = glossario
    .map((g) => g.termo)
    .filter((t) => !t.includes(" ") && t.length >= 5);
  const conhecidos = new Set(glossario.flatMap((g) => [g.termo, ...(g.variantes || [])]).map(semAcento));
  for (const k of [...conhecidos]) { conhecidos.add(k + "s"); conhecidos.add(k + "es"); } // plurais
  const palavras = texto.match(new RegExp(`[${L}]{5,}`, "gu")) || [];
  const contagem = new Map();
  for (const p of palavras) {
    const k = semAcento(p);
    if (conhecidos.has(k) || ign.has(k) || COMUNS.has(k)) continue;
    contagem.set(k, { palavra: p, n: (contagem.get(k)?.n || 0) + 1 });
  }
  const sugestoes = [];
  for (const [k, { palavra, n }] of contagem) {
    const plural = k.endsWith("s");
    const base = plural ? k.slice(0, -1) : k;
    let melhor = null;
    for (const t of termos) {
      if (Math.abs(t.length - base.length) > 4) continue;
      if (ehFlexao(k, semAcento(t))) { melhor = null; break; }
      const s = semelhanca(base, t);
      if (s >= 0.75 && (!melhor || s > melhor.s)) melhor = { termo: plural ? t + "s" : t, s };
    }
    if (melhor) sugestoes.push({ errado: palavra, certo: melhor.termo, confianca: melhor.s, n });
  }
  return sugestoes.sort((a, b) => b.confianca - a.confianca || b.n - a.n).slice(0, 20);
}

// Divide a transcrição em trechos para a busca de respostas.
export function trechos(texto, tamanho = 70, sobreposicao = 15) {
  const p = texto.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < p.length; i += tamanho - sobreposicao) {
    out.push(p.slice(i, i + tamanho).join(" "));
    if (i + tamanho >= p.length) break;
  }
  return out;
}

export function cosseno(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Busca simples por palavras, usada quando a aula ainda não foi indexada.
export function buscaPalavras(pergunta, trecho) {
  const q = semAcento(pergunta).match(/[a-z]{4,}/g) || [];
  const t = semAcento(trecho);
  return q.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0) / Math.max(q.length, 1);
}
