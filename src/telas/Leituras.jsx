import React, { useEffect, useState } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, FileText, Lock } from "lucide-react";
import { fontes } from "../api";
import { prepararBusca } from "../indexar";
import { C, SERIF, card, iconBtn, btn, btn2, input, label, dica, erroBox, Tag, Carregando, Vazio, Aviso, Titulo, Escolha } from "../ui";
import { Leitura } from "./Leitor";
import { lembrarFonte } from "./Inicio";
import { Notas, BotaoPreparar } from "./Comum";
import { Progresso } from "./Aulas";

const VIS = [["todos", "Todas as pessoas aprovadas"], ["privada", "Só eu"]];

export function Leituras({ ctx, abertaId, setAbertaId }) {
  const [lista, setLista] = useState(null);
  const [nova, setNova] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { if (!abertaId) fontes.listar("leitura").then(setLista).catch((e) => setErro(e.message)); }, [abertaId]);

  if (abertaId) return <DetalheLeitura id={abertaId} ctx={ctx} onVoltar={() => setAbertaId(null)} />;

  return (
    <div>
      <Titulo sub="Livros, apostilas e textos de apoio." direita={ctx.podeEditar && !nova && <button style={btn} onClick={() => setNova(true)}><Plus size={15} /> Nova leitura</button>}>Leituras</Titulo>
      {nova && <NovaLeitura onCancelar={() => setNova(false)} onCriada={(id) => { setNova(false); setAbertaId(id); }} />}
      {erro && <div style={erroBox}>{erro}</div>}
      {!lista && !erro && <Carregando />}
      {lista?.length === 0 && !nova && (
        <Vazio>{ctx.podeEditar ? "Adicione livros, apostilas e textos de apoio do curso em PDF ou texto." : "Ainda não tem nenhuma leitura aqui."}</Vazio>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista?.map((l) => (
          <button key={l.id} className="rot-row" onClick={() => setAbertaId(l.id)}
            style={{ ...card, padding: "14px 16px", cursor: "pointer", textAlign: "left", color: C.ink, display: "flex", gap: 14, alignItems: "center", width: "100%" }}>
            <span style={{ width: 6, alignSelf: "stretch", borderRadius: 3, background: C.folha, opacity: 0.7 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: SERIF, fontSize: 17 }}>{l.titulo}</span>
              {l.autor && <span style={{ fontSize: 13, color: C.sub }}>{l.autor}</span>}
            </span>
            {l.visibilidade === "privada" && <Tag cor="#6B4A14" fundo={C.ouroSoft}>Só eu</Tag>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NovaLeitura({ onCriada, onCancelar }) {
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [vis, setVis] = useState("todos");
  const [modo, setModo] = useState("pdf");
  const [arquivo, setArquivo] = useState(null);
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");

  const escolher = (f) => {
    setArquivo(f);
    if (f && !titulo) setTitulo(f.name.replace(/\.(pdf|txt|md)$/i, ""));
  };

  const salvar = async () => {
    setErro("");
    try {
      let paginas = null, corpo = texto;
      if (modo === "pdf") {
        setStatus({ msg: "Lendo o PDF" });
        const { lerPdf } = await import("../pdf");
        const r = await lerPdf(arquivo, (i, n) => setStatus({ msg: `Lendo página ${i} de ${n}`, pct: i / n }));
        if (r.escaneado) {
          setStatus(null);
          return setErro("Esse PDF parece ser imagem escaneada, sem texto selecionável. Ele precisa passar por OCR antes (o próprio Google Drive faz isso ao abrir o PDF como Google Docs).");
        }
        paginas = r.paginas; corpo = r.paginas.join("\n\n");
      }
      if (modo === "txt") corpo = await arquivo.text();
      setStatus({ msg: "Salvando" });
      const f = await fontes.criar({ tipo: "leitura", titulo: titulo.trim(), autor: autor.trim() || null, texto: corpo, paginas, visibilidade: vis });
      try { await prepararBusca(f.id, (m) => setStatus({ msg: m, sub: "Preparando para a aba Perguntas. Em livros grandes leva alguns minutos." })); } catch { /* dá para preparar depois */ }
      onCriada(f.id);
    } catch (e) {
      setStatus(null);
      setErro(`Não consegui salvar: ${e.message}`);
    }
  };

  const pode = titulo.trim() && (modo === "colar" ? texto.trim() : arquivo);

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 10, marginBottom: 12 }}>
        <div><span style={label}>Título</span><input style={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
        <div><span style={label}>Autor</span><input style={input} value={autor} onChange={(e) => setAutor(e.target.value)} /></div>
      </div>

      <span style={label}>Quem pode ver</span>
      <div style={{ marginBottom: 8 }}><Escolha pequeno valor={vis} onMudar={setVis} opcoes={VIS} /></div>
      <div style={{ ...dica, marginBottom: 14, fontSize: 12.5 }}>
        <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Livros com direitos autorais são para estudo pessoal. Para esses, prefira Só eu. Apostilas da casa e textos liberados podem ir para todos.</span>
      </div>

      <span style={label}>Conteúdo</span>
      <div style={{ marginBottom: 12 }}><Escolha pequeno valor={modo} onMudar={(m) => { setModo(m); setArquivo(null); }} opcoes={[["pdf", "PDF"], ["txt", "Arquivo de texto"], ["colar", "Colar texto"]]} /></div>

      {modo === "colar" ? (
        <textarea style={{ ...input, minHeight: 160, lineHeight: 1.55, marginBottom: 12 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o texto" />
      ) : (
        <label style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: 14, cursor: "pointer", borderStyle: "dashed", marginBottom: 12 }}>
          <FileText size={18} color={C.sub} />
          <span style={{ fontSize: 13.5, color: arquivo ? C.ink : C.sub }}>{arquivo ? arquivo.name : modo === "pdf" ? "Escolher o PDF" : "Escolher o arquivo .txt"}</span>
          <input type="file" hidden accept={modo === "pdf" ? "application/pdf" : ".txt,.md,text/plain"} onChange={(e) => escolher(e.target.files[0] || null)} />
        </label>
      )}

      {status && <Progresso status={status} />}
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={btn2} onClick={onCancelar} disabled={!!status}>Cancelar</button>
        <button style={{ ...btn, opacity: pode && !status ? 1 : 0.5 }} disabled={!pode || !!status} onClick={salvar}><Check size={15} /> Salvar leitura</button>
      </div>
    </div>
  );
}

function DetalheLeitura({ id, ctx, onVoltar }) {
  const [fonte, setFonte] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    fontes.obter(id).then((f) => { setFonte(f); setPagina(ctx.paginaInicial || 1); }).catch((e) => setErro(e.message));
  }, [id]);
  useEffect(() => { if (fonte) lembrarFonte(fonte, Array.isArray(fonte.paginas) ? pagina : null); }, [fonte?.id, pagina]);

  if (erro) return <div style={erroBox}>{erro}</div>;
  if (!fonte) return <Carregando />;

  const paginas = Array.isArray(fonte.paginas) && fonte.paginas.length ? fonte.paginas : null;
  const total = paginas?.length || 1;
  const p = Math.min(Math.max(pagina, 1), total);
  const texto = paginas ? paginas[p - 1] : fonte.texto;
  const ehDono = fonte.criado_por === ctx.perfil.id;

  const mudarVis = async (v) => {
    try { await fontes.atualizar(fonte.id, { visibilidade: v }); setFonte({ ...fonte, visibilidade: v }); } catch (e) { setAviso(e.message); }
  };
  const excluir = async () => {
    if (!window.confirm("Excluir esta leitura?")) return;
    try { await fontes.excluir(fonte.id); onVoltar(); } catch (e) { setAviso(`Não consegui excluir: ${e.message}`); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button className="rot-btn" style={iconBtn} onClick={onVoltar} title="Voltar"><ChevronLeft size={16} /></button>
        <div style={{ flex: 1 }} />
        {ctx.podeEditar && <button className="rot-btn" style={iconBtn} onClick={excluir} aria-label="Excluir leitura"><Trash2 size={15} color={C.erro} /></button>}
      </div>
      <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, margin: "0 0 4px", letterSpacing: -0.4, lineHeight: 1.2 }}>{fonte.titulo}</h1>
      {fonte.autor && <div style={{ fontSize: 13.5, color: C.sub, marginBottom: 16 }}>{fonte.autor}</div>}

      <Aviso onFechar={() => setAviso("")}>{aviso}</Aviso>

      {ctx.podeEditar && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <BotaoPreparar fonte={fonte} onPronto={() => { setFonte({ ...fonte, indexada: true }); setAviso("Leitura pronta para a aba Perguntas."); }} onErro={setAviso} />
          {ehDono && <Escolha pequeno valor={fonte.visibilidade} onMudar={mudarVis} opcoes={VIS} />}
        </div>
      )}

      <div style={{ ...card, padding: "22px 22px", marginBottom: 12, minHeight: 240 }}>
        {texto ? <Leitura key={p} texto={texto} ctx={ctx} fonte={fonte} pagina={paginas ? p : null} /> : <span style={{ color: C.faint }}>Página sem texto.</span>}
      </div>

      {paginas && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18 }}>
          <button className="rot-btn" style={iconBtn} disabled={p <= 1} onClick={() => setPagina(p - 1)} title="Página anterior"><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 13, color: C.sub }}>Página</span>
          <input type="number" min={1} max={total} value={p} onChange={(e) => setPagina(Number(e.target.value) || 1)} style={{ ...input, width: 70, textAlign: "center", padding: "7px 8px" }} />
          <span style={{ fontSize: 13, color: C.sub }}>de {total}</span>
          <button className="rot-btn" style={iconBtn} disabled={p >= total} onClick={() => setPagina(p + 1)} title="Próxima página"><ChevronRight size={16} /></button>
        </div>
      )}

      <Notas fonteId={fonte.id} />
    </div>
  );
}
