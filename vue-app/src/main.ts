import { createApp } from 'vue';

import App from './App.vue';
import '../../shared/core/styles.css';

const container = document.getElementById('app');
if (container === null) {
  throw new Error('Elemento raiz #app não encontrado.');
}

createApp(App).mount(container);
