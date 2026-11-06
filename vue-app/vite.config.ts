import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Configuracao minima e equivalente a das outras duas implementacoes.
// Ver docs/implementation-decisions.md (decisoes D-04 e D-05).
export default defineConfig({
  plugins: [vue()],
  build: {
    // Alinhado ao "target": "ES2022" do tsconfig do Angular, para que as tres
    // aplicacoes emitam o mesmo nivel de ECMAScript e a comparacao de tamanho
    // de bundle e de tempo de execucao nao seja afetada por downleveling.
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    port: 5174,
    strictPort: true,
    // Aceita conexoes de fora do container, para que o servidor de
    // desenvolvimento seja alcancavel pelo navegador da maquina hospedeira.
    host: true,
    fs: {
      // O nucleo compartilhado (shared/core) fica fora da raiz desta
      // aplicacao; sem isto o servidor de desenvolvimento se recusaria a
      // servi-lo. No build de producao a resolucao e feita pelo Rollup e nao
      // depende desta opcao.
      allow: ['..'],
    },
  },
});
