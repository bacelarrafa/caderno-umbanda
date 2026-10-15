import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { progresso as api } from "../api";
import { C, SERIF, card, btn, btn2, Escolha, Vazio, Carregando, Guia } from "../ui";

export function Treino({ ctx }) {
  const elegiveis = ctx.glossario.filter((g) => g.significado);
  const [prog, setProg] = useState(null);
  const [atualId, setAtualId] = useState(null);
  const [virada, setVirada] = useState(false);
  const [sentido, setSentido] = useState("termo");
  const [sessao, setSessao] = useState({ ok: 0, total: 0 });

  useEffect(() => {
    api.listar().then((rows) => setProg(Object.fromEntries(rows.map((r) => [r.termo_id, r])))).catch(() => setProg({}));
  }, []);

  // Repetição espaçada simples: os termos que você mais erra aparecem mais.
  const sortear = (excluir, p = prog) => {
    const pool = elegiveis.filter((g) => g.id !== excluir);
    if (!pool.length) return elegiveis[0]?.id || null;
    const pesos = pool.map((g) => Math.max(1, 3 + (p[g.id]?.erros || 0) * 2 - (p[g.id]?.acertos || 0)));
    let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= pesos[i]; if (r <= 0) return pool[i].id; }
    return pool[pool.length - 1].id;
  };

  useEffect(() => { if (prog && !atualId && elegiveis.length) setAtualId(sortear(null)); }, [prog, elegiveis.length]);

  if (!prog) return <Carregando />;
  if (!elegiveis.length) return <Vazio>Quando o glossário tiver termos com significado, eles aparecem aqui para treinar.</Vazio>;

  const atual = ctx.glossario.find((g) => g.id === atualId);

  const responder = (sabia) => {
    const antes = prog[atualId] || { acertos: 0, erros: 0 };
    const depois = { termo_id: atualId, acertos: antes.acertos + (sabia ? 1 : 0), erros: antes.erros + (sabia ? 0 : 1) };
    const novo = { ...prog, [atualId]: depois };
    setProg(novo);
    api.salvar(atualId, depois.acertos, depois.erros).catch(() => {});
    setSessao((s) => ({ ok: s.ok + (sabia ? 1 : 0), total: s.total + 1 }));
    setVirada(false);
    setAtualId(sortear(atualId, novo));
  };

  const dominados = elegiveis.filter((g) => (prog[g.id]?.acertos || 0) >= 3 && (prog[g.id]?.acertos || 0) > (prog[g.id]?.erros || 0) * 2).length;
  const frente = sentido === "termo" ? atual?.termo : atual?.significado;
  const verso = sentido === "termo" ? atual?.significado : atual?.termo;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Guia total={Math.min(elegiveis.length, 42)} cheias={Math.round((dominados / elegiveis.length) * Math.min(elegiveis.length, 42))} titulo={`${dominados} de ${elegiveis.length} termos firmes`} />
        <span style={{ fontSize: 12.5, color: C.sub }}>{sessao.total ? `${sessao.ok} de ${sessao.total} nesta rodada` : `${dominados} de ${elegiveis.length} termos firmes`}</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Escolha pequeno valor={sentido} onMudar={(s) => { setSentido(s); setVirada(false); }} opcoes={[["termo", "Do termo ao significado"], ["significado", "Do significado ao termo"]]} />
      </div>

      {atual && (
        <div style={{ ...card, padding: "40px 24px", minHeight: 260, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          <div style={{ fontFamily: SERIF, fontSize: sentido === "termo" ? 30 : 18, fontWeight: 500, lineHeight: 1.4, letterSpacing: sentido === "termo" ? -0.4 : 0 }}>{frente}</div>
          {virada
            ? <div style={{ fontFamily: SERIF, fontSize: sentido === "termo" ? 17 : 26, color: sentido === "termo" ? C.sub : C.ink, lineHeight: 1.6, animation: "fade .2s ease" }}>{verso}</div>
            : <div><button style={btn2} onClick={() => setVirada(true)}>Mostrar resposta</button></div>}
        </div>
      )}

      {virada && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ ...btn2, flex: 1, justifyContent: "center", background: C.erroSoft, borderColor: "#E8C3B8", color: C.erro }} onClick={() => responder(false)}>Ainda não sabia</button>
          <button style={{ ...btn, flex: 1, justifyContent: "center", background: C.folha }} onClick={() => responder(true)}><Check size={15} /> Sabia</button>
        </div>
      )}
      {atual && <div style={{ textAlign: "center", marginTop: 14 }}>
        <button style={{ ...btn2, fontSize: 12.5, padding: "6px 11px" }} onClick={() => ctx.abrirFicha(atual.id)}>Ver a ficha de {atual.termo}</button>
      </div>}
      <div style={{ fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 12 }}>Seu progresso é só seu. Cada pessoa treina no próprio ritmo.</div>
    </div>
  );
}
