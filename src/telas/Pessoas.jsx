import React, { useEffect, useState } from "react";
import { pessoas as api } from "../api";
import { C, card, btn, btn2, erroBox, Tag, Titulo, Carregando, dataBR } from "../ui";

const PAPEIS = [["membro", "Membro"], ["editor", "Editor"], ["admin", "Admin"]];
const DESCRICAO = { membro: "Vê tudo, treina e faz anotações", editor: "Também adiciona aulas, leituras e termos", admin: "Também aprova e gerencia pessoas" };

export function Pessoas({ ctx }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = () => api.listar().then(setLista).catch((e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  const mudar = async (id, patch) => {
    setErro("");
    try { await api.atualizar(id, patch); await carregar(); } catch (e) { setErro(e.message); }
  };

  if (!lista && !erro) return <Carregando />;
  const pendentes = (lista || []).filter((p) => !p.aprovado);
  const ativos = (lista || []).filter((p) => p.aprovado);

  const Linha = ({ p }) => {
    const eu = p.id === ctx.perfil.id;
    return (
      <div style={{ ...card, padding: "13px 15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 14.5 }}>{p.nome || "Sem nome"} {eu && <span style={{ color: C.faint, fontSize: 12.5 }}>(você)</span>}</div>
            <div style={{ fontSize: 12.5, color: C.sub }}>{p.email}</div>
          </div>
          {p.aprovado ? (
            <>
              <select value={p.papel} disabled={eu} onChange={(e) => mudar(p.id, { papel: e.target.value })}
                style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink }}>
                {PAPEIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {!eu && <button style={{ ...btn2, padding: "7px 11px", fontSize: 12.5, color: C.erro }} onClick={() => window.confirm(`Tirar o acesso de ${p.nome || p.email}?`) && mudar(p.id, { aprovado: false })}>Tirar acesso</button>}
            </>
          ) : (
            <>
              <Tag>Pediu acesso em {dataBR(p.criado_em)}</Tag>
              <button style={{ ...btn, padding: "7px 12px", fontSize: 12.5 }} onClick={() => mudar(p.id, { aprovado: true })}>Aprovar</button>
            </>
          )}
        </div>
        {p.aprovado && <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>{DESCRICAO[p.papel]}</div>}
      </div>
    );
  };

  return (
    <div>
      <Titulo sub="Quem pode entrar e o que cada pessoa pode fazer.">Pessoas</Titulo>
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}
      {pendentes.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#6B4A14", marginBottom: 8 }}>Aguardando aprovação</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>{pendentes.map((p) => <Linha key={p.id} p={p} />)}</div>
        </>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: C.sub, marginBottom: 8 }}>Com acesso</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ativos.map((p) => <Linha key={p.id} p={p} />)}</div>
      <div style={{ fontSize: 12, color: C.faint, marginTop: 16, lineHeight: 1.5 }}>Quem tiver o link pode criar conta, mas só vê o conteúdo depois que você aprovar.</div>
    </div>
  );
}
