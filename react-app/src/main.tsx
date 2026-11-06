import { createRoot } from 'react-dom/client';

import { App } from './App';
import '../../shared/core/styles.css';

const container = document.getElementById('app');
if (container === null) {
  throw new Error('Elemento raiz #app não encontrado.');
}

createRoot(container).render(<App />);
