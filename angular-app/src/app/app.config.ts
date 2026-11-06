import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';

/*
 * Configuração da aplicação, mantida como o Angular CLI 22 a gera por padrão.
 *
 * O Angular 22 usa detecção de mudanças sem zone.js (zoneless) por padrão, de
 * modo que `zone.js` não consta nas dependências. Ver
 * docs/implementation-decisions.md (decisão D-06).
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
