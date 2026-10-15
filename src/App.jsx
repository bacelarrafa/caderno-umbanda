import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Drum, BookOpen, Library, GraduationCap, MessageCircleQuestion, Plus, Trash2, X,
  ChevronLeft, Check, Loader2, Upload, Download, Wand2, Search, Lightbulb, FileAudio, ShieldCheck, Pencil,
} from "lucide-react";
import { load, save } from "./storage";
import { GLOSSARIO_INICIAL } from "./seed";
import { aplicarGlossario, sugerir, substituir, trechos, cosseno, buscaPalavras, semAcento } from "./corretor";
import { lerAudio, transcrever, vetorizar } from "./ml/cliente";
import { AULAS_DEMO } from "./demo";

const C = {
  bg: "#FBFBFA", surface: "#FFFFFF", line: "#ECEBE7", line2: "#E0DFD9",
  ink: "#26251F", sub: "#6E6D66", faint: "#9B9A94", accent: "#4F46A8", accentSoft: "#EEEDFB",
};
const card = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 };
const iconBtn = { width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.line}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink };
const btn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: C.ink, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" };
const btn2 = { ...btn, background: "#fff", color: C.ink, border: `1px solid ${C.line}` };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, color: C.ink, background: "#fff", outline: "none" };
const label = { fontSize: 11.5, color: C.faint, marginBottom: 6, display: "block" };
const dica = { ...card, padding: "12px 14px", background: "#FFF9EE", borderColor: "#F0E2C4", display: "flex", gap: 10, fontSize: 13, color: "#7A4E18", lineHeight: 1.5 };

