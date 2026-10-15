import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X, ChevronLeft, Pencil, Check, Link2 } from "lucide-react";
import { glossario as api, ocorrencias, fontes, destaques, notasTermo } from "../api";
import { semAcento } from "../corretor";
import { C, SERIF, card, iconBtn, btn, btn2, input, label, erroBox, Tag, Titulo, Secao, Carregando, Vazio, Girando, Escolha, dataBR } from "../ui";
import { useTermos, termosNoTexto, CartaoDestaque } from "./Leitor";

export function Fichas({ ctx, abertaId, setAbertaId }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [novo, setNovo] = useState({ termo: "", significado: "" });
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  const termo = ctx.glossario.find((g) => g.id === abertaId);
  if (abertaId && termo) return <Ficha termo={termo} ctx={ctx} onVoltar={() => setAbertaId(null)} />;

  const lista = ctx.glossario
    .filter((g) => !busca || semAcento(g.termo + " " + g.significado).includes(semAcento(busca)))
    .filter((g) => filtro === "todos" || (filtro === "vazias" ? !g.significado : !!g.significado))
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));

  const grupos = lista.reduce((acc, g) => {
    const l = semAcento(g.termo[0]).toUpperCase();
    (acc[l] = acc[l] || []).push(g);
    return acc;
  }, {});

  const criar = async () => {
    setErro("");
    try {
      await api.criar({ termo: novo.termo.trim(), significado: novo.significado.trim() });
      setNovo({ termo: "", significado: "" }); setCriando(false);
      await ctx.recarregarGlossario();
    } catch (e) { setErro(/duplicate/i.test(e.message) ? "Esse termo já tem ficha." : e.message); }
  };

  const vazias = ctx.glossario.filter((g) => !g.significado).length;

  return (
    <div>
      <Titulo sub={`${ctx.glossario.length} termos. Cada ficha junta o que as aulas, as leituras e seus destaques dizem.`}
        direita={ctx.podeEditar && !criando && <button style={btn} onClick={() => setCriando(true)}><Plus size={15} /> Nova</button>}>Fichas</Titulo>

      {criando && (
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...input, flex: "1 1 140px" }} placeholder="Termo" value={novo.termo} onChange={(e) => setNovo({ ...novo, termo: e.target.value })} autoFocus />
            <input style={{ ...input, flex: "2 1 220px" }} placeholder="O que significa, nas palavras da casa" value={novo.significado} onChange={(e) => setNovo({ ...novo, significado: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button style={btn2} onClick={() => setCriando(false)}>Cancelar</button>
            <button style={{ ...btn, opacity: novo.termo.trim() ? 1 : 0.5 }} disabled={!novo.termo.trim()} onClick={criar}><Check size={15} /> Criar ficha</button>
          </div>
        </div>
      )}
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}

      <input style={{ ...input, marginBottom: 10 }} placeholder="Procurar uma ficha" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div style={{ marginBottom: 6 }}>
        <Escolha pequeno valor={filtro} onMudar={setFiltro} opcoes={[["todos", "Todas"], ["completas", "Com significado"], ["vazias", `Para completar (${vazias})`]]} />
      </div>

      {lista.length === 0 && <Vazio>Nenhuma ficha com esse nome.</Vazio>}
      {Object.entries(grupos).map(([letra, itens]) => (
        <div key={letra}>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.faint, margin: "18px 0 8px" }}>{letra}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {itens.map((g) => (
              <button key={g.id} className="rot-row" onClick={() => setAbertaId(g.id)}
                style={{ ...card, padding: "12px 15px", cursor: "pointer", textAlign: "left", color: C.ink, display: "block", width: "100%" }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500 }}>{g.termo}</div>
                <div style={{ fontSize: 13.5, color: g.significado ? C.sub : C.faint, marginTop: 3, lineHeight: 1.45 }}>{g.significado || "Para completar"}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Ficha({ termo, ctx, onVoltar }) {
  const termos = useTermos(ctx.glossario);
  const [achados, setAchados] = useState(null);
  const [meus, setMeus] = useState(null);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(termo.significado);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setAchados(null); setMeus(null); setRascunho(termo.significado); setEditando(false);
    Promise.all([ocorrencias(termo.termo), fontes.titulos()])
      .then(([rs, ts]) => {
        const por = Object.fromEntries(ts.map((t) => [t.id, t]));
        setAchados(rs.map((r) => ({ ...r, fonte: por[r.fonte_id] })).filter((r) => r.fonte));
      }).catch((e) => { setErro(e.message); setAchados([]); });
    destaques.listar({ termoId: termo.id }).then(setMeus).catch(() => setMeus([]));
  }, [termo.id]);

  // Termos que aparecem junto com este: é aqui que as coisas se casam.
  const ligados = useMemo(() => {
    if (!achados) return [];
    const conta = new Map();
    for (const r of achados) for (const t of termosNoTexto(r.texto, termos)) {
      if (t.id === termo.id) continue;
      conta.set(t.id, { ...t, n: (conta.get(t.id)?.n || 0) + 1 });
    }
    for (const d of meus || []) for (const id of d.termos) {
      const g = ctx.glossario.find((x) => x.id === id);
      if (g && id !== termo.id) conta.set(id, { ...g, n: (conta.get(id)?.n || 0) + 2 });
    }
    return [...conta.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  }, [achados, meus, termos]);

  const aulas = (achados || []).filter((r) => r.fonte.tipo === "aula");
  const leituras = (achados || []).filter((r) => r.fonte.tipo === "leitura");

  const salvarSignificado = async () => {
    try { await api.atualizar(termo.id, { significado: rascunho.trim() }); await ctx.recarregarGlossario(); setEditando(false); }
    catch (e) { setErro(e.message); }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir a ficha "${termo.termo}"?`)) return;
    try { await api.excluir(termo.id); await ctx.recarregarGlossario(); onVoltar(); } catch (e) { setErro(e.message); }
  };

  const marcar = (t) => {
    const re = new RegExp(`(${termo.termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "giu");
    return t.split(re).map((p, i) => (i % 2 ? <mark key={i} style={{ background: C.accentSoft, color: C.accent, borderRadius: 3, padding: "0 2px" }}>{p}</mark> : p));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button className="rot-btn" style={iconBtn} onClick={onVoltar} aria-label="Voltar"><ChevronLeft size={16} /></button>
        <div style={{ flex: 1 }} />
        {ctx.podeEditar && !editando && <button className="rot-btn" style={iconBtn} onClick={() => setEditando(true)} aria-label="Editar significado"><Pencil size={15} /></button>}
        {ctx.podeEditar && <button className="rot-btn" style={iconBtn} onClick={excluir} aria-label="Excluir ficha"><Trash2 size={15} color={C.erro} /></button>}
      </div>

      <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 500, margin: "0 0 10px", letterSpacing: -0.6, lineHeight: 1.1 }}>{termo.termo}</h1>
      {editando ? (
        <div style={{ marginBottom: 8 }}>
          <textarea autoFocus style={{ ...input, minHeight: 90, fontFamily: SERIF, fontSize: 16, lineHeight: 1.6 }} value={rascunho} onChange={(e) => setRascunho(e.target.value)} placeholder="O que significa, nas palavras da casa" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btn2} onClick={() => setEditando(false)}>Cancelar</button>
            <button style={btn} onClick={salvarSignificado}><Check size={15} /> Salvar</button>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.65, color: termo.significado ? C.ink : C.faint, margin: "0 0 4px", maxWidth: 620 }}>
          {termo.significado || (ctx.podeEditar ? "Ainda sem significado. Leia os trechos abaixo e escreva com as palavras da casa." : "Ainda sem significado.")}
        </p>
      )}
      {erro && <div style={{ ...erroBox, margin: "12px 0" }}>{erro}</div>}

      {ligados.length > 0 && <>
        <Secao>Se liga com</Secao>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ligados.map((g) => (
            <button key={g.id} onClick={() => ctx.abrirFicha(g.id)} className="rot-btn"
              style={{ ...btn2, padding: "6px 11px", fontSize: 13, fontFamily: SERIF }}><Link2 size={13} color={C.faint} /> {g.termo}</button>
          ))}
        </div>
      </>}

      <Secao direita={meus?.length ? <span style={{ fontSize: 12.5, color: C.sub }}>{meus.length}</span> : null}>Meus destaques</Secao>
      {!meus ? <Carregando /> : meus.length === 0
        ? <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.55 }}>Quando você selecionar um trecho que fala de {termo.termo} numa aula ou leitura e guardar como destaque, ele aparece aqui.</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{meus.map((d) => <CartaoDestaque key={d.id} d={d} onAbrir={() => ctx.abrirFonte({ id: d.fonte_id, tipo: d.fontes.tipo }, d.pagina)} />)}</div>}

      <Secao direita={aulas.length ? <span style={{ fontSize: 12.5, color: C.sub }}>{aulas.length}</span> : null}>Nas aulas</Secao>
      <Ocorrencias lista={achados && aulas} vazio="Nenhuma aula falou disso ainda." marcar={marcar} ctx={ctx} />

      <Secao direita={leituras.length ? <span style={{ fontSize: 12.5, color: C.sub }}>{leituras.length}</span> : null}>Nas leituras</Secao>
      <Ocorrencias lista={achados && leituras} vazio="Nenhuma leitura fala disso ainda." marcar={marcar} ctx={ctx} />

      <Secao>Minhas anotações</Secao>
      <NotaTermo termoId={termo.id} nome={termo.termo} />

      {ctx.podeEditar && termo.variantes?.length > 0 && <>
        <Secao>Correções que o caderno aprendeu</Secao>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {termo.variantes.map((v) => (
            <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B4A14", background: C.ouroSoft, padding: "3px 5px 3px 9px", borderRadius: 6 }}>
              {v}
              <button aria-label={`Remover ${v}`} onClick={async () => { await api.atualizar(termo.id, { variantes: termo.variantes.filter((x) => x !== v) }); ctx.recarregarGlossario(); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "#6B4A14" }}><X size={11} /></button>
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Quando a transcrição escreve assim, o caderno troca por {termo.termo}.</div>
      </>}
    </div>
  );
}

function Ocorrencias({ lista, vazio, marcar, ctx }) {
  const [todas, setTodas] = useState(false);
  if (!lista) return <Carregando />;
  if (!lista.length) return <div style={{ fontSize: 13.5, color: C.sub }}>{vazio}</div>;
  const visiveis = todas ? lista : lista.slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visiveis.map((r) => (
        <button key={r.trecho_id} className="rot-row" onClick={() => ctx.abrirFonte(r.fonte, r.pagina)}
          style={{ ...card, padding: "12px 15px", cursor: "pointer", textAlign: "left", color: C.ink, display: "block", width: "100%" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <Tag>{r.fonte.titulo}</Tag>
            {r.pagina ? <Tag>p. {r.pagina}</Tag> : r.fonte.data && <Tag>{dataBR(r.fonte.data)}</Tag>}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.6 }}>…{marcar(r.texto)}…</div>
        </button>
      ))}
      {lista.length > 4 && !todas && <button style={{ ...btn2, alignSelf: "flex-start" }} onClick={() => setTodas(true)}>Ver mais {lista.length - 4}</button>}
    </div>
  );
}

function NotaTermo({ termoId, nome }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("carregando");
  const timer = useRef();
  useEffect(() => { setEstado("carregando"); notasTermo.obter(termoId).then((t) => { setTexto(t); setEstado("ok"); }).catch(() => setEstado("erro")); }, [termoId]);
  const mudar = (v) => {
    setTexto(v); setEstado("salvando");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => notasTermo.salvar(termoId, v).then(() => setEstado("salvo")).catch(() => setEstado("erro")), 800);
  };
  return (
    <div>
      <textarea style={{ ...input, minHeight: 100, lineHeight: 1.6, fontFamily: SERIF, fontSize: 15 }} disabled={estado === "carregando"} value={texto} onChange={(e) => mudar(e.target.value)}
        placeholder={`O que você entendeu sobre ${nome} até agora, juntando aulas e leituras. Só você vê.`} />
      <div style={{ fontSize: 11.5, color: estado === "erro" ? C.erro : C.faint, marginTop: 4, minHeight: 15 }}>
        {{ salvando: "Salvando", salvo: "Salvo", erro: "Não salvou, tente de novo" }[estado] || ""}
      </div>
    </div>
  );
}
