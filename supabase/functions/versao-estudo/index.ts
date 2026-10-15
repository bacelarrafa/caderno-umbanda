// Edge Function: transforma a transcrição de uma aula numa versão de estudo usando o Gemini.
// A chave do Gemini fica só nos secrets do Supabase (GEMINI_API_KEY), nunca no site.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const INSTRUCOES = `Você organiza transcrições automáticas de aulas de um curso de desenvolvimento mediúnico de umbanda, para uma aluna estudar depois.
A transcrição tem muitos erros: palavras trocadas por outras de som parecido, frases cortadas, várias pessoas falando ao mesmo tempo e trechos de canto.

Regras:
1. Use somente o que foi dito na aula. Não acrescente conhecimento de fora, nem explicações suas, nem doutrina de outras casas.
2. Quando não der para entender com segurança, não adivinhe: deixe de fora ou escreva [trecho incerto].
3. Corrija os termos da umbanda usando o glossário fornecido quando o contexto deixar claro.
4. Organize por temas, na ordem em que aparecem. Cada tema começa numa linha própria com "## " seguido de um título curto.
5. Logo abaixo de cada título, escreva uma linha começando com "> " com a ideia central do tema numa única frase.
6. Depois, desenvolva o tema em parágrafos curtos separados por linha em branco, em português do Brasil, com linguagem simples e na terceira pessoa ("a casa", "a dirigente"). Não use negrito nem travessões.
7. Quando houver itens que se enumeram (materiais, elementos, passos de um procedimento, cuidados, regras), coloque cada um numa linha própria começando com "- ".
8. Falas marcantes da dirigente podem aparecer entre aspas, corrigindo só o que for erro de transcrição.
9. Preserve o que é próprio desta casa como foi dito, inclusive quando a aula disser que outras casas fazem diferente.
10. Não reproduza relatos pessoais de alunos nem nomes de colegas de turma. Nomes das dirigentes podem aparecer quando forem a referência para dúvidas.
11. Termine com uma seção "## Para confirmar com a casa". Cada dúvida numa linha própria começando com "? ", escrita como pergunta que a aluna pode fazer à dirigente.
12. Você também recebe "O que a casa já confirmou". Use essas respostas para entender trechos confusos e corrigir termos. Não coloque no texto o que não foi dito nesta aula e não pergunte de novo o que já está respondido.
13. Responda apenas com o texto final, sem introdução.`;

const DETALHE = {
  completo: `Nível de detalhe: COMPLETO. Não resuma. O objetivo é não perder nada do que foi ensinado: mantenha todas as explicações, motivos, exemplos, histórias que ilustram o ensinamento, cuidados, regras da casa, diferenças em relação a outras casas e orientações práticas. Tire apenas repetições, hesitações, conversas paralelas e trechos incompreensíveis. Uma aula longa deve gerar uma versão de estudo longa: prefira mais temas e mais parágrafos a cortar conteúdo.`,
  resumido: `Nível de detalhe: RESUMIDO. Seja conciso: para cada tema, apenas o essencial em um ou dois parágrafos curtos, para uma revisão rápida.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // Aceita os cabeçalhos que o navegador pedir, para não quebrar quando a biblioteca mudar.
    const pedidos = req.headers.get("Access-Control-Request-Headers");
    return new Response("ok", { headers: { ...cors, ...(pedidos ? { "Access-Control-Allow-Headers": pedidos } : {}) } });
  }
  try {
    const chaveGemini = Deno.env.get("GEMINI_API_KEY");
    if (!chaveGemini) return json({ erro: "Falta o secret GEMINI_API_KEY nas Edge Functions do Supabase." }, 500);

    // O app manda o login dentro do corpo, num pedido simples que o navegador não precisa checar antes.
    const corpo = await req.json().catch(() => ({}));
    const autorizacao = req.headers.get("Authorization") ?? (corpo.token ? `Bearer ${corpo.token}` : "");
    const chavePublica = req.headers.get("apikey") ?? corpo.apikey ?? Deno.env.get("SUPABASE_ANON_KEY");

    // Age como a pessoa logada: as regras de acesso do banco continuam valendo.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, chavePublica!, {
      global: { headers: { Authorization: autorizacao } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);
    const { data: perfil } = await supabase.from("perfis").select("papel, aprovado").eq("id", user.id).maybeSingle();
    if (!perfil?.aprovado || !["admin", "editor"].includes(perfil.papel)) return json({ erro: "Só editores podem gerar a versão de estudo." }, 403);

    const { fonte_id } = corpo;
    const { data: fonte } = await supabase.from("fontes").select("titulo, data, texto").eq("id", fonte_id).maybeSingle();
    if (!fonte) return json({ erro: "Aula não encontrada." }, 404);
    const { data: glossario } = await supabase.from("glossario").select("termo, significado");
    const lista = (glossario ?? []).map((g) => `${g.termo}${g.significado ? `: ${g.significado}` : ""}`).join("\n");
    const { data: confirmadas } = await supabase.from("respostas").select("pergunta, resposta").order("criado_em", { ascending: false }).limit(80);
    const saber = (confirmadas ?? []).map((c) => `Pergunta: ${c.pergunta}\nResposta da casa: ${c.resposta}`).join("\n\n") || "Nada ainda.";

    // Tenta o modelo principal; se o Gemini estiver sobrecarregado, espera um pouco e tenta de novo,
    // e por último usa um modelo mais leve.
    const principal = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
    const tentativas = [principal, principal, "gemini-flash-lite-latest"];
    const pedido = JSON.stringify({
      systemInstruction: { parts: [{ text: `${INSTRUCOES}\n\n${DETALHE[corpo.nivel] ?? DETALHE.completo}` }] },
      contents: [{ role: "user", parts: [{ text: `Glossário da casa:\n${lista}\n\nO que a casa já confirmou:\n${saber}\n\nAula: ${fonte.titulo} (${fonte.data ?? ""})\n\nTranscrição:\n${fonte.texto}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 16384 },
    });
    let r: Response | null = null;
    for (let i = 0; i < tentativas.length; i++) {
      if (i > 0) await new Promise((ok) => setTimeout(ok, 3000 * i));
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${tentativas[i]}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chaveGemini },
        body: pedido,
      });
      if (![500, 503].includes(r.status)) break;
    }
    if (!r) return json({ erro: "Não consegui falar com o Gemini." }, 502);
    if (r.status === 429) return json({ erro: "O limite gratuito do Gemini foi atingido. Tente de novo em alguns minutos." }, 429);
    if (r.status === 503 || r.status === 500) return json({ erro: "O Gemini está sobrecarregado agora. Tente de novo em alguns minutos." }, 503);
    if (!r.ok) return json({ erro: `O Gemini recusou o pedido (${r.status}): ${(await r.text()).slice(0, 300)}` }, 502);
    const dados = await r.json();
    const texto = (dados.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!texto) return json({ erro: "O Gemini não devolveu texto. Tente de novo." }, 502);
    return json({ texto });
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
