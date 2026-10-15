import React, { useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, BookOpenText, Check, Pencil } from "lucide-react";
import { destaques, respostas as rApi, busca, fontes as fApi } from "../api";
import { semAcento } from "../corretor";
import { C, SERIF, btn, btn2, input, label, Painel, Tag, Girando } from "../ui";

const L = "A-Za-zÀ-ÖØ-öø-ÿ";
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Monta uma busca única por todos os termos do glossário.
export function useTermos(glossario) {
  return useMemo(() => {
    const lista = glossario.filter((g) => g.termo.length >= 3).sort((a, b) => b.termo.length - a.termo.length);
    if (!lista.length) return { re: null, porChave: {} };
    const porChave = Object.fromEntries(lista.map((g) => [semAcento(g.termo), g]));
    const re = new RegExp(`(?<![${L}])(${lista.map((g) => escapar(g.termo)).join("|")})(s|es)?(?![${L}])`, "giu");
    return { re, porChave };
  }, [glossario]);
}

// Quais termos do glossário aparecem num texto.
export function termosNoTexto(texto, termos) {
  if (!termos.re || !texto) return [];
  const achados = new Map();
  for (const m of texto.matchAll(termos.re)) {
    const g = termos.porChave[semAcento(m[1])];
    if (g) achados.set(g.id, { ...g, n: (achados.get(g.id)?.n || 0) + 1 });
  }
  return [...achados.values()].sort((a, b) => b.n - a.n);
}

