import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Home, BookOpen, Library, GraduationCap, BookMarked, Users, LogOut, ShieldCheck, Search } from "lucide-react";
import { auth, meuPerfil, glossario as gApi } from "./api";
import { semAcento } from "./corretor";
import { C, SERIF, SANS, iconBtn, ESTILOS, Carregando, erroBox, Guia } from "./ui";
import { Entrada, NovaSenha, Aguardando } from "./telas/Entrada";
import { Aulas } from "./telas/Aulas";
import { Leituras } from "./telas/Leituras";
import { Fichas } from "./telas/Fichas";
import { Estudar } from "./telas/Estudar";
import { Inicio } from "./telas/Inicio";
import { Perguntas } from "./telas/Perguntas";
import { Pessoas } from "./telas/Pessoas";

export default function App() {
  const [sessao, setSessao] = useState(undefined);
  const [perfil, setPerfil] = useState(undefined);
  const [recuperando, setRecuperando] = useState(false);

  useEffect(() => {
    auth.sessao().then(setSessao);
    const sub = auth.aoMudar((evento, s) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
      setSessao(s);
    });
    return () => sub.unsubscribe();
  }, []);

  const carregarPerfil = useCallback(() => {
    if (!sessao) return setPerfil(null);
    meuPerfil(sessao.user.id).then(setPerfil).catch(() => setPerfil(null));
  }, [sessao?.user?.id]);
  useEffect(() => { carregarPerfil(); }, [carregarPerfil]);

  let tela;
  if (sessao === undefined || (sessao && perfil === undefined)) tela = <Carregando texto="Abrindo o caderno" />;
  else if (recuperando) tela = <NovaSenha onPronto={() => setRecuperando(false)} />;
  else if (!sessao) tela = <Entrada />;
  else if (!perfil?.aprovado) tela = <Aguardando perfil={perfil} onAtualizar={carregarPerfil} />;
  else tela = <Caderno perfil={perfil} />;

  return <><style>{ESTILOS}</style>{tela}</>;
}

function Caderno({ perfil }) {
  const podeEditar = perfil.papel === "admin" || perfil.papel === "editor";
  const [tab, setTab] = useState("inicio");
  const [abertaId, setAbertaId] = useState(null);
  const [paginaInicial, setPaginaInicial] = useState(null);
  const [abaEstudar, setAbaEstudar] = useState("treino");
  const [pergunta, setPergunta] = useState("");
  const [glossario, setGlossario] = useState(null);
  const [ignorados, setIgnorados] = useState([]);
  const [erro, setErro] = useState("");

  const recarregarGlossario = useCallback(async () => {
    try {
      const [g, ig] = await Promise.all([gApi.listar(), gApi.ignorados()]);
      setGlossario(g); setIgnorados(ig);
    } catch (e) { setErro(e.message); }
  }, []);
  useEffect(() => { recarregarGlossario(); }, [recarregarGlossario]);

  const topo = () => window.scrollTo({ top: 0 });
  const ir = useCallback((t, sub) => { setTab(t); setAbertaId(null); setPaginaInicial(null); if (sub) setAbaEstudar(sub); topo(); }, []);
  const abrirFonte = useCallback((fonte, pagina) => { setTab(fonte.tipo === "aula" ? "aulas" : "leituras"); setPaginaInicial(pagina || null); setAbertaId(fonte.id); topo(); }, []);
  const abrirFicha = useCallback((id) => { setTab("fichas"); setAbertaId(id); topo(); }, []);
  const perguntar = useCallback((q) => { setPergunta(q); setTab("perguntas"); setAbertaId(null); topo(); }, []);

  const ctx = useMemo(() => ({
    perfil, podeEditar, paginaInicial, ir, abrirFonte, abrirFicha, perguntar,
    glossario: glossario || [], ignorados, recarregarGlossario,
    // Aprende uma correção: guarda a forma errada como variante do termo certo.
    async aprender(errado, certo) {
      const e = errado.trim(), c = certo.trim();
      if (!e || !c || semAcento(e) === semAcento(c)) return;
      const termo = (glossario || []).find((x) => semAcento(x.termo) === semAcento(c));
      if (!termo) await gApi.criar({ termo: c, significado: "", variantes: [e] });
      else if (!termo.variantes.some((v) => semAcento(v) === semAcento(e))) await gApi.atualizar(termo.id, { variantes: [...termo.variantes, e] });
      await recarregarGlossario();
    },
    async ignorar(palavra) { await gApi.ignorar(palavra); await recarregarGlossario(); },
  }), [perfil, podeEditar, paginaInicial, glossario, ignorados, recarregarGlossario, ir, abrirFonte, abrirFicha, perguntar]);

  const NAV = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "aulas", label: "Aulas", icon: BookOpen },
    { id: "leituras", label: "Leituras", icon: BookMarked },
    { id: "fichas", label: "Fichas", icon: Library },
    { id: "estudar", label: "Estudar", icon: GraduationCap },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: SANS }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 18px calc(110px + env(safe-area-inset-bottom, 0px))" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button onClick={() => ir("inicio")} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: C.ink, textAlign: "left" }}>
            <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, letterSpacing: -0.2 }}>Caderno da Umbanda</div>
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="rot-btn" style={iconBtn} aria-label="Perguntar" title="Perguntar" onClick={() => perguntar("")}><Search size={15} /></button>
            {perfil.papel === "admin" && <button className="rot-btn" style={{ ...iconBtn, background: tab === "pessoas" ? C.fundo2 : C.surface }} aria-label="Pessoas" title="Pessoas" onClick={() => ir("pessoas")}><Users size={15} /></button>}
            <button className="rot-btn" style={iconBtn} aria-label="Sair" title="Sair" onClick={auth.sair}><LogOut size={15} /></button>
          </div>
        </header>
        <div style={{ margin: "12px 0 22px", overflow: "hidden", height: 7 }}><Guia total={90} tamanho={5} /></div>

        {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}
        {!glossario ? <Carregando /> : (
          <main key={tab + (abertaId || "")} style={{ animation: "fade .25s ease" }}>
            {tab === "inicio" && <Inicio ctx={ctx} />}
            {tab === "aulas" && <Aulas ctx={ctx} abertaId={abertaId} setAbertaId={setAbertaId} />}
            {tab === "leituras" && <Leituras ctx={ctx} abertaId={abertaId} setAbertaId={setAbertaId} />}
            {tab === "fichas" && <Fichas ctx={ctx} abertaId={abertaId} setAbertaId={setAbertaId} />}
            {tab === "estudar" && <Estudar ctx={ctx} aba={abaEstudar} setAba={setAbaEstudar} />}
            {tab === "perguntas" && <Perguntas onAbrir={abrirFonte} inicial={pergunta} />}
            {tab === "pessoas" && <Pessoas ctx={ctx} />}
          </main>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 36, fontSize: 11.5, color: C.faint }}>
          <ShieldCheck size={13} /> Conteúdo visível só para pessoas aprovadas
        </div>
      </div>

      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, background: "rgba(251,246,236,0.94)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex" }}>
          {NAV.map((n) => {
            const Ic = n.icon; const on = tab === n.id;
            return (
              <button key={n.id} className="rot-tab" onClick={() => ir(n.id)} aria-current={on ? "page" : undefined}
                style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "10px 4px 9px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: on ? C.cafe : C.faint }}>
                <Ic size={20} strokeWidth={on ? 2.1 : 1.7} />
                <span style={{ fontSize: 11, fontWeight: on ? 500 : 400 }}>{n.label}</span>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: on ? C.cafe : "transparent" }} />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
