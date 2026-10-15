// Toda conversa com o banco passa por aqui.
import { supabase, supabaseUrl, supabaseChave } from "./supabaseClient";
import { trechos as dividir } from "./corretor";

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

/* ---------- Acesso ---------- */
export const auth = {
  sessao: async () => (await supabase.auth.getSession()).data.session,
  aoMudar: (cb) => supabase.auth.onAuthStateChange((evento, sessao) => cb(evento, sessao)).data.subscription,
  entrar: async (email, senha) => ok(await supabase.auth.signInWithPassword({ email, password: senha })),
  cadastrar: async (nome, email, senha) =>
    ok(await supabase.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: location.origin + location.pathname } })),
  recuperar: async (email) => ok(await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })),
  novaSenha: async (senha) => ok(await supabase.auth.updateUser({ password: senha })),
  sair: () => supabase.auth.signOut(),
};

export async function meuPerfil(id) {
  return ok(await supabase.from("perfis").select("*").eq("id", id).maybeSingle());
}

/* ---------- Pessoas (admin) ---------- */
export const pessoas = {
  listar: async () => ok(await supabase.from("perfis").select("*").order("criado_em")),
  atualizar: async (id, patch) => ok(await supabase.from("perfis").update(patch).eq("id", id)),
};

/* ---------- Aulas e leituras ---------- */
const CAMPOS_LISTA = "id, tipo, titulo, autor, data, visibilidade, indexada, criado_por, criado_em, atualizado_em";

export const fontes = {
  listar: async (tipo) =>
    ok(await supabase.from("fontes").select(CAMPOS_LISTA).eq("tipo", tipo).order(tipo === "aula" ? "data" : "titulo", { ascending: tipo !== "aula" })),
  titulos: async () => ok(await supabase.from("fontes").select("id, tipo, titulo, data")),
  obter: async (id) => ok(await supabase.from("fontes").select("*").eq("id", id).single()),
  async criar(f) {
    const nova = ok(await supabase.from("fontes").insert(f).select().single());
    await gerarTrechos(nova);
    return nova;
  },
  async salvarTexto(fonte, texto) {
    const f = ok(await supabase.from("fontes").update({ texto, indexada: false, atualizado_em: new Date().toISOString() }).eq("id", fonte.id).select().single());
    await gerarTrechos(f);
    return f;
  },
  atualizar: async (id, patch) => ok(await supabase.from("fontes").update({ ...patch, atualizado_em: new Date().toISOString() }).eq("id", id)),
  // Soma uma gravação nova ao fim da transcrição de uma aula.
  async adicionarGravacao(fonte, texto) {
    const atual = (fonte.texto || "").trim();
    const n = (atual.match(/^\[Gravação \d+\]/gm) || []).length;
    const base = n ? atual : `[Gravação 1]\n\n${atual}`;
    return this.salvarTexto(fonte, `${base}\n\n[Gravação ${Math.max(n, 1) + 1}]\n\n${texto.trim()}`);
  },
  async juntar(destino, origens) {
    ok(await supabase.rpc("juntar_aulas", { destino, origens }));
    const f = ok(await supabase.from("fontes").select("*").eq("id", destino).single());
    await gerarTrechos(f);
    return f;
  },
  async salvarEstudo(fonte, estudo) {
    const f = ok(await supabase.from("fontes").update({ estudo, indexada: false, atualizado_em: new Date().toISOString() }).eq("id", fonte.id).select().single());
    await gerarTrechos(f);
    return f;
  },
  // Pedido "simples" (texto puro, sem cabeçalhos extras): o navegador não faz a checagem prévia de CORS.
  async gerarEstudo(fonteId, nivel = "completo") {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Entre na sua conta de novo.");
    let r;
    try {
      r = await fetch(`${supabaseUrl}/functions/v1/versao-estudo`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ fonte_id: fonteId, nivel, token: session.access_token, apikey: supabaseChave }),
      });
    } catch { throw new Error("Não consegui falar com a função versao-estudo no Supabase."); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.erro) throw new Error(d.erro || d.message || `erro ${r.status}`);
    return d.texto;
  },
  excluir: async (id) => ok(await supabase.from("fontes").delete().eq("id", id)),
};

