// Ajustes para reduzir os erros típicos do Whisper em gravações de aula.
const SR = 16000;

// Corta o áudio em pedaços de até 30 s, sempre num momento de silêncio
// (procura o trecho mais baixo entre 20 s e 30 s), para não cortar palavras no meio.
export function cortarNosSilencios(audio, maxS = 30, minS = 20) {
  const pedacos = [];
  const janela = SR / 10; // 100 ms
  let inicio = 0;
  while (inicio < audio.length) {
    let fim = Math.min(inicio + maxS * SR, audio.length);
    if (fim < audio.length) {
      let melhor = fim, menor = Infinity;
      for (let p = inicio + minS * SR; p + janela <= fim; p += janela) {
        let e = 0;
        for (let i = p; i < p + janela; i++) e += audio[i] * audio[i];
        if (e < menor) { menor = e; melhor = p + janela / 2; }
      }
      fim = Math.floor(melhor);
    }
    pedacos.push(audio.subarray(inicio, fim));
    inicio = fim;
  }
  return pedacos;
}

// Pedaços quase em silêncio fazem o Whisper "inventar" frases. Melhor pular.
export function ehSilencio(pedaco, limite = 0.006) {
  let e = 0;
  for (let i = 0; i < pedaco.length; i += 4) e += pedaco[i] * pedaco[i];
  return Math.sqrt(e / (pedaco.length / 4)) < limite;
}

// Remove loops como "eu entendo, eu entendo, eu entendo..." (3 ou mais repetições seguidas).
export function tirarRepeticoes(texto) {
  return passada(passada(texto));
}

function passada(texto) {
  let p = texto.split(/\s+/).filter(Boolean);
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  for (let n = 8; n >= 1; n--) {
    const out = [];
    let i = 0;
    while (i < p.length) {
      let reps = 1;
      if (i + n <= p.length) {
        const alvo = p.slice(i, i + n).map(norm).join(" ");
        while (i + (reps + 1) * n <= p.length && p.slice(i + reps * n, i + (reps + 1) * n).map(norm).join(" ") === alvo) reps++;
      }
      if (reps >= 3) { out.push(...p.slice(i, i + n)); i += reps * n; }
      else { out.push(p[i]); i++; }
    }
    p = out;
  }
  return p.join(" ");
}
