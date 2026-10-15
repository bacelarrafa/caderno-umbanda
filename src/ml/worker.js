// Roda os modelos fora da tela principal, para o app não travar.
// Os modelos são baixados do Hugging Face na primeira vez e ficam em cache.
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

const MODELOS = {
  whisper: {
    rapido: "onnx-community/whisper-base",
    preciso: "onnx-community/whisper-small",
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

async function getWhisper(id, qualidade) {
  const nome = MODELOS.whisper[qualidade] || MODELOS.whisper.preciso;
  if (!cache[nome]) {
    cache[nome] = pipeline("automatic-speech-recognition", nome, {
      device: temGPU ? "webgpu" : "wasm",
      dtype: temGPU ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
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
      const PEDACO = 16000 * 30; // 30 segundos
      const total = Math.ceil(audio.length / PEDACO);
      let texto = "";
      for (let i = 0; i < total; i++) {
        const parte = audio.subarray(i * PEDACO, (i + 1) * PEDACO);
        const out = await asr(parte, { language: "portuguese", task: "transcribe" });
        texto += (texto ? " " : "") + (out.text || "").trim();
        self.postMessage({ id, tipo: "parcial", texto, feito: i + 1, total });
      }
      self.postMessage({ id, tipo: "fim", texto });
    }

    if (acao === "vetorizar") {
      const embed = await getEmbed(id);
      const vetores = [];
      for (let i = 0; i < data.textos.length; i++) {
        const out = await embed(data.textos[i], { pooling: "mean", normalize: true });
        vetores.push(Array.from(out.data));
        if (i % 5 === 0) self.postMessage({ id, tipo: "parcial", feito: i + 1, total: data.textos.length });
      }
      self.postMessage({ id, tipo: "fim", vetores });
    }
  } catch (e) {
    self.postMessage({ id, tipo: "erro", mensagem: String(e?.message || e) });
  }
};
