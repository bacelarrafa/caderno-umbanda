// Ponte entre a tela e o worker de modelos.
let worker;
let seq = 0;
const ouvintes = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const cb = ouvintes.get(data.id);
      if (!cb) return;
      if (data.tipo === "fim") { cb.resolve(data); ouvintes.delete(data.id); }
      else if (data.tipo === "erro") { cb.reject(new Error(data.mensagem)); ouvintes.delete(data.id); }
      else cb.onProgresso?.(data);
    };
  }
  return worker;
}

function chamar(msg, onProgresso, transfer) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    ouvintes.set(id, { resolve, reject, onProgresso });
    getWorker().postMessage({ ...msg, id }, transfer || []);
  });
}

// Converte qualquer áudio que o navegador saiba abrir em 16 kHz mono.
export async function lerAudio(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(buf);
  let mono;
  if (audio.numberOfChannels === 1) {
    mono = new Float32Array(audio.getChannelData(0));
  } else {
    const a = audio.getChannelData(0), b = audio.getChannelData(1);
    mono = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) mono[i] = (a[i] + b[i]) / 2;
  }
  ctx.close?.();
  return mono;
}

export async function transcrever(audio, qualidade, onProgresso) {
  const r = await chamar({ acao: "transcrever", audio, qualidade }, onProgresso, [audio.buffer]);
  return r.texto;
}

export async function vetorizar(textos, onProgresso) {
  const r = await chamar({ acao: "vetorizar", textos }, onProgresso);
  return r.vetores;
}