// Texto de leitura. Se tiver títulos "## ", vira uma pauta de estudo com seções numeradas.
export function TextoComTermos({ texto, termos, onTermo, tamanho = 17, termosDaAula, onFicha, fonte, ctx }) {
  const pauta = useMemo(() => montarPauta(texto), [texto]);
  if (pauta) return <Pauta pauta={pauta} termos={termos} onTermo={onTermo} termosDaAula={termosDaAula} onFicha={onFicha} fonte={fonte} ctx={ctx} />;
  if (/^\[Gravação \d+\]\s*$/m.test(texto || "")) {
    // Transcrição com várias gravações: cada parte ganha um rótulo.
    const partes = texto.split(/^\[Gravação (\d+)\]\s*$/m);
    const out = [];
    if (partes[0].trim()) out.push(<Corrido key="p0" texto={partes[0].trim()} termos={termos} onTermo={onTermo} tamanho={tamanho} />);
    for (let i = 1; i < partes.length; i += 2) {
      out.push(<div key={`g${i}`} style={{ display: "flex", alignItems: "center", gap: 10, margin: i > 1 || out.length ? "26px 0 10px" : "0 0 10px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.accent, background: C.accentSoft, borderRadius: 99, padding: "3px 10px" }}>Gravação {partes[i]}</span>
        <span style={{ flex: 1, height: 1, background: C.line }} />
      </div>);
      out.push(<Corrido key={`t${i}`} texto={(partes[i + 1] || "").trim()} termos={termos} onTermo={onTermo} tamanho={tamanho} />);
    }
    return <>{out}</>;
  }
  return <Corrido texto={texto} termos={termos} onTermo={onTermo} tamanho={tamanho} />;
}

const ehConfirmar = (t) => /^para confirmar/i.test(t);

// Lê o texto da versão de estudo: "## " título, "> " ideia central, "? " dúvida para a casa.
function montarPauta(texto) {
  if (!/^## /m.test(texto || "")) return null;
  const secoes = [];
  let atual = null, buf = [];
  const fechar = () => { if (atual && buf.join(" ").trim()) atual.paragrafos.push(buf.join(" ").trim()); buf = []; };
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    if (linha.startsWith("## ")) { fechar(); atual = { titulo: linha.slice(3).trim(), ideia: "", paragrafos: [], perguntas: [] }; secoes.push(atual); continue; }
    if (!atual) { atual = { titulo: "", ideia: "", paragrafos: [], perguntas: [] }; secoes.push(atual); }
    if (!linha) { fechar(); continue; }
    if (linha.startsWith("> ")) { fechar(); atual.ideia += (atual.ideia ? " " : "") + linha.slice(2).trim(); continue; }
    if (linha.startsWith("? ") || (ehConfirmar(atual.titulo) && linha)) { fechar(); atual.perguntas.push(linha.replace(/^\?\s*/, "").replace(/^[-*]\s*/, "")); continue; }
    buf.push(linha);
  }
  fechar();
  return secoes.filter((x) => x.titulo || x.paragrafos.length);
}

const CORES = ["#2F5D8A", "#A23B2A", "#4F6B3A", "#C99A2E", "#7A4E2D", "#2E2219"];

function Pauta({ pauta, termos, onTermo, termosDaAula, onFicha, fonte, ctx }) {
  const temas = pauta.filter((x) => x.titulo && !ehConfirmar(x.titulo));
  const confirmar = pauta.find((x) => ehConfirmar(x.titulo));
  const ir = (i) => document.getElementById(`tema-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      {/* Mapa da aula */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Nesta aula, {temas.length} temas</div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {temas.map((t, i) => (
            <li key={i}>
              <button onClick={() => ir(i)} className="rot-btn" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "6px 6px", borderRadius: 8, cursor: "pointer", color: C.ink }}>
                <Conta n={i + 1} cor={CORES[i % CORES.length]} pequena />
                <span style={{ fontFamily: SERIF, fontSize: 15.5 }}>{t.titulo}</span>
              </button>
            </li>
          ))}
          {confirmar && (
            <li>
              <button onClick={() => document.getElementById("tema-confirmar")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="rot-btn"
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "6px 6px", borderRadius: 8, cursor: "pointer", color: C.ouro }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, border: `1.5px solid ${C.ouro}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>?</span>
                <span style={{ fontFamily: SERIF, fontSize: 15.5 }}>{confirmar.perguntas.length} pontos para confirmar com a casa</span>
              </button>
            </li>
          )}
        </ol>
        {termosDaAula?.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Termos da aula</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {termosDaAula.slice(0, 16).map((t) => (
                <button key={t.id} onClick={() => onFicha?.(t.id)} style={{ border: `1px solid ${t.significado ? C.line : "#E6CFA3"}`, background: t.significado ? C.bg : C.ouroSoft, color: C.ink, borderRadius: 99, padding: "3px 10px", fontSize: 12.5, fontFamily: SERIF, cursor: "pointer" }}>{t.termo}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Temas */}
      {temas.map((t, i) => {
        const cor = CORES[i % CORES.length];
        const [lead, ...resto] = t.ideia ? [null, ...t.paragrafos] : t.paragrafos;
        return (
          <section key={i} id={`tema-${i}`} style={{ scrollMarginTop: 20, marginBottom: 34 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <Conta n={i + 1} cor={cor} />
              <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, margin: 0, lineHeight: 1.25, letterSpacing: -0.2 }}>{t.titulo}</h2>
            </div>
            <div style={{ paddingLeft: 42 }}>
              {(t.ideia || lead) && (
                <div style={{ borderLeft: `3px solid ${cor}`, background: C.surface, borderRadius: "0 12px 12px 0", padding: "12px 16px", marginBottom: 16 }}>
                  {t.ideia && <div style={{ fontSize: 11.5, color: cor, fontWeight: 500, marginBottom: 4 }}>Ideia central</div>}
                  <Corrido texto={t.ideia || lead} termos={termos} onTermo={onTermo} tamanho={t.ideia ? 17.5 : 17} peso={t.ideia ? 500 : 400} />
                </div>
              )}
              {resto.map((p, j) => (
                <div key={j} style={{ marginBottom: 12 }}><Corrido texto={p} termos={termos} onTermo={onTermo} tamanho={16.5} /></div>
              ))}
              {ctx && <Ligacoes texto={[t.titulo, t.ideia, ...t.paragrafos].join(" ")} termos={termos} tipo="leitura" ctx={ctx} titulo="Para aprofundar nas leituras" />}
            </div>
          </section>
        );
      })}

      {/* Dúvidas para levar */}
      {confirmar && <Confirmar perguntas={confirmar.perguntas} termos={termos} onTermo={onTermo} fonte={fonte} ctx={ctx} />}
    </div>
  );
}

// Liga um trecho às aulas ou leituras que falam dos mesmos termos do glossário.
let titulosCache = null;
const titulos = () => (titulosCache ||= fApi.titulos().then((ts) => Object.fromEntries(ts.map((t) => [t.id, t]))).catch(() => { titulosCache = null; return {}; }));

// Termos que aparecem em quase tudo e não ajudam a achar ligações específicas.
const GERAIS = new Set(["gira", "terreiro", "medium", "dirigente", "doutrina", "fundamento", "incorporacao", "obrigacao"]);

export function Ligacoes({ texto, termos, tipo, ctx, titulo, max = 2, ignorarFonte }) {
  const chaves = useMemo(() => termosNoTexto(texto, termos).filter((t) => !GERAIS.has(semAcento(t.termo))).slice(0, 4).map((t) => t.termo), [texto, termos]);
  const [itens, setItens] = useState(null);
  const [aberto, setAberto] = useState(null);
  useEffect(() => {
    let vivo = true;
    if (!chaves.length) { setItens([]); return; }
    Promise.all([busca.porTermos(chaves, tipo, 8), titulos()]).then(([rs, por]) => {
      if (!vivo) return;
      const vistos = new Set();
      setItens(rs.filter((r) => por[r.fonte_id] && r.fonte_id !== ignorarFonte && !vistos.has(`${r.fonte_id}-${r.pagina}`) && vistos.add(`${r.fonte_id}-${r.pagina}`))
        .slice(0, max).map((r) => ({ ...r, fonte: por[r.fonte_id] })));
    }).catch(() => vivo && setItens([]));
    return () => { vivo = false; };
  }, [chaves.join("|"), tipo]);
  if (!itens?.length) return null;
  const cor = tipo === "leitura" ? C.folha : C.accent;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, color: cor, fontWeight: 500, marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {itens.map((r, i) => (
          <div key={r.trecho_id} style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${cor}`, borderRadius: "0 10px 10px 0", background: C.surface, padding: "8px 12px" }}>
            <button onClick={() => setAberto(aberto === i ? null : i)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", width: "100%", color: C.ink }}>
              <span style={{ fontFamily: SERIF, fontSize: 14.5 }}>{r.fonte.titulo}</span>
              <span style={{ fontSize: 12, color: C.sub }}>{r.pagina ? `, p. ${r.pagina}` : r.fonte.data ? `, ${r.fonte.data.split("-").reverse().join("/")}` : ""}</span>
            </button>
            <div style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.55, color: C.sub, marginTop: 4,
              display: aberto === i ? "block" : "-webkit-box", WebkitLineClamp: aberto === i ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.texto}</div>
            {aberto === i && <button onClick={() => ctx.abrirFonte(r.fonte, r.pagina)} style={{ ...btn2, marginTop: 8, padding: "4px 10px", fontSize: 12.5 }}>Abrir {tipo === "leitura" ? "a leitura" : "a aula"}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

const norm = (t) => semAcento(t).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// Dúvidas da aula. Quem é editora pode responder; a resposta vai para as fichas
// e alimenta as próximas versões de estudo.
function Confirmar({ perguntas, termos, onTermo, fonte, ctx }) {
  const [lista, setLista] = useState(null);
  const [abrindo, setAbrindo] = useState(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { if (fonte?.id) rApi.listar({ fonteId: fonte.id }).then(setLista).catch(() => setLista([])); else setLista([]); }, [fonte?.id]);
  const achar = (q) => (lista || []).find((r) => norm(r.pergunta) === norm(q));
  const respondidas = perguntas.filter((q) => achar(q)).length;

  const salvar = async (q) => {
    setSalvando(true); setErro("");
    try {
      const ja = achar(q);
      const ids = termosNoTexto(`${q} ${texto}`, termos).map((t) => t.id);
      const r = ja ? await rApi.atualizar(ja.id, { resposta: texto.trim(), termos: ids })
        : await rApi.criar({ fonte_id: fonte.id, pergunta: q, resposta: texto.trim(), termos: ids });
      setLista((l) => [r, ...(l || []).filter((x) => x.id !== r.id)]);
      setAbrindo(null); setTexto("");
    } catch (e) { setErro(e.message); }
    setSalvando(false);
  };

  return (
    <section id="tema-confirmar" style={{ scrollMarginTop: 20, background: C.ouroSoft, border: "1px solid #E6CFA3", borderRadius: 14, padding: "18px 18px 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, margin: "0 0 4px", color: "#6B4A14" }}>Para confirmar com a casa</h2>
        {lista && <span style={{ fontSize: 12.5, color: "#6B4A14" }}>{respondidas} de {perguntas.length} respondidas</span>}
      </div>
      <div style={{ fontSize: 12.5, color: "#6B4A14", opacity: 0.85, marginBottom: 12, lineHeight: 1.5 }}>
        {ctx?.podeEditar ? "Se você já sabe, responda aqui. A resposta vai para as fichas e o caderno usa nas próximas aulas." : "Leve estas dúvidas para a próxima aula."}
      </div>
      {erro && <div style={{ fontSize: 13, color: C.erro, marginBottom: 8 }}>{erro}</div>}
      {perguntas.map((q, i) => {
        const r = achar(q);
        const aberto = abrindo === i;
        return (
          <div key={i} style={{ padding: "12px 0", borderTop: i ? "1px solid #E6CFA3" : "none" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, border: `1.5px solid ${r ? C.folha : C.ouro}`, background: r ? C.folha : "transparent", color: r ? "#FBF6EC" : C.ouro,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 3 }}>{r ? <Check size={13} /> : "?"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Corrido texto={q} termos={termos} onTermo={onTermo} tamanho={16} />
                {r && !aberto && (
                  <div style={{ marginTop: 8, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.folha}`, borderRadius: "0 10px 10px 0", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: C.folha, fontWeight: 500 }}>A casa confirmou</span>
                      {ctx?.podeEditar && <button aria-label="Editar resposta" onClick={() => { setAbrindo(i); setTexto(r.resposta); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.faint, padding: 0 }}><Pencil size={13} /></button>}
                    </div>
                    <Corrido texto={r.resposta} termos={termos} onTermo={onTermo} tamanho={15.5} />
                  </div>
                )}
                {aberto && (
                  <div style={{ marginTop: 8 }}>
                    <textarea autoFocus style={{ ...input, minHeight: 80, fontFamily: SERIF, fontSize: 15, lineHeight: 1.55 }} value={texto} onChange={(e) => setTexto(e.target.value)}
                      placeholder="O que a casa ensina sobre isso, nas suas palavras" />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                      <button style={btn2} onClick={() => { setAbrindo(null); setTexto(""); }}>Cancelar</button>
                      <button style={{ ...btn, opacity: texto.trim() ? 1 : 0.5 }} disabled={!texto.trim() || salvando} onClick={() => salvar(q)}>{salvando ? <Girando /> : <Check size={14} />} Salvar resposta</button>
                    </div>
                  </div>
                )}
                {!r && !aberto && ctx?.podeEditar && (
                  <button onClick={() => { setAbrindo(i); setTexto(""); }} style={{ ...btn2, marginTop: 8, padding: "5px 11px", fontSize: 12.5, background: "transparent", borderColor: "#E6CFA3", color: "#6B4A14" }}>Eu sei a resposta</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// Número do tema dentro de uma conta de guia.
function Conta({ n, cor, pequena }) {
  const t = pequena ? 22 : 30;
  return (
    <span aria-hidden style={{ width: t, height: t, borderRadius: 99, background: cor, color: cor === "#C99A2E" ? C.ink : "#FBF6EC", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: pequena ? 11.5 : 14, fontWeight: 600, flexShrink: 0, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)" }}>{n}</span>
  );
}

function Corrido({ texto, termos, onTermo, tamanho, peso = 400 }) {
  const partes = useMemo(() => {
    if (!termos.re || !texto) return [texto];
    const out = [];
    let ultimo = 0;
    for (const m of texto.matchAll(termos.re)) {
      const g = termos.porChave[semAcento(m[1])];
      if (!g) continue;
      if (m.index > ultimo) out.push(texto.slice(ultimo, m.index));
      out.push({ g, t: m[0], k: m.index });
      ultimo = m.index + m[0].length;
    }
    out.push(texto.slice(ultimo));
    return out;
  }, [texto, termos]);

  return (
    <div style={{ fontFamily: SERIF, fontSize: tamanho, fontWeight: peso, lineHeight: 1.75, color: C.ink, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {partes.map((p, i) => typeof p === "string" ? p
        : <button key={p.k} className="termo" onClick={() => onTermo(p.g)}>{p.t}</button>)}
    </div>
  );
}

// Acompanha o texto selecionado dentro de um bloco de leitura.
export function useSelecao(ref) {
  const [sel, setSel] = useState("");
  useEffect(() => {
    const ver = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || !ref.current || !ref.current.contains(s.anchorNode)) return setSel("");
      const t = s.toString().trim();
      setSel(t.length >= 12 ? t : "");
    };
    document.addEventListener("selectionchange", ver);
    return () => document.removeEventListener("selectionchange", ver);
  }, [ref]);
  return [sel, () => { window.getSelection()?.removeAllRanges(); setSel(""); }];
}

// Bloco completo: texto, definição ao tocar num termo e botão para guardar destaque.
export function Leitura({ texto, ctx, fonte, pagina, comTermos }) {
  const ref = useRef();
  const termos = useTermos(ctx.glossario);
  const [termo, setTermo] = useState(null);
  const [sel, limparSel] = useSelecao(ref);
  const [salvando, setSalvando] = useState(null); // trecho em edição
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState("");

  const doTrecho = salvando ? termosNoTexto(salvando, termos) : [];

  const guardar = async () => {
    setEnviando(true);
    try {
      await destaques.criar({ fonte_id: fonte.id, texto: salvando, pagina: pagina || null, nota: nota.trim(), termos: doTrecho.map((t) => t.id) });
      setSalvando(null); setNota(""); limparSel();
      setOk(doTrecho.length ? `Destaque guardado e ligado a ${doTrecho.map((t) => t.termo).join(", ")}.` : "Destaque guardado.");
      setTimeout(() => setOk(""), 3500);
    } catch (e) { setOk(`Não consegui guardar: ${e.message}`); }
    setEnviando(false);
  };

  return (
    <>
      <div ref={ref}><TextoComTermos texto={texto} termos={termos} onTermo={setTermo} termosDaAula={comTermos ? termosNoTexto(texto, termos) : null} onFicha={ctx.abrirFicha} fonte={fonte} ctx={ctx} /></div>

      {(sel || ok) && !salvando && !termo && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(78px + env(safe-area-inset-bottom, 0px))", zIndex: 30, display: "flex", justifyContent: "center", padding: "0 16px", animation: "subir .15s ease" }}>
          {ok
            ? <div style={{ ...btn, cursor: "default", background: C.folha, boxShadow: "0 6px 20px rgba(46,34,25,0.2)" }}>{ok}</div>
            : <button style={{ ...btn, background: C.ouro, boxShadow: "0 6px 20px rgba(46,34,25,0.2)" }} onMouseDown={(e) => e.preventDefault()} onClick={() => setSalvando(sel)}>
                <Highlighter size={15} /> Guardar como destaque
              </button>}
        </div>
      )}

      <Painel aberto={!!termo} onFechar={() => setTermo(null)}>
        {termo && <>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, marginBottom: 8, paddingRight: 30 }}>{termo.termo}</div>
          <div style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.65, color: termo.significado ? C.ink : C.faint, marginBottom: 16 }}>
            {termo.significado || "Ainda sem significado no glossário."}
          </div>
          <button style={btn} onClick={() => { setTermo(null); ctx.abrirFicha(termo.id); }}><BookOpenText size={15} /> Abrir a ficha de {termo.termo}</button>
        </>}
      </Painel>

      <Painel aberto={!!salvando} onFechar={() => setSalvando(null)}>
        {salvando && <>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>Novo destaque de {fonte.titulo}{pagina ? `, p. ${pagina}` : ""}</div>
          <blockquote style={{ margin: "0 0 14px", padding: "4px 0 4px 14px", borderLeft: `3px solid ${C.ouro}`, fontFamily: SERIF, fontSize: 15.5, lineHeight: 1.6, maxHeight: 180, overflowY: "auto" }}>{salvando}</blockquote>
          {doTrecho.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={label}>Vai aparecer na ficha de</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{doTrecho.map((t) => <Tag key={t.id} cor={C.accent} fundo={C.accentSoft}>{t.termo}</Tag>)}</div>
            </div>
          )}
          <span style={label}>O que isso te ensinou? (opcional)</span>
          <textarea style={{ ...input, minHeight: 80, lineHeight: 1.5, marginBottom: 14 }} value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Em suas palavras, ou como se liga a outra aula" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btn2} onClick={() => setSalvando(null)}>Cancelar</button>
            <button style={btn} disabled={enviando} onClick={guardar}>{enviando ? <Girando /> : <Highlighter size={15} />} Guardar destaque</button>
          </div>
        </>}
      </Painel>
    </>
  );
}

// Cartão de um destaque, usado na página inicial, nas fichas e na lista de destaques.
export function CartaoDestaque({ d, onAbrir, compacto }) {
  return (
    <div className="rot-row" onClick={onAbrir} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", cursor: onAbrir ? "pointer" : "default" }}>
      <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.6, borderLeft: `3px solid ${C.ouro}`, paddingLeft: 12,
        display: compacto ? "-webkit-box" : "block", WebkitLineClamp: compacto ? 3 : "unset", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.texto}</div>
      {d.nota && <div style={{ fontSize: 13.5, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>{d.nota}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {d.fontes && <Tag cor={d.fontes.tipo === "aula" ? C.accent : C.folha} fundo={d.fontes.tipo === "aula" ? C.accentSoft : C.folhaSoft}>{d.fontes.titulo}{d.pagina ? `, p. ${d.pagina}` : ""}</Tag>}
      </div>
    </div>
  );
}
