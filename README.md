# Caderno da Umbanda

App para estudar o curso de desenvolvimento mediúnico: transcreve as gravações das aulas, corrige os termos da umbanda aprendendo com as suas correções, treina o glossário e encontra nas aulas os trechos que respondem às suas perguntas.

Mesma estrutura do Organização do nosso lar (Vite, React, lucide-react, GitHub Pages).

## O que é machine learning aqui

Tudo roda no navegador, sem servidor e sem chave de API:

- Transcrição: modelo Whisper (OpenAI, versão aberta) via Transformers.js. Opção "Preciso" usa o whisper-small, que é bem melhor em português; "Rápido" usa o whisper-base.
- Perguntas: modelo de embeddings multilíngue (paraphrase-multilingual-MiniLM) que transforma cada trecho da aula em um vetor e encontra os trechos com sentido parecido com a pergunta, mesmo usando outras palavras.
- Corretor: cada correção que você confirma vira uma variante do termo no glossário e passa a ser aplicada sozinha nas próximas aulas. Também sugere palavras parecidas com termos conhecidos.
- Treino: flashcards com repetição espaçada simples; os termos que você erra aparecem mais.

Os modelos são baixados do Hugging Face na primeira vez (algumas centenas de MB) e ficam em cache no navegador.

## Privacidade

Áudios, transcrições e glossário ficam no IndexedDB do aparelho. Nada é enviado para servidor. Por isso, use os botões de backup (baixar e restaurar) no topo para levar os dados para outro aparelho ou não perder nada se limpar o navegador.

## Publicar no GitHub

1. Crie um repositório novo, por exemplo `caderno-umbanda`.
2. Suba todos os arquivos desta pasta, incluindo `.github/workflows/deploy.yml`.
3. Em Settings, Pages, escolha "GitHub Actions" como source.
4. Cada push na `main` publica em `https://bacelarrafa.github.io/caderno-umbanda/`.

Para rodar localmente: `npm install` e depois `npm run dev`.

## Dicas de uso

- Transcreva no computador. No celular funciona, mas uma aula de 1 hora pode levar muito tempo. Chrome ou Edge com WebGPU são os mais rápidos.
- Grave com o celular o mais perto possível de quem fala.
- O glossário inicial tem significados genéricos. Ajuste com o que a casa ensina, porque cada terreiro tem sua doutrina.
