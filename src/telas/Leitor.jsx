import React, { useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, BookOpenText } from "lucide-react";
import { destaques } from "../api";
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

// Texto de leitura. Linhas que começam com "## " viram títulos de seção.
export function TextoComTermos({ texto, termos, onTermo, tamanho = 17 }) {
  const blocos = useMemo(() => {
    if (!/^## /m.test(texto || "")) return null;
    const out = [];
    let corpo = [];
    for (const linha of texto.split("\n")) {
      if (linha.startsWith("## ")) {
        if (corpo.join("").trim()) out.push({ t: corpo.join("\n").trim() });
        corpo = [];
        out.push({ h: linha.slice(3).trim() });
      } else corpo.push(linha);
    }
    if (corpo.join("").trim()) out.push({ t: corpo.join("\n").trim() });
    return out;
  }, [texto]);

  if (blocos) {
    return blocos.map((b, i) => b.h
      ? <h2 key={i} style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, margin: i ? "30px 0 8px" : "0 0 8px", color: b.h.startsWith("Para confirmar") ? C.ouro : C.cafe }}>{b.h}</h2>
      : <Corrido key={i} texto={b.t} termos={termos} onTermo={onTermo} tamanho={tamanho} />);
  }
  return <Corrido texto={texto} termos={termos} onTermo={onTermo} tamanho={tamanho} />;
}

function Corrido({ texto, termos, onTermo, tamanho }) {
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
    <div style={{ fontFamily: SERIF, fontSize: tamanho, lineHeight: 1.8, color: C.ink, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
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
export function Leitura({ texto, ctx, fonte, pagina }) {
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
      <div ref={ref}><TextoComTermos texto={texto} termos={termos} onTermo={setTermo} /></div>

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
