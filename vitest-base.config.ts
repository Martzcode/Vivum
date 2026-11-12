import { defineConfig } from 'vitest/config';

/**
 * Configuration Vitest complémentaire utilisée par `ng test`.
 *
 * Le builder Angular exécute les tests dans jsdom. Sans URL explicite, jsdom
 * crée un contexte d'origine opaque : `window.localStorage` est alors absent,
 * ce qui casse les tests des services qui persévèrent les préférences locales.
 */
export default defineConfig({
  test: {
    setupFiles: ['src/test-setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
});
