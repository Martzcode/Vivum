/**
 * Environnement de test : Node 22+ expose un `localStorage` expérimental qui
 * reste `undefined` sans `--localstorage-file`, et ce global masque celui de
 * jsdom. Les services de l'application s'appuient sur localStorage pour les
 * favoris, la progression et les préférences : on garantit donc un stockage
 * en mémoire, isolé par fichier de test.
 */

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  } as Storage;
}

function resolveStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Origine opaque : on utilise le stockage mémoire ci-dessous.
  }
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {
    // Idem.
  }
  return memoryStorage();
}

Object.defineProperty(globalThis, 'localStorage', {
  value: resolveStorage(),
  configurable: true,
});

export {};
