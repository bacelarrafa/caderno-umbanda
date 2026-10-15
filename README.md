# Caderno da Umbanda

App de estudo do curso de desenvolvimento mediúnico, com acesso por login e aprovação.

- Aulas: transcreve a gravação no navegador (Whisper) e corrige os termos da umbanda, aprendendo com cada correção.
- Leituras: livros, apostilas e textos em PDF, arquivo de texto ou colados. Cada leitura pode ser para todos ou só para quem adicionou.
- Fichas: cada termo vira uma página que junta o que as aulas e as leituras dizem sobre ele, os termos que se ligam a ele, seus destaques e suas anotações.
- Leitura: termos sublinhados abrem o significado; selecionar um trecho guarda um destaque, que fica ligado às fichas dos termos que aparecem nele.
- Início: continuar de onde parou, temas da última aula, revisão e destaques recentes.
- Estudar: treino com flashcards (progresso individual) e todos os seus destaques, filtráveis por termo.
- Perguntas: encontra nas aulas e leituras os trechos que falam do assunto, pelo sentido e pelas palavras, mostrando a origem e a página.
- Pessoas: quem tem o link cria conta, mas só vê o conteúdo depois de aprovado.

## Papéis

- Membro: vê tudo, treina, faz anotações e perguntas.
- Editor: também adiciona e corrige aulas, leituras e termos.
- Admin: também aprova pessoas e muda papéis. A primeira conta criada vira admin automaticamente.

## Configuração

### 1. Supabase
1. Em supabase.com, crie um projeto novo (região São Paulo).
2. Abra o SQL Editor, cole todo o conteúdo de `supabase/schema.sql` e clique em Run. Se você já tinha rodado o schema numa versão anterior, rode só `supabase/02-estudo.sql`.
3. Em Authentication, URL Configuration, coloque `https://bacelarrafa.github.io/caderno-umbanda/` em Site URL e também em Redirect URLs.
4. Em Project Settings, API, copie a Project URL e a chave anon public.

### 2. GitHub
1. No repositório, vá em Settings, Secrets and variables, Actions, New repository secret, e crie:
   - `VITE_SUPABASE_URL` com a Project URL
   - `VITE_SUPABASE_ANON_KEY` com a chave anon public
2. Suba os arquivos deste projeto. O deploy roda sozinho.

### 3. Primeiro acesso
Abra o site e crie sua conta antes de passar o link para qualquer pessoa: a primeira conta vira admin.

## Privacidade

- Áudios e PDFs são processados no navegador e não são enviados. Só o texto vai para o banco.
- As regras de acesso ficam no próprio banco (row level security): quem não foi aprovado não consegue ler nada, nem chamando a API direto.
- A chave anon é pública por natureza; a proteção vem dessas regras. Nunca coloque a chave service_role no app ou no GitHub.

## Rodar localmente

Copie `.env.example` para `.env`, preencha, e rode `npm install` e `npm run dev`.
