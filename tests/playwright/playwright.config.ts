import { defineConfig, devices } from '@playwright/test';

/**
 * =============================================================================
 * Configuracao do Playwright para o experimento.
 * =============================================================================
 *
 * A MESMA suite de testes (`crud.spec.ts`) e executada contra as tres
 * aplicacoes, cada uma servida pelo mesmo servidor estatico
 * (`scripts/serve-static.mjs`) a partir do seu build de producao. Isso prova
 * equivalencia funcional: se um dos projetos falhar, as implementacoes
 * divergiram.
 *
 * Portas: React 4173, Vue 4174, Angular 4175.
 */

const APPS = [
  { name: 'react', dir: 'react-app', port: 4173 },
  { name: 'vue', dir: 'vue-app', port: 4174 },
  { name: 'angular', dir: 'angular-app', port: 4175 },
] as const;

export default defineConfig({
  testDir: '.',
  // Execucao sequencial: os testes compartilham a maquina com as medicoes de
  // desempenho e a concorrencia introduziria ruido.
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../../results/raw/e2e-report.json' }],
  ],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: APPS.map((app) => ({
    name: app.name,
    use: { baseURL: `http://127.0.0.1:${app.port}` },
  })),
  webServer: APPS.map((app) => ({
    command: `node ../../scripts/serve-static.mjs ../../${app.dir}/dist ${app.port}`,
    url: `http://127.0.0.1:${app.port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  })),
});
