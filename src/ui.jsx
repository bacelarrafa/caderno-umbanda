import React from "react";
import { Loader2, X } from "lucide-react";

// Paleta: papel, café, pano branco, mar e folha de espada-de-são-jorge.
export const C = {
  bg: "#F3E9D8",        // papel
  surface: "#FBF6EC",   // cartão
  fundo2: "#EADFCB",    // papel mais escuro
  line: "#E2D3BC", line2: "#D2BFA2",
  ink: "#2E2219",       // tinta café escuro
  sub: "#6F5B49", faint: "#A08E7A",
  cafe: "#5B3A26",
  accent: "#2F5D8A", accentSoft: "#DFE7EE",   // mar: aulas e ações de estudo
  folha: "#4F6B3A", folhaSoft: "#E3E8D5",     // folha: leituras
  ouro: "#9A6B1F", ouroSoft: "#F3E3C2",       // destaques
  erro: "#9A3B2E", erroSoft: "#F4DED6",
};
export const SERIF = '"Literata", Georgia, serif';
export const SANS = '"Inter", system-ui, sans-serif';

export const card = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 };
export const iconBtn = { width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, flexShrink: 0 };
export const btn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: C.cafe, color: "#FBF6EC", fontSize: 13, fontWeight: 500, cursor: "pointer" };
export const btn2 = { ...btn, background: C.surface, color: C.ink, border: `1px solid ${C.line}` };
export const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, color: C.ink, background: "#FFFDF8", outline: "none" };
export const label = { fontSize: 12, color: C.sub, marginBottom: 6, display: "block" };
export const dica = { ...card, padding: "12px 14px", background: C.ouroSoft, borderColor: "#E6CFA3", display: "flex", gap: 10, fontSize: 13, color: "#6B4A14", lineHeight: 1.5 };
export const erroBox = { ...card, padding: 12, background: C.erroSoft, borderColor: "#E8C3B8", fontSize: 13, color: C.erro, lineHeight: 1.5 };

export const hoje = () => new Date().toISOString().slice(0, 10);
export const dataBR = (d) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "");
export const palavras = (s) => ((s || "").match(/\S+/g) || []).length;

export function Tag({ children, cor = C.sub, fundo = C.fundo2 }) {
  return <span style={{ fontSize: 11.5, color: cor, background: fundo, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Girando({ size = 15 }) {
  return <Loader2 size={size} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />;
}

export function Carregando({ texto = "Carregando" }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "40px 0", color: C.faint, fontSize: 13.5 }}><Girando /> {texto}</div>;
}

export function Vazio({ children }) {
  return <div style={{ textAlign: "center", padding: "36px 12px", color: C.sub, fontSize: 14, lineHeight: 1.6, fontFamily: SERIF }}>{children}</div>;
}

export function Aviso({ children, onFechar }) {
  if (!children) return null;
  return (
    <div style={{ ...card, padding: "10px 14px", marginBottom: 12, background: C.accentSoft, borderColor: "#C5D3E0", fontSize: 13, color: C.accent, display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span>{children}</span>
      {onFechar && <button onClick={onFechar} aria-label="Fechar" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.accent, padding: 0 }}><X size={14} /></button>}
    </div>
  );
}

export function Titulo({ children, direita, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
      <div>
        <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: -0.4, lineHeight: 1.15 }}>{children}</h1>
        {sub && <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>{sub}</div>}
      </div>
      {direita}
    </div>
  );
}

export function Secao({ children, direita }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 10px", gap: 10 }}>
      <h2 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, margin: 0 }}>{children}</h2>
      {direita}
    </div>
  );
}

export function Escolha({ opcoes, valor, onMudar, pequeno }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opcoes.map(([id, l]) => {
        const on = valor === id;
        return (
          <button key={String(id)} onClick={() => onMudar(id)} aria-pressed={on}
            style={{ ...btn2, fontSize: pequeno ? 12.5 : 13, padding: pequeno ? "6px 11px" : "9px 14px", background: on ? C.cafe : C.surface, color: on ? "#FBF6EC" : C.ink, borderColor: on ? C.cafe : C.line }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

// Fio de contas: cores de guia, usado como enfeite e como medidor de progresso.
const CONTAS = ["#FBF6EC", "#2F5D8A", "#A23B2A", "#4F6B3A", "#C99A2E", "#2E2219", "#7A4E2D"];
export function Guia({ total = 28, cheias, tamanho = 7, titulo }) {
  return (
    <div title={titulo} aria-label={titulo} style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
      {Array.from({ length: total }, (_, i) => {
        const vazia = cheias != null && i >= cheias;
        const cor = CONTAS[i % CONTAS.length];
        return <span key={i} style={{ width: tamanho, height: tamanho, borderRadius: 99, background: vazia ? "transparent" : cor,
          border: `1px solid ${vazia ? C.line2 : cor === "#FBF6EC" ? C.line2 : cor}`, flexShrink: 0 }} />;
      })}
    </div>
  );
}

// Painel que sobe de baixo, para definições e destaques.
export function Painel({ aberto, onFechar, children }) {
  if (!aberto) return null;
  return (
    <>
      <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(46,34,25,0.25)", zIndex: 40 }} />
      <div role="dialog" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 41, display: "flex", justifyContent: "center", animation: "subir .2s ease" }}>
        <div style={{ width: "100%", maxWidth: 680, background: C.surface, borderRadius: "18px 18px 0 0", border: `1px solid ${C.line}`, borderBottom: "none",
          padding: "18px 20px calc(20px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -8px 30px rgba(46,34,25,0.12)", maxHeight: "75vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -26 }}>
            <button onClick={onFechar} aria-label="Fechar" style={{ ...iconBtn, width: 30, height: 30, border: "none", background: "transparent" }}><X size={16} /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export const ESTILOS = `
  body{background:${C.bg}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  @keyframes subir{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
  .rot-tab:hover{color:${C.ink}}
  .rot-row:hover{border-color:${C.line2}}
  .rot-btn:hover{background:${C.fundo2}}
  .termo{background:none;border:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline dotted ${C.accent};text-underline-offset:4px;text-decoration-thickness:1.5px}
  .termo:hover{color:${C.accent}}
  ::selection{background:${C.ouroSoft}}
  input,textarea,select,button{font-family:inherit}
  input:focus,textarea:focus,select:focus{border-color:${C.accent}}
  button:focus-visible,a:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
  button:disabled{cursor:default}
  @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;
