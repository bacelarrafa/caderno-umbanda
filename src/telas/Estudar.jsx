import React, { useEffect, useState } from "react";
import { Trash2, Plus, Pencil, Check } from "lucide-react";
import { destaques, respostas } from "../api";
import { semAcento } from "../corretor";
import { C, SERIF, card, btn, btn2, input, label, Tag, Titulo, Escolha, Carregando, Vazio, Girando } from "../ui";
import { Treino } from "./Treino";
import { CartaoDestaque, useTermos, termosNoTexto } from "./Leitor";

export function Estudar({ ctx, aba, setAba }) {
  return (
    <div>
      <Titulo sub={{ treino: "Os termos que você mais erra aparecem mais vezes.", destaques: "Os trechos que você guardou, com o que eles te ensinaram.", casa: "O que a casa já confirmou. O caderno usa isso para entender as próximas aulas." }[aba]}>Estudar</Titulo>
      <div style={{ marginBottom: 16 }}><Escolha pequeno valor={aba} onMudar={setAba} opcoes={[["treino", "Treino"], ["destaques", "Meus destaques"], ["casa", "Respostas da casa"]]} /></div>
      {aba === "treino" ? <Treino ctx={ctx} /> : aba === "destaques" ? <MeusDestaques ctx={ctx} /> : <RespostasCasa ctx={ctx} />}
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

function RespostasCasa({ ctx }) {
  const termos = useTermos(ctx.glossario);
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(null); // { id?, pergunta, resposta }
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { respostas.listar().then(setLista).catch((e) => { setErro(e.message); setLista([]); }); }, []);

  const salvar = async () => {
    setSalvando(true); setErro("");
    try {
      const ids = termosNoTexto(`${form.pergunta} ${form.resposta}`, termos).map((t) => t.id);
      const dados = { pergunta: form.pergunta.trim(), resposta: form.resposta.trim(), termos: ids };
      const r = form.id ? await respostas.atualizar(form.id, dados) : await respostas.criar(dados);
      setLista((l) => [r, ...l.filter((x) => x.id !== r.id)]);
      setForm(null);
    } catch (e) { setErro(e.message); }
    setSalvando(false);
  };
  const excluir = async (id) => {
    if (!window.confirm("Excluir esta resposta?")) return;
    await respostas.excluir(id); setLista((l) => l.filter((x) => x.id !== id));
  };

  if (!lista) return <Carregando />;
  const visiveis = lista.filter((r) => !busca || semAcento(`${r.pergunta} ${r.resposta}`).includes(semAcento(busca)));

  return (
    <div>
      {ctx.podeEditar && !form && <button style={{ ...btn, marginBottom: 14 }} onClick={() => setForm({ pergunta: "", resposta: "" })}><Plus size={15} /> Registrar algo que a casa ensinou</button>}
      {form && (
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          <span style={label}>Pergunta ou tema</span>
          <input style={{ ...input, marginBottom: 10 }} value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} placeholder="Ex.: Qual toque é usado para cada linha?" />
          <span style={label}>O que a casa ensina</span>
          <textarea style={{ ...input, minHeight: 90, fontFamily: SERIF, fontSize: 15, lineHeight: 1.55 }} value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button style={btn2} onClick={() => setForm(null)}>Cancelar</button>
            <button style={{ ...btn, opacity: form.pergunta.trim() && form.resposta.trim() ? 1 : 0.5 }} disabled={!form.pergunta.trim() || !form.resposta.trim() || salvando} onClick={salvar}>{salvando ? <Girando /> : <Check size={15} />} Salvar</button>
          </div>
        </div>
      )}
      {erro && <div style={{ fontSize: 13, color: C.erro, marginBottom: 10 }}>{erro}</div>}
      {lista.length > 3 && <input style={{ ...input, marginBottom: 12 }} placeholder="Procurar nas respostas" value={busca} onChange={(e) => setBusca(e.target.value)} />}
      {lista.length === 0 && !form && <Vazio>Quando você responder uma dúvida em "Para confirmar com a casa", ela aparece aqui.</Vazio>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visiveis.map((r) => (
          <div key={r.id} style={{ ...card, padding: "13px 15px", borderLeft: `3px solid ${C.folha}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, fontSize: 13.5, color: C.sub, lineHeight: 1.45 }}>{r.pergunta}</div>
              {ctx.podeEditar && <>
                <button aria-label="Editar" onClick={() => setForm({ id: r.id, pergunta: r.pergunta, resposta: r.resposta })} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.faint, padding: 2 }}><Pencil size={14} /></button>
                <button aria-label="Excluir" onClick={() => excluir(r.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.faint, padding: 2 }}><Trash2 size={14} /></button>
              </>}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 15.5, lineHeight: 1.6, marginTop: 4 }}>{r.resposta}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {r.fontes && <Tag>{r.fontes.titulo}</Tag>}
              {r.termos.map((id) => ctx.glossario.find((g) => g.id === id)).filter(Boolean).map((g) => (
                <button key={g.id} onClick={() => ctx.abrirFicha(g.id)} style={{ border: `1px solid ${C.line}`, background: C.bg, borderRadius: 99, padding: "1px 9px", fontSize: 12, fontFamily: SERIF, cursor: "pointer", color: C.ink }}>{g.termo}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