const TABS = [
  { id: "aulas", label: "Aulas", icon: BookOpen },
  { id: "glossario", label: "Glossário", icon: Library },
  { id: "treino", label: "Treino", icon: GraduationCap },
  { id: "perguntas", label: "Perguntas", icon: MessageCircleQuestion },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
const hoje = () => new Date().toISOString().slice(0, 10);
const dataBR = (d) => d ? d.split("-").reverse().join("/") : "";
const palavras = (s) => (s.match(/\S+/g) || []).length;

export default function App() {
  const [pronto, setPronto] = useState(false);
  const [tab, setTab] = useState("aulas");
  const [aulas, setAulas] = useState([]);
  const [glossario, setGlossario] = useState([]);
  const [ignorados, setIgnorados] = useState([]);
  const [abertaId, setAbertaId] = useState(null);

  useEffect(() => {
    (async () => {
      setAulas(await load("aulas", AULAS_DEMO));
      setGlossario(await load("glossario", GLOSSARIO_INICIAL));
      setIgnorados(await load("ignorados", []));
      setPronto(true);
    })();
  }, []);
  useEffect(() => { if (pronto) save("aulas", aulas); }, [aulas, pronto]);
  useEffect(() => { if (pronto) save("glossario", glossario); }, [glossario, pronto]);
  useEffect(() => { if (pronto) save("ignorados", ignorados); }, [ignorados, pronto]);

  const atualizarAula = (id, patch) => setAulas((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Aprende uma correção: guarda "errado" como variante do termo certo.
  const aprender = (errado, certo) => {
    const e = errado.trim(), c = certo.trim();
    if (!e || !c || semAcento(e) === semAcento(c)) return;
    setGlossario((g) => {
      const i = g.findIndex((x) => semAcento(x.termo) === semAcento(c));
      if (i === -1) return [...g, { id: uid(), termo: c, significado: "", variantes: [e], acertos: 0, erros: 0 }];
      const x = g[i];
      if ((x.variantes || []).some((v) => semAcento(v) === semAcento(e))) return g;
      const novo = [...g]; novo[i] = { ...x, variantes: [...(x.variantes || []), e] };
      return novo;
    });
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ aulas, glossario, ignorados, versao: 1 }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `caderno-umbanda-${hoje()}.json`;
    a.click();
  };
  const importarRef = useRef();
  const importar = async (f) => {
    try {
      const d = JSON.parse(await f.text());
      if (!window.confirm("Substituir os dados deste aparelho pelos do arquivo?")) return;
      setAulas(d.aulas || []); setGlossario(d.glossario || GLOSSARIO_INICIAL); setIgnorados(d.ignorados || []);
    } catch { window.alert("Esse arquivo não é um backup do caderno."); }
  };

  if (!pronto) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 360, color: C.faint, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Loader2 size={18} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Abrindo o caderno
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>;
  }

  const aberta = aulas.find((a) => a.id === abertaId);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif", color: C.ink, background: C.bg, padding: "20px 18px", borderRadius: 18 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .rot-tab:hover{background:#F3F2EF}
        .rot-row:hover{border-color:${C.line2}}
        .rot-btn:hover{background:#F3F2EF}
        input,textarea,select,button{font-family:inherit}
        input:focus,textarea:focus,select:focus{border-color:${C.accent}}
        button:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
        @media (prefers-reduced-motion: reduce){*{animation:none!important}}
      `}</style>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Drum size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: -0.2 }}>Caderno da Umbanda</div>
            <div style={{ fontSize: 12.5, color: C.sub }}>Curso de desenvolvimento mediúnico</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="rot-btn" style={iconBtn} title="Baixar backup" onClick={exportar}><Download size={15} /></button>
          <button className="rot-btn" style={iconBtn} title="Restaurar backup" onClick={() => importarRef.current.click()}><Upload size={15} /></button>
          <input ref={importarRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && importar(e.target.files[0])} />
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 3, marginBottom: 18, background: "#F3F2EF", padding: 4, borderRadius: 12, overflowX: "auto" }}>
        {TABS.map((t) => {
          const Ic = t.icon; const on = tab === t.id;
          return (
            <button key={t.id} className="rot-tab" onClick={() => { setTab(t.id); setAbertaId(null); }}
              style={{ flex: "1 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: on ? C.surface : "transparent", color: on ? C.ink : C.sub, fontWeight: on ? 500 : 400, fontSize: 13,
                boxShadow: on ? "0 1px 3px rgba(0,0,0,0.07)" : "none" }}>
              <Ic size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div key={tab + (abertaId || "")} style={{ animation: "fade .25s ease" }}>
        {tab === "aulas" && !aberta && (
          <ListaAulas aulas={aulas} glossario={glossario}
            onCriar={(a) => { setAulas((x) => [a, ...x]); setAbertaId(a.id); }}
            onAbrir={setAbertaId} />
        )}
        {tab === "aulas" && aberta && (
          <Aula aula={aberta} glossario={glossario} ignorados={ignorados}
            onVoltar={() => setAbertaId(null)}
            onMudar={(p) => atualizarAula(aberta.id, p)}
            onAprender={aprender}
            onIgnorar={(w) => setIgnorados((x) => [...x, w])}
            onExcluir={() => { if (window.confirm("Excluir esta aula?")) { setAulas((x) => x.filter((a) => a.id !== aberta.id)); setAbertaId(null); } }} />
        )}
        {tab === "glossario" && <Glossario glossario={glossario} setGlossario={setGlossario} />}
        {tab === "treino" && <Treino glossario={glossario} setGlossario={setGlossario} />}
        {tab === "perguntas" && <Perguntas aulas={aulas} onAbrir={(id) => { setTab("aulas"); setAbertaId(id); }} />}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 28, fontSize: 11.5, color: C.faint }}>
        <ShieldCheck size={13} /> Áudios, aulas e glossário ficam só neste aparelho
      </div>
    </div>
  );
}

/* ---------- Aulas ---------- */

function ListaAulas({ aulas, glossario, onCriar, onAbrir }) {
  const [nova, setNova] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Aulas</div>
        {!nova && <button style={btn} onClick={() => setNova(true)}><Plus size={15} /> Nova aula</button>}
      </div>
      {nova && <NovaAula glossario={glossario} onCancelar={() => setNova(false)} onCriar={(a) => { setNova(false); onCriar(a); }} />}
      {aulas.length === 0 && !nova && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.faint, fontSize: 13.5 }}>
          Adicione a primeira aula com o áudio gravado ou colando a transcrição.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {aulas.map((a) => {
          const indexada = a.indice && a.indice.hash === hash(a.texto);
          return (
            <div key={a.id} className="rot-row" onClick={() => onAbrir(a.id)}
              style={{ ...card, padding: "13px 15px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5 }}>{a.titulo}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Tag>{dataBR(a.data)}</Tag>
                  <Tag>{palavras(a.texto)} palavras</Tag>
                  {indexada && <Tag cor={C.accent} fundo={C.accentSoft}>Pronta para perguntas</Tag>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ children, cor = C.sub, fundo = "#F3F2EF" }) {
  return <span style={{ fontSize: 11.5, color: cor, background: fundo, padding: "2px 8px", borderRadius: 6 }}>{children}</span>;
}

function NovaAula({ glossario, onCriar, onCancelar }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(hoje());
  const [modo, setModo] = useState("audio");
  const [texto, setTexto] = useState("");
  const [qualidade, setQualidade] = useState("preciso");
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState(null);

  const criar = (bruto) => {
    const { texto: corrigido, total } = aplicarGlossario(bruto, glossario);
    onCriar({ id: uid(), titulo: titulo.trim() || `Aula de ${dataBR(data)}`, data, texto: corrigido, bruto, notas: "", corrigidasAuto: total, indice: null });
  };

  const rodar = async () => {
    setErro("");
    try {
      setStatus({ msg: "Lendo o áudio" });
      const audio = await lerAudio(arquivo);
      const min = Math.round(audio.length / 16000 / 60);
      setStatus({ msg: `Preparando ${min} min de áudio` });
      const t = await transcrever(audio, qualidade, (p) => {
        if (p.tipo === "download") setStatus({ msg: `${p.etapa} (${p.pct}%)`, sub: "Só na primeira vez. Depois fica salvo no navegador." });
        if (p.tipo === "parcial") setStatus({ msg: `Transcrevendo ${p.feito} de ${p.total} trechos`, pct: p.feito / p.total, previa: p.texto.slice(-240) });
      });
      criar(t);
    } catch (e) {
      setStatus(null);
      setErro(`Não consegui transcrever: ${e.message}. Tente outro formato (mp3, m4a ou wav) ou cole o texto.`);
    }
  };

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 10, marginBottom: 12 }}>
        <div><span style={label}>Título</span><input style={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Aula 1, a curimba" /></div>
        <div><span style={label}>Data</span><input style={input} type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["audio", "Transcrever áudio"], ["texto", "Colar texto"]].map(([id, l]) => (
          <button key={id} onClick={() => setModo(id)} style={{ ...btn2, background: modo === id ? C.accentSoft : "#fff", color: modo === id ? C.accent : C.ink, borderColor: modo === id ? "#D9D6F5" : C.line }}>{l}</button>
        ))}
      </div>

      {modo === "audio" ? (
        <>
          <label style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: "14px", cursor: "pointer", borderStyle: "dashed", marginBottom: 10 }}>
            <FileAudio size={18} color={C.sub} />
            <span style={{ fontSize: 13.5, color: arquivo ? C.ink : C.sub }}>{arquivo ? arquivo.name : "Escolher a gravação (m4a, mp3, wav)"}</span>
            <input type="file" accept="audio/*" hidden onChange={(e) => setArquivo(e.target.files[0] || null)} />
          </label>
          <span style={label}>Modelo</span>
          <select style={{ ...input, marginBottom: 12 }} value={qualidade} onChange={(e) => setQualidade(e.target.value)}>
            <option value="preciso">Preciso (melhor para português, mais lento)</option>
            <option value="rapido">Rápido (bom para testar)</option>
          </select>
        </>
      ) : (
        <textarea style={{ ...input, minHeight: 160, lineHeight: 1.55, marginBottom: 12 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui a transcrição da aula" />
      )}

      {status && (
        <div style={{ ...card, padding: 12, marginBottom: 12, background: "#F7F7F5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> {status.msg}
          </div>
          {status.sub && <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{status.sub}</div>}
          {status.pct != null && <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 10 }}><div style={{ height: 4, width: `${status.pct * 100}%`, background: C.accent, borderRadius: 4, transition: "width .3s" }} /></div>}
          {status.previa && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>…{status.previa}</div>}
        </div>
      )}
      {erro && <div style={{ ...card, padding: 12, marginBottom: 12, background: "#FBEAF1", borderColor: "#F2D2DF", fontSize: 13, color: "#8A2E4E" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={btn2} onClick={onCancelar} disabled={!!status}>Cancelar</button>
        {modo === "audio"
          ? <button style={{ ...btn, opacity: !arquivo || status ? 0.5 : 1 }} disabled={!arquivo || !!status} onClick={rodar}><Wand2 size={15} /> Transcrever</button>
          : <button style={{ ...btn, opacity: texto.trim() ? 1 : 0.5 }} disabled={!texto.trim()} onClick={() => criar(texto)}><Check size={15} /> Salvar aula</button>}
      </div>
    </div>
  );
}

function Aula({ aula, glossario, ignorados, onVoltar, onMudar, onAprender, onIgnorar, onExcluir }) {
  const [errado, setErrado] = useState("");
  const [certo, setCerto] = useState("");
  const [aviso, setAviso] = useState(aula.corrigidasAuto ? `${aula.corrigidasAuto} termos corrigidos automaticamente pelo glossário.` : "");
  const [indexando, setIndexando] = useState(null);

  const sugestoes = useMemo(() => sugerir(aula.texto, glossario, ignorados), [aula.texto, glossario, ignorados]);
  const indexada = aula.indice && aula.indice.hash === hash(aula.texto);

  const corrigir = (e, c) => {
    const r = substituir(aula.texto, e, c);
    onMudar({ texto: r.texto });
    onAprender(e, c);
    setAviso(`"${e}" virou "${c}" em ${r.n} ${r.n === 1 ? "lugar" : "lugares"}. Vou corrigir sozinha nas próximas aulas.`);
  };

  const reaplicar = () => {
    const r = aplicarGlossario(aula.texto, glossario);
    onMudar({ texto: r.texto });
    setAviso(r.total ? `${r.total} termos corrigidos pelo glossário.` : "Nada para corrigir com o glossário atual.");
  };

  const indexar = async () => {
    try {
      const ts = trechos(aula.texto);
      setIndexando("Preparando");
      const vs = await vetorizar(ts, (p) => {
        if (p.tipo === "download") setIndexando(`${p.etapa} (${p.pct}%)`);
        if (p.tipo === "parcial") setIndexando(`Lendo trecho ${p.feito} de ${p.total}`);
      });
      onMudar({ indice: { hash: hash(aula.texto), trechos: ts, vetores: vs } });
      setAviso("Aula pronta para a aba Perguntas.");
    } catch (e) {
      setAviso(`Não consegui preparar a busca: ${e.message}`);
    }
    setIndexando(null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button className="rot-btn" style={iconBtn} onClick={onVoltar} title="Voltar"><ChevronLeft size={16} /></button>
        <input value={aula.titulo} onChange={(e) => onMudar({ titulo: e.target.value })}
          style={{ ...input, border: "none", background: "transparent", fontSize: 16, fontWeight: 500, padding: "4px 0", flex: 1 }} />
        <button className="rot-btn" style={iconBtn} onClick={onExcluir} title="Excluir aula"><Trash2 size={15} color="#8A2E4E" /></button>
      </div>

      {aviso && (
        <div style={{ ...card, padding: "10px 14px", marginBottom: 12, background: C.accentSoft, borderColor: "#D9D6F5", fontSize: 13, color: C.accent, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.accent, padding: 0 }}><X size={14} /></button>
        </div>
      )}

      {sugestoes.length > 0 && (
        <div style={{ ...dica, flexDirection: "column", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, fontWeight: 500 }}><Lightbulb size={15} style={{ flexShrink: 0, marginTop: 2 }} /> Possíveis erros de transcrição</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sugestoes.map((s) => (
              <div key={s.errado} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 160 }}>
                  <s style={{ opacity: 0.7 }}>{s.errado}</s> para <b style={{ fontWeight: 500 }}>{s.certo}</b>
                  <span style={{ opacity: 0.6 }}> ({s.n}×)</span>
                </span>
                <button style={{ ...btn, padding: "5px 10px", fontSize: 12 }} onClick={() => corrigir(s.errado, s.certo)}><Check size={13} /> Corrigir</button>
                <button style={{ ...btn2, padding: "5px 10px", fontSize: 12 }} onClick={() => onIgnorar(s.errado)}>Está certo</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <span style={label}>Ensinar uma correção</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...input, flex: "1 1 140px" }} placeholder="Como saiu" value={errado} onChange={(e) => setErrado(e.target.value)} />
          <input style={{ ...input, flex: "1 1 140px" }} placeholder="Como é o certo" list="termos" value={certo} onChange={(e) => setCerto(e.target.value)} />
          <datalist id="termos">{glossario.map((g) => <option key={g.id} value={g.termo} />)}</datalist>
          <button style={{ ...btn, opacity: errado && certo ? 1 : 0.5 }} disabled={!errado || !certo}
            onClick={() => { corrigir(errado, certo); setErrado(""); setCerto(""); }}><Check size={15} /> Corrigir</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <button style={btn2} className="rot-btn" onClick={reaplicar}><Wand2 size={15} /> Aplicar glossário</button>
        <button style={btn2} className="rot-btn" onClick={indexar} disabled={!!indexando}>
          {indexando ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />}
          {indexando || (indexada ? "Pronta para perguntas" : "Preparar para perguntas")}
        </button>
      </div>

      <span style={label}>Transcrição ({palavras(aula.texto)} palavras). Pode editar direto.</span>
      <textarea style={{ ...input, minHeight: 320, lineHeight: 1.6, fontSize: 14, marginBottom: 14 }}
        value={aula.texto} onChange={(e) => onMudar({ texto: e.target.value })} />

      <span style={label}>Minhas anotações</span>
      <textarea style={{ ...input, minHeight: 110, lineHeight: 1.55 }} placeholder="O que ficou de dúvida, o que sentir, o que perguntar para a dirigente"
        value={aula.notas} onChange={(e) => onMudar({ notas: e.target.value })} />
    </div>
  );
}

/* ---------- Glossário ---------- */

function Glossario({ glossario, setGlossario }) {
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState({ termo: "", significado: "" });
  const [editando, setEditando] = useState(null);

  const lista = glossario
    .filter((g) => !busca || semAcento(g.termo + " " + g.significado).includes(semAcento(busca)))
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));

  const mudar = (id, p) => setGlossario((g) => g.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Glossário</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>{glossario.length} termos</div>
      </div>

      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <span style={label}>Novo termo</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...input, flex: "1 1 140px" }} placeholder="Termo" value={novo.termo} onChange={(e) => setNovo({ ...novo, termo: e.target.value })} />
          <input style={{ ...input, flex: "2 1 220px" }} placeholder="O que significa, nas palavras da casa" value={novo.significado} onChange={(e) => setNovo({ ...novo, significado: e.target.value })} />
          <button style={{ ...btn, opacity: novo.termo.trim() ? 1 : 0.5 }} disabled={!novo.termo.trim()}
            onClick={() => { setGlossario((g) => [...g, { id: uid(), termo: novo.termo.trim(), significado: novo.significado.trim(), variantes: [], acertos: 0, erros: 0 }]); setNovo({ termo: "", significado: "" }); }}>
            <Plus size={15} /> Adicionar
          </button>
        </div>
      </div>

      <input style={{ ...input, marginBottom: 12 }} placeholder="Buscar no glossário" value={busca} onChange={(e) => setBusca(e.target.value)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((g) => (
          <div key={g.id} className="rot-row" style={{ ...card, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>{g.termo}</div>
                {editando === g.id ? (
                  <textarea autoFocus style={{ ...input, marginTop: 6, minHeight: 64, fontSize: 13.5 }} value={g.significado}
                    onChange={(e) => mudar(g.id, { significado: e.target.value })} onBlur={() => setEditando(null)} />
                ) : (
                  <div style={{ fontSize: 13.5, color: g.significado ? C.sub : C.faint, marginTop: 3, lineHeight: 1.5 }}>{g.significado || "Sem significado ainda"}</div>
                )}
                {g.variantes?.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: C.faint }}>Corrige:</span>
                    {g.variantes.map((v) => (
                      <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#7A4E18", background: "#FAF0E4", padding: "2px 4px 2px 8px", borderRadius: 6 }}>
                        {v}
                        <button title="Remover" onClick={() => mudar(g.id, { variantes: g.variantes.filter((x) => x !== v) })}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "#7A4E18" }}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="rot-btn" style={{ ...iconBtn, width: 30, height: 30, border: "none" }} title="Editar significado" onClick={() => setEditando(g.id)}><Pencil size={14} /></button>
              <button className="rot-btn" style={{ ...iconBtn, width: 30, height: 30, border: "none" }} title="Excluir"
                onClick={() => window.confirm(`Excluir "${g.termo}"?`) && setGlossario((x) => x.filter((y) => y.id !== g.id))}><Trash2 size={14} color={C.faint} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Treino ---------- */

function Treino({ glossario, setGlossario }) {
  const elegiveis = glossario.filter((g) => g.significado);
  const [atualId, setAtualId] = useState(null);
  const [virada, setVirada] = useState(false);
  const [sentido, setSentido] = useState("termo");
  const [sessao, setSessao] = useState({ ok: 0, total: 0 });

  // Repetição espaçada simples: os termos que você mais erra aparecem mais.
  const sortear = (excluir) => {
    const pool = elegiveis.filter((g) => g.id !== excluir);
    if (!pool.length) return elegiveis[0]?.id || null;
    const pesos = pool.map((g) => Math.max(1, 3 + (g.erros || 0) * 2 - (g.acertos || 0)));
    let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= pesos[i]; if (r <= 0) return pool[i].id; }
    return pool[pool.length - 1].id;
  };

  useEffect(() => { if (!atualId && elegiveis.length) setAtualId(sortear()); }, [elegiveis.length]);

  const atual = glossario.find((g) => g.id === atualId);

  const responder = (sabia) => {
    setGlossario((g) => g.map((x) => x.id === atualId ? { ...x, acertos: (x.acertos || 0) + (sabia ? 1 : 0), erros: (x.erros || 0) + (sabia ? 0 : 1) } : x));
    setSessao((s) => ({ ok: s.ok + (sabia ? 1 : 0), total: s.total + 1 }));
    setVirada(false);
    setAtualId(sortear(atualId));
  };

  if (!elegiveis.length) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: C.faint, fontSize: 13.5 }}>Escreva o significado de alguns termos no glossário para começar a treinar.</div>;
  }

  const frente = sentido === "termo" ? atual?.termo : atual?.significado;
  const verso = sentido === "termo" ? atual?.significado : atual?.termo;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Treino</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>{sessao.total ? `${sessao.ok} de ${sessao.total} nesta rodada` : `${elegiveis.length} termos para treinar`}</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["termo", "Do termo ao significado"], ["significado", "Do significado ao termo"]].map(([id, l]) => (
          <button key={id} onClick={() => { setSentido(id); setVirada(false); }} style={{ ...btn2, fontSize: 12.5, padding: "7px 12px", background: sentido === id ? C.accentSoft : "#fff", color: sentido === id ? C.accent : C.ink, borderColor: sentido === id ? "#D9D6F5" : C.line }}>{l}</button>
        ))}
      </div>

      {atual && (
        <div style={{ ...card, padding: "36px 24px", textAlign: "center", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          <div style={{ fontSize: sentido === "termo" ? 24 : 16, fontWeight: 500, lineHeight: 1.4, letterSpacing: sentido === "termo" ? -0.3 : 0 }}>{frente}</div>
          {virada
            ? <div key="v" style={{ fontSize: 15, color: C.sub, lineHeight: 1.55, animation: "fade .2s ease" }}>{verso}</div>
            : <div><button style={btn2} onClick={() => setVirada(true)}>Mostrar resposta</button></div>}
        </div>
      )}

      {virada && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ ...btn2, flex: 1, justifyContent: "center", background: "#FBEAF1", borderColor: "#F2D2DF", color: "#8A2E4E" }} onClick={() => responder(false)}>Ainda não sabia</button>
          <button style={{ ...btn, flex: 1, justifyContent: "center", background: "#0E7C61" }} onClick={() => responder(true)}><Check size={15} /> Sabia</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Perguntas ---------- */

function Perguntas({ aulas, onAbrir }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [carregando, setCarregando] = useState(null);

  const indexadas = aulas.filter((a) => a.indice && a.indice.hash === hash(a.texto));

  const buscar = async () => {
    if (!q.trim()) return;
    const itens = [];
    if (indexadas.length) {
      setCarregando("Entendendo a pergunta");
      try {
        const [vq] = await vetorizar([q], (p) => p.tipo === "download" && setCarregando(`${p.etapa} (${p.pct}%)`));
        for (const a of indexadas) a.indice.trechos.forEach((t, i) => itens.push({ aula: a, t, s: cosseno(vq, a.indice.vetores[i]) }));
      } catch (e) { setCarregando(null); setRes({ erro: e.message }); return; }
    }
    // Aulas ainda não preparadas entram pela busca por palavras.
    for (const a of aulas.filter((x) => !indexadas.includes(x))) {
      trechos(a.texto).forEach((t) => { const s = buscaPalavras(q, t); if (s > 0) itens.push({ aula: a, t, s: s * 0.6 }); });
    }
    setCarregando(null);
    setRes({ itens: itens.sort((a, b) => b.s - a.s).slice(0, 5) });
  };

  const destacar = (t) => {
    const ws = (semAcento(q).match(/[a-z]{4,}/g) || []);
    if (!ws.length) return t;
    return t.split(/(\s+)/).map((p, i) => ws.some((w) => semAcento(p).includes(w))
      ? <mark key={i} style={{ background: "#FAF0E4", color: "inherit", borderRadius: 3 }}>{p}</mark> : p);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Perguntas</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>{indexadas.length} de {aulas.length} aulas preparadas</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...input, flex: 1 }} placeholder="Ex.: como cuidar do couro do atabaque?" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button style={btn} onClick={buscar} disabled={!!carregando}>
          {carregando ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />} Buscar
        </button>
      </div>

      {!res && !carregando && (
        <div style={dica}>
          <Lightbulb size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>A resposta vem das próprias aulas: aparecem os trechos em que o assunto foi falado, com o nome da aula. Para a busca entender o sentido e não só as palavras, abra a aula e toque em Preparar para perguntas.</span>
        </div>
      )}
      {carregando && <div style={{ fontSize: 13, color: C.sub, display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {carregando}</div>}
      {res?.erro && <div style={{ ...card, padding: 12, background: "#FBEAF1", borderColor: "#F2D2DF", fontSize: 13, color: "#8A2E4E" }}>Não consegui buscar: {res.erro}</div>}
      {res?.itens && res.itens.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", color: C.faint, fontSize: 13.5 }}>Nenhuma aula fala disso ainda. Vale anotar como dúvida para levar à casa.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {res?.itens?.map((it, i) => (
          <div key={i} className="rot-row" style={{ ...card, padding: "13px 15px", cursor: "pointer" }} onClick={() => onAbrir(it.aula.id)}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <Tag cor={C.accent} fundo={C.accentSoft}>{it.aula.titulo}</Tag>
              <Tag>{dataBR(it.aula.data)}</Tag>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.ink }}>…{destacar(it.t)}…</div>
          </div>
        ))}
      </div>
    </div>
  );
}
