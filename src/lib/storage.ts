// Helpers centralizados de persistência em localStorage, com tratamento de erro
// único (SSR, modo privado, cota cheia) reaproveitado por toda a aplicação.

/** Lê uma string crua do localStorage, devolvendo `fallback` em caso de falha. */
export function readString(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Grava uma string crua no localStorage, ignorando erros silenciosamente. */
export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Lê e desserializa JSON do localStorage, devolvendo `fallback` se ausente/ inválido. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Serializa e grava um valor JSON no localStorage, ignorando erros. */
export function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
