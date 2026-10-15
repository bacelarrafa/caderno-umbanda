import React, { useEffect, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { notas } from "../api";
import { prepararBusca } from "../indexar";
import { C, SERIF, btn2, input, label, Girando } from "../ui";

// Anotações pessoais: cada pessoa vê só as suas.
export function Notas({ fonteId }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("carregando");
  const timer = useRef();

  useEffect(() => {
    notas.obter(fonteId).then((t) => { setTexto(t); setEstado("ok"); }).catch(() => setEstado("erro"));
  }, [fonteId]);

  const mudar = (v) => {
    setTexto(v); setEstado("salvando");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => notas.salvar(fonteId, v).then(() => setEstado("salvo")).catch(() => setEstado("erro")), 800);
  };

  const status = { salvando: "Salvando", salvo: "Salvo", erro: "Não salvou, tente de novo" }[estado];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ ...label, fontFamily: SERIF, fontSize: 16, color: C.ink }}>Minhas anotações</span>
        {status && <span style={{ ...label, color: estado === "erro" ? C.erro : C.faint }}>{status}</span>}
      </div>
      <textarea style={{ ...input, minHeight: 110, lineHeight: 1.55 }} disabled={estado === "carregando"}
        placeholder="O que ficou de dúvida, o que sentiu, o que perguntar para a dirigente. Só você vê."
        value={texto} onChange={(e) => mudar(e.target.value)} />
    </div>
  );
}

export function BotaoPreparar({ fonte, onPronto, onErro, desabilitado }) {
  const [status, setStatus] = useState(null);
  if (fonte.indexada) {
    return <span style={{ ...btn2, cursor: "default", color: C.accent, background: C.accentSoft, borderColor: "#D9D6F5" }}><Check size={15} /> Pronta para perguntas</span>;
  }
  const rodar = async () => {
    setStatus("Preparando");
    try { await prepararBusca(fonte.id, setStatus); onPronto(); }
    catch (e) { onErro(`Não consegui preparar a busca por sentido: ${e.message}`); }
    setStatus(null);
  };
  return (
    <button style={{ ...btn2, opacity: desabilitado ? 0.5 : 1 }} className="rot-btn" onClick={rodar} disabled={!!status || desabilitado}
      title={desabilitado ? "Salve as alterações antes" : "Permite perguntar pelo sentido, não só pelas palavras"}>
      {status ? <Girando /> : <Search size={15} />} {status || "Preparar para perguntas"}
    </button>
  );
}
