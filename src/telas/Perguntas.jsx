import React, { useEffect, useState } from "react";
import { Search, Lightbulb } from "lucide-react";
import { busca, fontes } from "../api";
import { vetorizar } from "../ml/cliente";
import { semAcento } from "../corretor";
import { C, SERIF, card, btn, input, dica, erroBox, Tag, Girando, Vazio, Titulo, Escolha, dataBR } from "../ui";

export function Perguntas({ onAbrir, inicial }) {
  const [q, setQ] = useState(inicial || "");
  const [tipo, setTipo] = useState(null);
  const [res, setRes] = useState(null);
  const [carregando, setCarregando] = useState(null);

  const buscar = async () => {
    if (!q.trim()) return;
    setRes(null);
    try {
      setCarregando("Buscando");
      const [porPalavras, titulos] = await Promise.all([busca.porPalavras(q, tipo), fontes.titulos()]);
      let porSentido = [];
      try {
        setCarregando("Entendendo a pergunta");
        const [v] = await vetorizar([q], (p) => p.tipo === "download" && setCarregando(`${p.etapa} (${p.pct}%)`));
        porSentido = await busca.porSentido(v, tipo);
      } catch { /* sem modelo, fica só a busca por palavras */ }

      // Junta as duas buscas: sentido pesa mais, palavras ajudam a desempatar.
      const mapa = new Map();
      const maxP = Math.max(...porPalavras.map((r) => r.score), 0.0001);
      porSentido.forEach((r) => mapa.set(r.trecho_id, { ...r, nota: r.score }));
      porPalavras.forEach((r) => {
        const extra = 0.25 * (r.score / maxP);
        const x = mapa.get(r.trecho_id);
        mapa.set(r.trecho_id, x ? { ...x, nota: x.nota + extra } : { ...r, nota: 0.35 + extra });
      });
      const porFonte = Object.fromEntries(titulos.map((t) => [t.id, t]));
      const itens = [...mapa.values()].filter((r) => r.nota > 0.3).sort((a, b) => b.nota - a.nota).slice(0, 6)
        .map((r) => ({ ...r, fonte: porFonte[r.fonte_id] })).filter((r) => r.fonte);
      setRes({ itens });
    } catch (e) { setRes({ erro: e.message }); }
    setCarregando(null);
  };

  useEffect(() => { if (inicial) buscar(); }, []);

  const destacar = (t) => {
    const ws = semAcento(q).match(/[a-z]{4,}/g) || [];
    if (!ws.length) return t;
    return t.split(/(\s+)/).map((p, i) => ws.some((w) => semAcento(p).includes(w.slice(0, Math.max(4, w.length - 2))))
      ? <mark key={i} style={{ background: C.ouroSoft, color: "inherit", borderRadius: 3 }}>{p}</mark> : p);
  };

  return (
    <div>
      <Titulo sub="Pergunte com as suas palavras. O caderno mostra onde o assunto apareceu.">Perguntar</Titulo>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input style={{ ...input, flex: 1 }} placeholder="Ex.: como cuidar do couro do atabaque?" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button style={btn} onClick={buscar} disabled={!!carregando}>{carregando ? <Girando /> : <Search size={15} />} Buscar</button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Escolha pequeno valor={tipo} onMudar={setTipo} opcoes={[[null, "Tudo"], ["aula", "Só aulas"], ["leitura", "Só leituras"]]} />
      </div>

      {!res && !carregando && (
        <div style={dica}>
          <Lightbulb size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>As respostas vêm do próprio material: aparecem os trechos das aulas e leituras que falam do assunto, com a origem. Quando a fonte é uma aula, é o que a casa ensinou; quando é leitura, é a visão do autor.</span>
        </div>
      )}
      {carregando && <div style={{ fontSize: 13, color: C.sub, display: "flex", gap: 8, alignItems: "center" }}><Girando size={14} /> {carregando}</div>}
      {res?.erro && <div style={erroBox}>Não consegui buscar: {res.erro}</div>}
      {res?.itens?.length === 0 && <Vazio>Nenhuma aula ou leitura fala disso ainda. Vale anotar como dúvida para levar à casa.</Vazio>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {res?.itens?.map((it) => (
          <div key={it.trecho_id} className="rot-row" style={{ ...card, padding: "13px 15px", cursor: "pointer" }} onClick={() => onAbrir(it.fonte, it.pagina)}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <Tag cor={it.fonte.tipo === "aula" ? C.accent : C.folha} fundo={it.fonte.tipo === "aula" ? C.accentSoft : C.folhaSoft}>{it.fonte.tipo === "aula" ? "Aula" : "Leitura"}</Tag>
              <Tag>{it.fonte.titulo}</Tag>
              {it.pagina ? <Tag>p. {it.pagina}</Tag> : it.fonte.data && <Tag>{dataBR(it.fonte.data)}</Tag>}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.65 }}>…{destacar(it.texto)}…</div>
          </div>
        ))}
      </div>
    </div>
  );
}
