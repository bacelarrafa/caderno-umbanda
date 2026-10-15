// Edge Function: transforma a transcrição de uma aula numa versão de estudo usando o Gemini.
// A chave do Gemini fica só nos secrets do Supabase (GEMINI_API_KEY), nunca no site.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
5. Escreva em parágrafos curtos, em português do Brasil, com linguagem simples e na terceira pessoa ("a casa", "a dirigente"). Não use listas nem travessões.
6. Preserve o que é próprio desta casa como foi dito, inclusive quando a aula disser que outras casas fazem diferente.
7. Não reproduza relatos pessoais de alunos nem nomes de colegas de turma. Nomes das dirigentes podem aparecer quando forem a referência para dúvidas.
8. Termine com uma seção "## Para confirmar com a casa", listando em frases curtas o que ficou ambíguo.
9. Responda apenas com o texto final, sem introdução.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const chaveGemini = Deno.env.get("GEMINI_API_KEY");
    if (!chaveGemini) return json({ erro: "Falta o secret GEMINI_API_KEY nas Edge Functions do Supabase." }, 500);

    // Age como a pessoa logada: as regras de acesso do banco continuam valendo.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);
    const { data: perfil } = await supabase.from("perfis").select("papel, aprovado").eq("id", user.id).maybeSingle();
    if (!perfil?.aprovado || !["admin", "editor"].includes(perfil.papel)) return json({ erro: "Só editores podem gerar a versão de estudo." }, 403);

    const { fonte_id } = await req.json();
    const { data: fonte } = await supabase.from("fontes").select("titulo, data, texto").eq("id", fonte_id).maybeSingle();
    if (!fonte) return json({ erro: "Aula não encontrada." }, 404);
    const { data: glossario } = await supabase.from("glossario").select("termo, significado");
    const lista = (glossario ?? []).map((g) => `${g.termo}${g.significado ? `: ${g.significado}` : ""}`).join("\n");

    const modelo = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chaveGemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCOES }] },
        contents: [{ role: "user", parts: [{ text: `Glossário da casa:\n${lista}\n\nAula: ${fonte.titulo} (${fonte.data ?? ""})\n\nTranscrição:\n${fonte.texto}` }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (r.status === 429) return json({ erro: "O limite gratuito do Gemini foi atingido. Tente de novo em alguns minutos." }, 429);
    if (!r.ok) return json({ erro: `O Gemini recusou o pedido (${r.status}): ${(await r.text()).slice(0, 300)}` }, 502);
    const dados = await r.json();
    const texto = (dados.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!texto) return json({ erro: "O Gemini não devolveu texto. Tente de novo." }, 502);
    return json({ texto });
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
