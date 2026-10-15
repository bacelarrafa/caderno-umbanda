// Calcula os vetores dos trechos que ainda não têm e marca a fonte como pronta.
import { trechos, fontes } from "./api";
import { vetorizar } from "./ml/cliente";

export async function prepararBusca(fonteId, onProgresso) {
  const pendentes = await trechos.semVetor(fonteId);
  if (pendentes.length) {
    const vs = await vetorizar(pendentes.map((t) => t.texto), (p) => {
      if (p.tipo === "download") onProgresso?.(`${p.etapa} (${p.pct}%)`);
      if (p.tipo === "parcial") onProgresso?.(`Lendo trecho ${p.feito} de ${p.total}`);
    });
    onProgresso?.("Salvando");
    await trechos.salvarVetores(pendentes.map((t, i) => ({ ...t, embedding: vs[i] })));
  }
  await fontes.atualizar(fonteId, { indexada: true });
}
