// Extrai o texto de cada página de um PDF, direto no navegador.
// O arquivo em si não é enviado para lugar nenhum.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function lerPdf(arquivo, onProgresso) {
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const c = await page.getTextContent();
    let t = "";
    for (const item of c.items) t += item.str + (item.hasEOL ? "\n" : " ");
    paginas.push(t.replace(/[ \t]+/g, " ").replace(/-\n(\p{L})/gu, "$1").replace(/\n+/g, " ").trim());
    onProgresso?.(i, doc.numPages);
  }
  const vazias = paginas.filter((p) => p.length < 20).length;
  return { paginas, escaneado: vazias > paginas.length * 0.6 };
}
