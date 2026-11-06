/**
 * Valores esperados derivados de `shared/dataset.json`, o artefato canonico do
 * dataset inicial. Os testes usam este modulo para provar que as tres
 * aplicacoes partem exatamente dos mesmos 1000 registros.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** @type {{id:number,title:string,description:string,completed:boolean,createdAt:string,updatedAt:string}[]} */
export const dataset = JSON.parse(
  readFileSync(resolve(HERE, '../../shared/dataset.json'), 'utf8'),
);

export const TOTAL = dataset.length;
export const COMPLETED = dataset.filter((task) => task.completed).length;
export const PENDING = TOTAL - COMPLETED;
export const FIRST = dataset[0];
export const LAST = dataset[dataset.length - 1];
