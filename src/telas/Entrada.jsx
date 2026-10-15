import React, { useState } from "react";
import { Hourglass, LogOut } from "lucide-react";
import { auth } from "../api";
import { C, SERIF, SANS, card, btn, btn2, input, label, erroBox, Aviso, Girando, Guia } from "../ui";

function Moldura({ children, subtitulo }) {
  return (
    <div style={{ maxWidth: 400, margin: "56px auto", padding: "0 18px", fontFamily: SANS, color: C.ink }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, letterSpacing: -0.5, lineHeight: 1.15 }}>Caderno da Umbanda</div>
        <div style={{ fontSize: 13.5, color: C.sub, margin: "6px 0 14px" }}>{subtitulo}</div>
        <Guia total={36} tamanho={6} />
      </div>
      <div style={{ ...card, padding: 20 }}>{children}</div>
    </div>
  );
}

const traduzir = (m) => {
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(m)) return "Esse e-mail já tem cadastro. Use Entrar ou Esqueci a senha.";
  if (/at least 6/i.test(m) || /password should/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  return m;
};

export function Entrada() {
  const [modo, setModo] = useState("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const enviar = async () => {
    setErro(""); setAviso(""); setEnviando(true);
    try {
      if (modo === "entrar") await auth.entrar(email.trim(), senha);
      if (modo === "cadastrar") {
        const r = await auth.cadastrar(nome.trim(), email.trim(), senha);
        if (!r.session) setAviso("Cadastro feito. Confirme pelo link que chegou no seu e-mail e depois entre aqui.");
      }
      if (modo === "recuperar") {
        await auth.recuperar(email.trim());
        setAviso("Se esse e-mail tiver cadastro, chega um link para criar uma nova senha.");
      }
    } catch (e) { setErro(traduzir(e.message)); }
    setEnviando(false);
  };

  const pronto = email.includes("@") && (modo === "recuperar" || senha.length >= 6) && (modo !== "cadastrar" || nome.trim());
  const titulo = { entrar: "Entrar", cadastrar: "Criar conta", recuperar: "Recuperar senha" }[modo];

  return (
    <Moldura subtitulo="Acesso para pessoas do curso">
      <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, marginBottom: 14 }}>{titulo}</div>
      <Aviso>{aviso}</Aviso>
      {modo === "cadastrar" && (
        <div style={{ marginBottom: 10 }}><span style={label}>Nome</span><input style={input} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></div>
      )}
      <div style={{ marginBottom: 10 }}><span style={label}>E-mail</span><input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
      {modo !== "recuperar" && (
        <div style={{ marginBottom: 14 }}><span style={label}>Senha</span>
          <input style={input} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pronto && enviar()}
            autoComplete={modo === "cadastrar" ? "new-password" : "current-password"} placeholder={modo === "cadastrar" ? "Pelo menos 6 caracteres" : ""} />
        </div>
      )}
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}
      <button style={{ ...btn, width: "100%", justifyContent: "center", opacity: pronto ? 1 : 0.5 }} disabled={!pronto || enviando} onClick={enviar}>
        {enviando && <Girando />} {modo === "recuperar" ? "Enviar link" : titulo}
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 13 }}>
        {modo !== "entrar" ? <Link onClick={() => setModo("entrar")}>Já tenho conta</Link> : <Link onClick={() => setModo("cadastrar")}>Criar conta</Link>}
        {modo === "entrar" && <Link onClick={() => setModo("recuperar")}>Esqueci a senha</Link>}
      </div>
    </Moldura>
  );
}

function Link({ children, onClick }) {
  return <button onClick={onClick} style={{ border: "none", background: "transparent", color: C.accent, cursor: "pointer", padding: 0, fontSize: 13 }}>{children}</button>;
}

export function NovaSenha({ onPronto }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const salvar = async () => {
    setEnviando(true); setErro("");
    try { await auth.novaSenha(senha); onPronto(); } catch (e) { setErro(traduzir(e.message)); }
    setEnviando(false);
  };
  return (
    <Moldura subtitulo="Criar uma nova senha">
      <span style={label}>Nova senha</span>
      <input style={{ ...input, marginBottom: 14 }} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Pelo menos 6 caracteres" />
      {erro && <div style={{ ...erroBox, marginBottom: 12 }}>{erro}</div>}
      <button style={{ ...btn, width: "100%", justifyContent: "center", opacity: senha.length >= 6 ? 1 : 0.5 }} disabled={senha.length < 6 || enviando} onClick={salvar}>
        {enviando && <Girando />} Salvar senha
      </button>
    </Moldura>
  );
}

export function Aguardando({ perfil, onAtualizar }) {
  return (
    <Moldura subtitulo="Acesso para pessoas do curso">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
        <Hourglass size={18} color={C.sub} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 14, lineHeight: 1.55 }}>
          {perfil?.nome ? `${perfil.nome}, seu` : "Seu"} cadastro está aguardando aprovação. Assim que for liberado, o conteúdo aparece aqui.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn2} onClick={onAtualizar}>Verificar de novo</button>
        <button style={btn2} onClick={auth.sair}><LogOut size={14} /> Sair</button>
      </div>
    </Moldura>
  );
}
