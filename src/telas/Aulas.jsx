import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronLeft, Check, Wand2, Lightbulb, FileAudio, Save, Repeat, Sparkles, Pencil, Combine } from "lucide-react";
import { fontes } from "../api";
import { prepararBusca } from "../indexar";
import { aplicarGlossario, sugerir, substituir } from "../corretor";
import { lerAudio, transcrever } from "../ml/cliente";
import { tirarRepeticoes } from "../ml/limpeza";
import { C, SERIF, card, iconBtn, btn, btn2, input, label, dica, erroBox, Tag, Girando, Carregando, Vazio, Aviso, Titulo, Escolha, hoje, dataBR, palavras } from "../ui";
import { Leitura } from "./Leitor";
import { lembrarFonte } from "./Inicio";
import { Notas, BotaoPreparar } from "./Comum";

export function Aulas({ ctx, abertaId, setAbertaId }) {
  const [lista, setLista] = useState(null);
  const [nova, setNova] = useState(false);
  const [erro, setErro] = useState("");

  const [juntando, setJuntando] = useState(null);
  const carregar = () => fontes.listar("aula").then(setLista).catch((e) => setErro(e.message));
  useEffect(() => { if (!abertaId) carregar(); }, [abertaId]);

  const juntar = async (dia, ordem) => {
    if (!window.confirm(`Juntar as ${ordem.length} gravações de ${dataBR(dia)} numa aula só? Elas viram partes da mesma transcrição, na ordem em que foram criadas. Destaques, respostas e anotações são mantidos. A versão de estudo precisa ser gerada de novo.`)) return;
    setJuntando(dia); setErro("");
    try { await fontes.juntar(ordem[0].id, ordem.slice(1).map((a) => a.id)); await carregar(); }
    catch (e) { setErro(e.message); }
    setJuntando(null);
  };

  if (abertaId) return <DetalheAula id={abertaId} ctx={ctx} onVoltar={() => setAbertaId(null)} />;

  return (
    <div>
      <Titulo sub="O que a casa ensinou, aula por aula." direita={ctx.podeEditar && !nova && <button style={btn} onClick={() => setNova(true)}><Plus size={15} /> Nova aula</button>}>Aulas</Titulo>
      {nova && <NovaAula ctx={ctx} lista={lista || []} onCancelar={() => setNova(false)} onCriada={(id) => { setNova(false); setAbertaId(id); }} />}
      {erro && <div style={erroBox}>{erro}</div>}
      {!lista && !erro && <Carregando />}
      {lista?.length === 0 && !nova && (
        <Vazio>{ctx.podeEditar ? "Adicione a primeira aula com o áudio gravado ou colando a transcrição." : "Ainda não tem nenhuma aula aqui."}</Vazio>
      )}
      {Object.entries((lista || []).reduce((acc, a) => { (acc[a.data || "sem data"] = acc[a.data || "sem data"] || []).push(a); return acc; }, {}))
        .map(([dia, aulas]) => {
          const ordem = [...aulas].sort((x, y) => (x.criado_em || "").localeCompare(y.criado_em || ""));
          return (
            <section key={dia} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, color: C.accent }}>{dia === "sem data" ? "Sem data" : dataExtenso(dia)}</div>
                {ctx.podeEditar && aulas.length > 1 && (
                  <button style={{ ...btn2, padding: "5px 10px", fontSize: 12.5 }} disabled={juntando === dia} onClick={() => juntar(dia, ordem)}>
                    {juntando === dia ? <Girando size={13} /> : <Combine size={13} />} Juntar em uma aula
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ordem.map((a) => (
                  <button key={a.id} className="rot-row" onClick={() => setAbertaId(a.id)}
                    style={{ ...card, padding: "14px 16px", cursor: "pointer", textAlign: "left", color: C.ink, display: "block", width: "100%" }}>
                    <span style={{ display: "block", fontFamily: SERIF, fontSize: 17 }}>{a.titulo}</span>
                    {!a.indexada && ctx.podeEditar && <span style={{ fontSize: 12, color: C.faint }}>Busca por sentido ainda não preparada</span>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

const dataExtenso = (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export function NovaAula({ ctx, onCriada, onCancelar, lista = [], somarEm = null }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(hoje());
  const doDia = somarEm ? [somarEm] : lista.filter((a) => a.data === data);
  const [destino, setDestino] = useState("auto");
  const alvo = somarEm ? somarEm.id : destino === "auto" ? (doDia[0]?.id || "nova") : destino;
  const [modo, setModo] = useState("audio");
  const [texto, setTexto] = useState("");
  const [qualidade, setQualidade] = useState("gpu" in navigator ? "maxima" : "preciso");
  const [arquivo, setArquivo] = useState(null);
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");

  const salvar = async (bruto) => {
    setStatus({ msg: "Salvando a aula" });
    const { texto: corrigido } = aplicarGlossario(bruto, ctx.glossario);
    if (alvo !== "nova") {
      const atual = await fontes.obter(alvo);
      await fontes.adicionarGravacao(atual, corrigido);
      try { await prepararBusca(alvo, (m) => setStatus({ msg: m, sub: "Atualizando a busca da aula" })); } catch { /* dá para preparar depois */ }
      return onCriada(alvo, true);
    }
    const f = await fontes.criar({ tipo: "aula", titulo: titulo.trim() || `Aula de ${dataBR(data)}`, data, texto: corrigido, visibilidade: "todos" });
    try { await prepararBusca(f.id, (m) => setStatus({ msg: m, sub: "Preparando a aula para a aba Perguntas" })); } catch { /* dá para preparar depois */ }
    onCriada(f.id);
  };

  const rodar = async () => {
    setErro("");
    try {
      if (modo === "texto") return await salvar(texto);
      setStatus({ msg: "Lendo o áudio" });
      const audio = await lerAudio(arquivo);
      const t = await transcrever(audio, qualidade, (p) => {
        if (p.tipo === "download") setStatus({ msg: `${p.etapa} (${p.pct}%)`, sub: "Só na primeira vez. Depois fica salvo no navegador." });
        if (p.tipo === "parcial") setStatus({ msg: `Transcrevendo ${p.feito} de ${p.total} trechos`, pct: p.feito / p.total, previa: p.texto.slice(-240) });
      });
      await salvar(t);
    } catch (e) {
      setStatus(null);
      setErro(modo === "audio" ? `Não consegui transcrever: ${e.message}` : `Não consegui salvar: ${e.message}`);
    }
  };

  const pode = modo === "audio" ? !!arquivo : !!texto.trim();

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      {somarEm ? (
        <div style={{ fontFamily: SERIF, fontSize: 16, marginBottom: 12 }}>Nova gravação para esta aula</div>
      ) : <>
        <div style={{ display: "grid", gridTemplateColumns: alvo === "nova" ? "minmax(0,1fr) 150px" : "150px", gap: 10, marginBottom: 12 }}>
          {alvo === "nova" && <div><span style={label}>Título</span><input style={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Aula 1, a curimba" /></div>}
          <div><span style={label}>Data</span><input style={input} type="date" value={data} onChange={(e) => { setData(e.target.value); setDestino("auto"); }} /></div>
        </div>
        {doDia.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={label}>Já existe aula nesse dia</span>
            <Escolha pequeno valor={alvo} onMudar={setDestino} opcoes={[...doDia.map((a) => [a.id, `Somar a "${a.titulo}"`]), ["nova", "Criar aula separada"]]} />
          </div>
        )}
      </>}
      <div style={{ marginBottom: 12 }}><Escolha valor={modo} onMudar={setModo} opcoes={[["audio", "Transcrever áudio"], ["texto", "Colar texto"]]} /></div>

      {modo === "audio" ? (
        <>
          <label style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: 14, cursor: "pointer", borderStyle: "dashed", marginBottom: 10 }}>
            <FileAudio size={18} color={C.sub} />
            <span style={{ fontSize: 13.5, color: arquivo ? C.ink : C.sub }}>{arquivo ? arquivo.name : "Escolher a gravação (m4a, mp3, wav)"}</span>
            <input type="file" accept="audio/*" hidden onChange={(e) => setArquivo(e.target.files[0] || null)} />
          </label>
          <span style={label}>Modelo</span>
          <select style={{ ...input, marginBottom: 12 }} value={qualidade} onChange={(e) => setQualidade(e.target.value)}>
            {"gpu" in navigator && <option value="maxima">Máxima (bem melhor, precisa de computador com Chrome ou Edge)</option>}
            <option value="preciso">Preciso (funciona em qualquer navegador)</option>
            <option value="rapido">Rápido (bom para testar)</option>
          </select>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 12, lineHeight: 1.5 }}>O áudio é transcrito no seu navegador e não é enviado para lugar nenhum. Só o texto é salvo.</div>
        </>
      ) : (
        <textarea style={{ ...input, minHeight: 160, lineHeight: 1.55, marginBottom: 12 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui a transcrição da aula" />
      )}

      {status && <Progresso status={status} />}
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button style={btn2} onClick={onCancelar} disabled={!!status}>Cancelar</button>
        <button style={{ ...btn, opacity: pode && !status ? 1 : 0.5 }} disabled={!pode || !!status} onClick={rodar}>
          {modo === "audio" ? <><Wand2 size={15} /> Transcrever e salvar</> : <><Check size={15} /> {alvo === "nova" ? "Salvar aula" : "Somar à aula"}</>}
        </button>
      </div>
    </div>
  );
}

export function Progresso({ status }) {
  return (
    <div style={{ ...card, padding: 12, marginBottom: 12, background: "#F7F7F5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><Girando /> {status.msg}</div>
      {status.sub && <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>{status.sub}</div>}
      {status.pct != null && (
        <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 10 }}>
          <div style={{ height: 4, width: `${status.pct * 100}%`, background: C.accent, borderRadius: 4, transition: "width .3s" }} />
        </div>
      )}
      {status.previa && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>…{status.previa}</div>}
    </div>
  );
}

function DetalheAula({ id, ctx, onVoltar }) {
  const [fonte, setFonte] = useState(null);
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState("ler");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [errado, setErrado] = useState("");
  const [certo, setCerto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [editEstudo, setEditEstudo] = useState(null);
  const [somando, setSomando] = useState(false);
  const [nivel, setNivel] = useState("completo");
  const recarregar = () => fontes.obter(id).then((f) => { setFonte(f); setTexto(f.texto); });

  useEffect(() => {
    fontes.obter(id).then((f) => { setFonte(f); setTexto(f.texto); setModo(f.estudo ? "estudo" : "ler"); lembrarFonte(f); }).catch((e) => setErro(e.message));
  }, [id]);

  const sujo = fonte && texto !== fonte.texto;
  const sugestoes = useMemo(() => (ctx.podeEditar && modo === "editar" ? sugerir(texto, ctx.glossario, ctx.ignorados) : []), [texto, ctx.glossario, ctx.ignorados, ctx.podeEditar, modo]);

  if (erro) return <div style={erroBox}>{erro}</div>;
  if (!fonte) return <Carregando />;

  const gravar = async (novo, msg) => {
    setSalvando(true);
    try { const f = await fontes.salvarTexto(fonte, novo); setFonte(f); setTexto(f.texto); if (msg) setAviso(msg); }
    catch (e) { setAviso(`Não consegui salvar: ${e.message}`); }
    setSalvando(false);
  };

  const corrigir = async (e, c) => {
    const r = substituir(texto, e, c);
    await gravar(r.texto, `"${e}" virou "${c}" em ${r.n} ${r.n === 1 ? "lugar" : "lugares"}. Nas próximas aulas a correção é automática.`);
    await ctx.aprender(e, c);
  };

  const reaplicar = () => {
    const r = aplicarGlossario(texto, ctx.glossario);
    if (!r.total) return setAviso("Nada para corrigir com o glossário atual.");
    gravar(r.texto, `${r.total} termos corrigidos pelo glossário.`);
  };

  const limparLoops = () => {
    const novo = tirarRepeticoes(texto);
    const tirou = palavras(texto) - palavras(novo);
    if (!tirou) return setAviso("Não achei repetições em sequência.");
    gravar(novo, `${tirou} palavras repetidas removidas.`);
  };

  const gerarEstudo = async () => {
    let ciente = false;
    try { ciente = sessionStorage.getItem("cienteGemini") === "1"; } catch { /* sem armazenamento */ }
    if (!ciente) {
      const ok = window.confirm("A transcrição desta aula vai ser enviada ao Gemini, do Google, no plano gratuito. Nesse plano o Google pode usar o conteúdo para melhorar os modelos dele, e revisores humanos podem ler. Continuar?");
      if (!ok) return;
      try { sessionStorage.setItem("cienteGemini", "1"); } catch { /* sem armazenamento */ }
    }
    setGerando(true); setAviso("");
    try {
      const novo = await fontes.gerarEstudo(fonte.id, nivel);
      const f = await fontes.salvarEstudo(fonte, novo);
      setFonte(f); setModo("estudo");
      setAviso("Versão de estudo pronta. Ela pode errar: na dúvida, confira com a transcrição e com a casa.");
    } catch (e) { setAviso(`Não consegui gerar: ${e.message}`); }
    setGerando(false);
  };

  const salvarEdicaoEstudo = async () => {
    setSalvando(true);
    try { const f = await fontes.salvarEstudo(fonte, editEstudo); setFonte(f); setEditEstudo(null); setAviso("Versão de estudo salva."); }
    catch (e) { setAviso(`Não consegui salvar: ${e.message}`); }
    setSalvando(false);
  };

  const gravacoes = (fonte.texto.match(/^\[Gravação \d+\]/gm) || []).length;

  const opcoesModo = [
    ...(fonte.estudo ? [["estudo", "Estudo"]] : []),
    ["ler", "Transcrição"],
    ...(ctx.podeEditar ? [["editar", "Revisar"]] : []),
  ];

  const excluir = async () => {
    if (!window.confirm("Excluir esta aula para todo mundo?")) return;
    try { await fontes.excluir(fonte.id); onVoltar(); } catch (e) { setAviso(`Não consegui excluir: ${e.message}`); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button className="rot-btn" style={iconBtn} onClick={onVoltar} aria-label="Voltar"><ChevronLeft size={16} /></button>
        <div style={{ flex: 1 }} />
        {opcoesModo.length > 1 && <Escolha pequeno valor={modo} onMudar={(m) => { if (modo === "editar" && m !== "editar" && sujo && !window.confirm("Sair sem salvar as alterações?")) return; if (m !== "editar") setTexto(fonte.texto); setEditEstudo(null); setModo(m); }} opcoes={opcoesModo} />}
        {ctx.podeEditar && <button className="rot-btn" style={iconBtn} onClick={excluir} aria-label="Excluir aula"><Trash2 size={15} color={C.erro} /></button>}
      </div>

      {modo === "editar" ? (
        <input value={fonte.titulo} onChange={(e) => setFonte({ ...fonte, titulo: e.target.value })} onBlur={() => fontes.atualizar(fonte.id, { titulo: fonte.titulo })}
          style={{ ...input, fontFamily: SERIF, fontSize: 24, fontWeight: 500, marginBottom: 6 }} />
      ) : <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, margin: "0 0 6px", letterSpacing: -0.4, lineHeight: 1.2 }}>{fonte.titulo}</h1>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: C.sub }}>Aula de {dataBR(fonte.data)}, {palavras(fonte.texto)} palavras{gravacoes > 1 ? `, ${gravacoes} gravações` : ""}</span>
        {ctx.podeEditar && !somando && <button style={{ ...btn2, padding: "4px 10px", fontSize: 12.5 }} onClick={() => setSomando(true)}><Plus size={13} /> Adicionar gravação</button>}
      </div>
      {somando && <NovaAula ctx={ctx} somarEm={fonte} onCancelar={() => setSomando(false)}
        onCriada={async () => { setSomando(false); await recarregar(); setModo(fonte.estudo ? "estudo" : "ler"); setAviso(fonte.estudo ? "Gravação somada à aula. A versão de estudo ainda não inclui a parte nova: toque em Gerar de novo." : "Gravação somada à aula."); }} />}

      <Aviso onFechar={() => setAviso("")}>{aviso}</Aviso>

      {modo === "estudo" ? <>
        {ctx.podeEditar && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {editEstudo == null ? <>
              <button style={btn2} className="rot-btn" onClick={() => setEditEstudo(fonte.estudo)}><Pencil size={14} /> Editar</button>
              <button style={btn2} className="rot-btn" onClick={gerarEstudo} disabled={gerando}>{gerando ? <Girando /> : <Sparkles size={14} />} {gerando ? "Gerando, leva até um minuto" : "Gerar de novo"}</button>
              <BotaoPreparar fonte={fonte} onPronto={() => { setFonte({ ...fonte, indexada: true }); setAviso("Aula pronta para perguntas."); }} onErro={setAviso} />
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: C.sub }}>Detalhe ao gerar:</span>
                <Escolha pequeno valor={nivel} onMudar={setNivel} opcoes={[["completo", "Completo"], ["resumido", "Resumido"]]} />
              </span>
            </> : <>
              <button style={btn} onClick={salvarEdicaoEstudo} disabled={salvando}>{salvando ? <Girando /> : <Save size={15} />} Salvar</button>
              <button style={btn2} onClick={() => setEditEstudo(null)}>Cancelar</button>
            </>}
          </div>
        )}
        {editEstudo != null ? (
          <textarea style={{ ...input, minHeight: 480, lineHeight: 1.7, fontSize: 15, fontFamily: SERIF }} value={editEstudo} onChange={(e) => setEditEstudo(e.target.value)} />
        ) : <>
          <div style={{ fontSize: 12.5, color: C.faint, marginBottom: 16, lineHeight: 1.5 }}>Versão organizada a partir da transcrição. Toque num termo para ver o significado, ou selecione um trecho para guardar como destaque.</div>
          <Leitura texto={fonte.estudo} ctx={ctx} fonte={fonte} comTermos />
          <div style={{ height: 28 }} />
          <Notas fonteId={fonte.id} />
        </>}
      </> : modo === "ler" ? <>
        {ctx.podeEditar && !fonte.estudo && (
          <div style={{ ...dica, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span style={{ flex: "1 1 220px" }}>Transcrição confusa? Gere uma versão de estudo organizada por temas.</span>
            <button style={{ ...btn, background: C.ouro }} onClick={gerarEstudo} disabled={gerando}>{gerando ? <Girando /> : <Sparkles size={14} />} {gerando ? "Gerando" : "Gerar versão de estudo"}</button>
          </div>
        )}
        <div style={{ fontSize: 12.5, color: C.faint, marginBottom: 14, lineHeight: 1.5 }}>Toque num termo sublinhado para ver o significado. Selecione um trecho para guardar como destaque.</div>
        <Leitura texto={texto} ctx={ctx} fonte={fonte} />
        <div style={{ height: 28 }} />
        <Notas fonteId={fonte.id} />
      </> : <>
        {sugestoes.length > 0 && (
          <div style={{ ...dica, flexDirection: "column", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, fontWeight: 500 }}><Lightbulb size={15} style={{ flexShrink: 0, marginTop: 2 }} /> Possíveis erros de transcrição</div>
            {sugestoes.map((s) => (
              <div key={s.errado} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 160 }}><s style={{ opacity: 0.7 }}>{s.errado}</s> para <b style={{ fontWeight: 500 }}>{s.certo}</b><span style={{ opacity: 0.6 }}> ({s.n}×)</span></span>
                <button style={{ ...btn, padding: "5px 10px", fontSize: 12 }} disabled={salvando} onClick={() => corrigir(s.errado, s.certo)}><Check size={13} /> Corrigir</button>
                <button style={{ ...btn2, padding: "5px 10px", fontSize: 12 }} onClick={() => ctx.ignorar(s.errado)}>Está certo</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          <span style={label}>Ensinar uma correção</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...input, flex: "1 1 140px" }} placeholder="Como saiu" value={errado} onChange={(e) => setErrado(e.target.value)} />
            <input style={{ ...input, flex: "1 1 140px" }} placeholder="Como é o certo" list="termos" value={certo} onChange={(e) => setCerto(e.target.value)} />
            <datalist id="termos">{ctx.glossario.map((g) => <option key={g.id} value={g.termo} />)}</datalist>
            <button style={{ ...btn, opacity: errado && certo && !salvando ? 1 : 0.5 }} disabled={!errado || !certo || salvando}
              onClick={() => { corrigir(errado, certo); setErrado(""); setCerto(""); }}><Check size={15} /> Corrigir</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {sujo && <button style={btn} disabled={salvando} onClick={() => gravar(texto, "Alterações salvas.")}>{salvando ? <Girando /> : <Save size={15} />} Salvar alterações</button>}
          <button style={btn2} className="rot-btn" onClick={reaplicar} disabled={salvando}><Wand2 size={15} /> Aplicar glossário</button>
          <button style={btn2} className="rot-btn" onClick={limparLoops} disabled={salvando}><Repeat size={15} /> Tirar repetições</button>
          <BotaoPreparar fonte={fonte} desabilitado={sujo || salvando} onPronto={() => { setFonte({ ...fonte, indexada: true }); setAviso("Aula pronta para perguntas."); }} onErro={setAviso} />
        </div>
        <textarea style={{ ...input, minHeight: 420, lineHeight: 1.7, fontSize: 15, fontFamily: SERIF }} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </>}
    </div>
  );
}