// Divide o texto em trechos (por página, nas leituras) e grava sem vetores.
// A busca por palavras já funciona; a busca por sentido entra depois de preparar.
async function gerarTrechos(fonte) {
  ok(await supabase.from("trechos").delete().eq("fonte_id", fonte.id));
  const linhas = [];
  if (Array.isArray(fonte.paginas) && fonte.paginas.length) {
    fonte.paginas.forEach((p, i) => dividir(p).forEach((t) => linhas.push({ pagina: i + 1, texto: t })));
  } else {
    dividir((fonte.estudo || fonte.texto).replace(/^(## |> |\? |- )/gm, "").replace(/^\[Gravação \d+\]\s*$/gm, "")).forEach((t) => linhas.push({ pagina: null, texto: t }));
  }
  const rows = linhas.map((l, i) => ({ ...l, ordem: i, fonte_id: fonte.id }));
  for (let i = 0; i < rows.length; i += 500) ok(await supabase.from("trechos").insert(rows.slice(i, i + 500)));
}

export const trechos = {
  semVetor: async (fonteId) =>
    ok(await supabase.from("trechos").select("id, fonte_id, ordem, pagina, texto").eq("fonte_id", fonteId).is("embedding", null).order("ordem").limit(5000)),
  async salvarVetores(rows) {
    for (let i = 0; i < rows.length; i += 100) ok(await supabase.from("trechos").upsert(rows.slice(i, i + 100)));
  },
};

/* ---------- Glossário ---------- */
export const glossario = {
  listar: async () => ok(await supabase.from("glossario").select("*").order("termo")),
  criar: async (g) => ok(await supabase.from("glossario").insert(g).select().single()),
  atualizar: async (id, patch) => ok(await supabase.from("glossario").update({ ...patch, atualizado_em: new Date().toISOString() }).eq("id", id)),
  excluir: async (id) => ok(await supabase.from("glossario").delete().eq("id", id)),
  ignorados: async () => (ok(await supabase.from("ignorados").select("palavra"))).map((r) => r.palavra),
  ignorar: async (palavra) => ok(await supabase.from("ignorados").upsert({ palavra })),
};

/* ---------- Dados pessoais ---------- */
export const progresso = {
  listar: async () => ok(await supabase.from("progresso").select("termo_id, acertos, erros")),
  salvar: async (termo_id, acertos, erros) => ok(await supabase.from("progresso").upsert({ termo_id, acertos, erros })),
};

export const notas = {
  obter: async (fonteId) => (ok(await supabase.from("notas").select("texto").eq("fonte_id", fonteId).maybeSingle()))?.texto || "",
  salvar: async (fonte_id, texto) => ok(await supabase.from("notas").upsert({ fonte_id, texto })),
};

/* ---------- Busca ---------- */
export const busca = {
  porSentido: async (vetor, tipo) => ok(await supabase.rpc("buscar_semantica", { q: vetor, n: 8, filtro_tipo: tipo })),
  // Busca pelos termos do glossário (frase exata de cada um), usada para ligar aulas e leituras.
  porTermos: async (termos, tipo, n = 6) => {
    const q = termos.map((t) => `"${t.replace(/"/g, "")}"`).join(" or ");
    if (!q) return [];
    return ok(await supabase.rpc("buscar_texto", { q, n, filtro_tipo: tipo }));
  },
  porPalavras: async (pergunta, tipo) => {
    const termos = (pergunta.match(/[\p{L}]{4,}/gu) || []).join(" or ");
    if (!termos) return [];
    return ok(await supabase.rpc("buscar_texto", { q: termos, n: 8, filtro_tipo: tipo }));
  },
};

/* ---------- Estudo: destaques, fichas e ligações ---------- */
export const destaques = {
  listar: async ({ termoId, limite = 50 } = {}) => {
    let q = supabase.from("destaques").select("*, fontes(titulo, tipo)").order("criado_em", { ascending: false }).limit(limite);
    if (termoId) q = q.contains("termos", [termoId]);
    return ok(await q);
  },
  criar: async (d) => ok(await supabase.from("destaques").insert(d).select("*, fontes(titulo, tipo)").single()),
  atualizar: async (id, patch) => ok(await supabase.from("destaques").update(patch).eq("id", id)),
  excluir: async (id) => ok(await supabase.from("destaques").delete().eq("id", id)),
};

export const notasTermo = {
  obter: async (termoId) => (ok(await supabase.from("notas_termo").select("texto").eq("termo_id", termoId).maybeSingle()))?.texto || "",
  salvar: async (termo_id, texto) => ok(await supabase.from("notas_termo").upsert({ termo_id, texto })),
};

// Onde um termo aparece nas aulas e leituras (busca exata pela expressão).
export async function ocorrencias(termo) {
  return ok(await supabase.rpc("buscar_texto", { q: `"${termo.replace(/"/g, "")}"`, n: 40, filtro_tipo: null }));
}

/* ---------- Respostas da casa ---------- */
export const respostas = {
  listar: async ({ fonteId, termoId } = {}) => {
    let q = supabase.from("respostas").select("*, fontes(titulo, tipo)").order("criado_em", { ascending: false }).limit(500);
    if (fonteId) q = q.eq("fonte_id", fonteId);
    if (termoId) q = q.contains("termos", [termoId]);
    return ok(await q);
  },
  criar: async (r) => ok(await supabase.from("respostas").insert(r).select("*, fontes(titulo, tipo)").single()),
  atualizar: async (id, patch) => ok(await supabase.from("respostas").update({ ...patch, atualizado_em: new Date().toISOString() }).eq("id", id).select("*, fontes(titulo, tipo)").single()),
  excluir: async (id) => ok(await supabase.from("respostas").delete().eq("id", id)),
};
