import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

/*
 * Estrutura equivalente à de react-app/src/main.tsx e vue-app/src/main.ts.
 *
 * A folha de estilos global é declarada em angular.json ("styles"), que é o
 * mecanismo oficial do Angular para CSS global; nas outras duas aplicações o
 * mesmo arquivo é importado no ponto de entrada.
 */
bootstrapApplication(App, appConfig).catch((error: unknown) => {
  console.error(error);
});
