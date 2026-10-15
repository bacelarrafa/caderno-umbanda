// Roda os modelos fora da tela principal, para o app não travar.
// Os modelos são baixados do Hugging Face na primeira vez e ficam em cache.
import { pipeline, env } from "@huggingface/transformers";
import { cortarNosSilencios, ehSilencio, tirarRepeticoes } from "./limpeza";

env.allowLocalModels = false;

const MODELOS = {
  whisper: {
    rapido: "onnx-community/whisper-base",
    preciso: "onnx-community/whisper-small",
    maxima: "onnx-community/whisper-large-v3-turbo",
  },
  embed: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
};

const cache = {};
const temGPU = typeof navigator !== "undefined" && !!navigator.gpu;

function progresso(id, etapa) {
  return (p) => {
    if (p.status === "progress" && p.total) {
      self.postMessage({ id, tipo: "download", etapa, arquivo: p.file, pct: Math.round((p.loaded / p.total) * 100) });
    }
  };
}

async function temFp16() {
  try { return (await navigator.gpu.requestAdapter())?.features.has("shader-f16"); } catch { return false; }
}

async function getWhisper(id, qualidade) {
  if (qualidade === "maxima" && !temGPU) throw new Error("o modelo Máxima precisa de um navegador com WebGPU (Chrome ou Edge no computador)");
  const nome = MODELOS.whisper[qualidade] || MODELOS.whisper.preciso;
  if (!cache[nome]) {
    const encoder = qualidade === "maxima" && (await temFp16()) ? "fp16" : "fp32";
    cache[nome] = pipeline("automatic-speech-recognition", nome, {
      device: temGPU ? "webgpu" : "wasm",
      dtype: temGPU ? { encoder_model: encoder, decoder_model_merged: "q4" } : "q8",
      progress_callback: progresso(id, "Baixando modelo de transcrição"),
    });
  }
  return cache[nome];
}

async function getEmbed(id) {
  if (!cache.embed) {
    cache.embed = pipeline("feature-extraction", MODELOS.embed, {
      dtype: "q8",
      progress_callback: progresso(id, "Baixando modelo de busca"),
    });
  }
  return cache.embed;
}

self.onmessage = async ({ data }) => {
  const { id, acao } = data;
  try {
    if (acao === "transcrever") {
      const asr = await getWhisper(id, data.qualidade);
      const audio = data.audio; // Float32Array, 16 kHz, mono
      const pedacos = cortarNosSilencios(audio);
      const total = pedacos.length;
      let texto = "";
      for (let i = 0; i < total; i++) {
        if (!ehSilencio(pedacos[i])) {
          const out = await asr(pedacos[i], { language: "portuguese", task: "transcribe", no_repeat_ngram_size: 5 });
          const parte = tirarRepeticoes((out.text || "").trim());
          texto += (texto ? " " : "") + parte;
        }
        self.postMessage({ id, tipo: "parcial", texto, feito: i + 1, total });
      }
      self.postMessage({ id, tipo: "fim", texto: tirarRepeticoes(texto) });
    }

    if (acao === "vetorizar") {
      const embed = await getEmbed(id);
      const vetores = [];
      const LOTE = 16;
      for (let i = 0; i < data.textos.length; i += LOTE) {
        const out = await embed(data.textos.slice(i, i + LOTE), { pooling: "mean", normalize: true });
        vetores.push(...out.tolist());
        self.postMessage({ id, tipo: "parcial", feito: Math.min(i + LOTE, data.textos.length), total: data.textos.length });
      }
      self.postMessage({ id, tipo: "fim", vetores });
    }
  } catch (e) {
    self.postMessage({ id, tipo: "erro", mensagem: String(e?.message || e) });
  }
};
