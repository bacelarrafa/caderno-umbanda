import React, { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, BookOpen, BookMarked } from "lucide-react";
import { fontes, destaques, progresso } from "../api";
import { C, SERIF, card, btn, btn2, input, Secao, Tag, Guia, Carregando, dataBR } from "../ui";
import { useTermos, termosNoTexto, CartaoDestaque } from "./Leitor";

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };

export function lembrarFonte(f, pagina) {
  try { localStorage.setItem("ultimaFonte", JSON.stringify({ id: f.id, tipo: f.tipo, titulo: f.titulo, pagina: pagina || null })); } catch { /* sem armazenamento */ }
}
function ultimaFonte() {
  try { return JSON.parse(localStorage.getItem("ultimaFonte") || "null"); } catch { return null; }
}

export function Inicio({ ctx }) {
  const termos = useTermos(ctx.glossario);
  const [q, setQ] = useState("");
  const [aula, setAula] = useState(undefined);
  const [recentes, setRecentes] = useState(null);
  const [prog, setProg] = useState(null);
  const continuar = ultimaFonte();

  useEffect(() => {
    fontes.listar("aula").then(async (l) => setAula(l[0] ? await fontes.obter(l[0].id) : null)).catch(() => setAula(null));
    destaques.listar({ limite: 3 }).then(setRecentes).catch(() => setRecentes([]));
    progresso.listar().then(setProg).catch(() => setProg([]));
  }, []);

  const daAula = useMemo(() => (aula ? termosNoTexto(aula.estudo || aula.texto, termos) : []), [aula, termos]);
  const paraCompletar = daAula.filter((t) => !t.significado);

  const elegiveis = ctx.glossario.filter((g) => g.significado);
  const firmes = (prog || []).filter((p) => p.acertos >= 3 && p.acertos > p.erros * 2 && elegiveis.some((g) => g.id === p.termo_id)).length;
  const contas = Math.min(elegiveis.length, 42);
  const cheias = elegiveis.length ? Math.round((firmes / elegiveis.length) * contas) : 0;

  return (
    <div>
      <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, margin: "4px 0 4px", letterSpacing: -0.5 }}>{saudacao()}, {(ctx.perfil.nome || "").split(" ")[0] || "bem-vinda"}.</h1>
      <div style={{ fontSize: 13.5, color: C.sub, marginBottom: 18 }}>O que você quer entender hoje?</div>

      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ctx.perguntar(q.trim()); }} style={{ display: "flex", gap: 8 }}>
        <input style={{ ...input, flex: 1, fontSize: 15, padding: "12px 14px" }} placeholder="Ex.: por que não se puxa ponto sem a dirigente?" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" style={{ ...btn, padding: "0 16px" }} aria-label="Perguntar"><Search size={16} /></button>
      </form>
      <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>A resposta vem das suas aulas e leituras, com a origem de cada trecho.</div>

      {continuar && (
        <button className="rot-row" onClick={() => ctx.abrirFonte(continuar, continuar.pagina)}
          style={{ ...card, width: "100%", textAlign: "left", color: C.ink, cursor: "pointer", padding: "14px 16px", marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          {continuar.tipo === "aula" ? <BookOpen size={18} color={C.accent} /> : <BookMarked size={18} color={C.folha} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.sub }}>Continuar de onde parou</div>
            <div style={{ fontFamily: SERIF, fontSize: 16, marginTop: 2 }}>{continuar.titulo}{continuar.pagina ? `, p. ${continuar.pagina}` : ""}</div>
          </div>
          <ArrowRight size={16} color={C.faint} />
        </button>
      )}

      <Secao direita={aula && <button style={{ ...btn2, padding: "5px 10px", fontSize: 12.5 }} onClick={() => ctx.abrirFonte(aula)}>Abrir</button>}>Da última aula</Secao>
      {aula === undefined ? <Carregando /> : !aula ? (
        <div style={{ fontSize: 13.5, color: C.sub }}>Quando a primeira aula entrar, os temas dela aparecem aqui.</div>
      ) : (
        <div style={{ ...card, padding: "14px 16px" }}>
          <div style={{ fontFamily: SERIF, fontSize: 17 }}>{aula.titulo}</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: daAula.length ? 12 : 0 }}>{dataBR(aula.data)}</div>
          {daAula.length > 0 && <>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 6 }}>Temas que apareceram. Toque para ver tudo que você já sabe sobre cada um.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {daAula.slice(0, 14).map((t) => (
                <button key={t.id} onClick={() => ctx.abrirFicha(t.id)} className="rot-btn"
                  style={{ ...btn2, padding: "5px 10px", fontSize: 13, fontFamily: SERIF, borderColor: t.significado ? C.line : "#E6CFA3", background: t.significado ? C.surface : C.ouroSoft }}>
                  {t.termo} <span style={{ color: C.faint, fontFamily: "inherit", fontSize: 11.5 }}>{t.n}×</span>
                </button>
              ))}
            </div>
            {paraCompletar.length > 0 && ctx.podeEditar && (
              <div style={{ fontSize: 12.5, color: "#6B4A14", marginTop: 10 }}>Os destacados em dourado ainda não têm significado. Esta aula é uma boa fonte para escrever.</div>
            )}
          </>}
        </div>
      )}

      <Secao>Revisão</Secao>
      <div style={{ ...card, padding: "16px" }}>
        {!prog ? <Carregando /> : elegiveis.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.sub }}>Quando as fichas tiverem significado, dá para treinar aqui.</div>
        ) : <>
          <Guia total={contas} cheias={cheias} titulo={`${firmes} de ${elegiveis.length} termos firmes`} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13.5 }}><span style={{ fontFamily: SERIF, fontSize: 20 }}>{firmes}</span> <span style={{ color: C.sub }}>de {elegiveis.length} termos firmes</span></div>
            <button style={btn} onClick={() => ctx.ir("estudar")}>Revisar agora</button>
          </div>
        </>}
      </div>

      <Secao direita={recentes?.length ? <button style={{ ...btn2, padding: "5px 10px", fontSize: 12.5 }} onClick={() => ctx.ir("estudar", "destaques")}>Ver todos</button> : null}>Destaques recentes</Secao>
      {!recentes ? <Carregando /> : recentes.length === 0 ? (
        <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.55 }}>Ao ler uma aula ou leitura, selecione um trecho importante e toque em Guardar como destaque. Ele fica ligado às fichas dos termos que aparecem nele.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentes.map((d) => <CartaoDestaque key={d.id} d={d} compacto onAbrir={() => ctx.abrirFonte({ id: d.fonte_id, tipo: d.fontes.tipo }, d.pagina)} />)}
        </div>
      )}
    </div>
  );
}
