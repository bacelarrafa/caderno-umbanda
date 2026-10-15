import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { destaques } from "../api";
import { C, SERIF, btn2, Titulo, Escolha, Carregando, Vazio } from "../ui";
import { Treino } from "./Treino";
import { CartaoDestaque } from "./Leitor";

export function Estudar({ ctx, aba, setAba }) {
  return (
    <div>
      <Titulo sub={aba === "treino" ? "Os termos que você mais erra aparecem mais vezes." : "Os trechos que você guardou, com o que eles te ensinaram."}>Estudar</Titulo>
      <div style={{ marginBottom: 16 }}><Escolha pequeno valor={aba} onMudar={setAba} opcoes={[["treino", "Treino"], ["destaques", "Meus destaques"]]} /></div>
      {aba === "treino" ? <Treino ctx={ctx} /> : <MeusDestaques ctx={ctx} />}
    </div>
  );
}

function MeusDestaques({ ctx }) {
  const [lista, setLista] = useState(null);
  const [termo, setTermo] = useState(null);
  useEffect(() => { destaques.listar({ limite: 300 }).then(setLista).catch(() => setLista([])); }, []);
  if (!lista) return <Carregando />;
  if (!lista.length) return <Vazio>Nenhum destaque ainda. Selecione um trecho numa aula ou leitura para guardar.</Vazio>;

  const usados = [...new Set(lista.flatMap((d) => d.termos))].map((id) => ctx.glossario.find((g) => g.id === id)).filter(Boolean)
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
  const visiveis = termo ? lista.filter((d) => d.termos.includes(termo)) : lista;

  const excluir = async (id) => {
    if (!window.confirm("Excluir este destaque?")) return;
    await destaques.excluir(id); setLista((l) => l.filter((d) => d.id !== id));
  };

  return (
    <div>
      {usados.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => setTermo(null)} style={{ ...btn2, padding: "5px 10px", fontSize: 12.5, background: !termo ? C.cafe : C.surface, color: !termo ? "#FBF6EC" : C.ink }}>Todos</button>
          {usados.map((g) => (
            <button key={g.id} onClick={() => setTermo(g.id)} style={{ ...btn2, padding: "5px 10px", fontSize: 12.5, fontFamily: SERIF, background: termo === g.id ? C.cafe : C.surface, color: termo === g.id ? "#FBF6EC" : C.ink }}>{g.termo}</button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visiveis.map((d) => (
          <div key={d.id} style={{ position: "relative" }}>
            <CartaoDestaque d={d} onAbrir={() => ctx.abrirFonte({ id: d.fonte_id, tipo: d.fontes.tipo }, d.pagina)} />
            <button onClick={() => excluir(d.id)} aria-label="Excluir destaque" style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", cursor: "pointer", color: C.faint, padding: 4 }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
