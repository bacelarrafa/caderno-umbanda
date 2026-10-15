// Guarda tudo no IndexedDB do próprio navegador.
// Nada sai do aparelho: nem áudio, nem transcrição, nem glossário.
const DB = "caderno-umbanda";
const STORE = "kv";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function load(key, fallback) {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result ?? fallback);
      r.onerror = () => resolve(fallback);
    });
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Falha ao salvar", key, e);
  }
}
