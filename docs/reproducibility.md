# Reprodutibilidade

Passo a passo para reconstruir o ambiente e repetir o experimento a partir
apenas do código-fonte e do `Dockerfile`.

---

## 1. O que precisa existir na máquina

Apenas **Docker** com Docker Compose v2 (validado na versão 28.2.2 / Compose
v2.37.1). Nada mais: Node, npm, Python, cloc e o navegador são instalados
dentro da imagem, em versões fixas.

Também é possível rodar fora do container, mas nesse caso a máquina precisa ter
exatamente Node 24.16.0, npm 11.13.0, Python 3 com numpy/pandas/scipy, cloc e um
Chromium compatível com o Playwright. **O ambiente do container é o de
referência**; resultados obtidos fora dele não são comparáveis com os obtidos
dentro.

## 2. Construir a imagem

```bash
docker compose build
```

Isso monta, sobre Ubuntu 22.04:

- Node.js 24.16.0, baixado do site oficial e **verificado por SHA-256** contra
  o `SHASUMS256.txt` publicado;
- npm 11.13.0, instalado explicitamente sobre o que vem com o Node;
- Python 3.10 com numpy 2.2.6, pandas 2.2.3 e scipy 1.15.3 (as últimas versões
  compatíveis com o Python 3.10 do Ubuntu 22.04);
- cloc 1.90 e os utilitários GNU usados pelos scripts;
- Playwright 1.63.0 com o Chromium correspondente.

A imagem funciona em `amd64` e `arm64`: o `Dockerfile` seleciona o binário do
Node pelo `TARGETARCH`, e o Chromium do Playwright tem build oficial para as
duas arquiteturas (ver decisão D-09).

## 3. Verificar o ambiente

```bash
docker compose run --rm tcc bash -lc 'node --version && npm --version && python3 --version && cloc --version'
```

Esperado:

```
v24.16.0
11.13.0
Python 3.10.12
1.90
```

Se qualquer versão divergir, **pare**: a imagem foi construída a partir de um
`Dockerfile` alterado ou de cache antigo. Reconstrua com
`docker compose build --no-cache`.

## 4. Instalar as dependências

```bash
docker compose run --rm tcc npm run install:all
```

Usa `npm ci` sempre que existe `package-lock.json`, instalando exatamente as
versões travadas. Os `node_modules` ficam em volumes nomeados do Docker, e não
no diretório do projeto — isso impede que dependências binárias compiladas no
sistema hospedeiro (macOS, Windows) vazem para dentro do Linux e contaminem as
medições de tamanho e de dependências.

## 5. Rodar o experimento completo

```bash
docker compose run --rm tcc npm run experiment
```

O comando executa, em ordem, as nove etapas descritas em
`docs/measurement-protocol.md` e, ao final, a análise estatística. Com 30
repetições, leva algo entre 30 e 60 minutos, dependendo da máquina.

Para uma execução rápida de conferência:

```bash
docker compose run --rm -e REPETITIONS=3 -e WARMUP=1 tcc npm run experiment
```

## 6. Onde ficam os resultados

Os volumes montam o repositório dentro do container, então tudo aparece no
sistema hospedeiro:

```
results/raw/         dados brutos de cada medição, em CSV
results/processed/   estatística descritiva, testes e summary.md
```

`results/raw/environment.json` registra CPU, núcleos, memória, sistema,
arquitetura, versões e parâmetros da coleta. **Sem esse arquivo os números não
são interpretáveis**: guarde-o junto dos CSVs.

## 7. Inspecionar as aplicações no navegador

Útil para conferir visualmente o que os números descrevem, sem rodar a coleta.

```bash
# as três em modo de desenvolvimento
docker compose run --rm --service-ports tcc npm run dev

# as três servindo o build de produção
docker compose run --rm --service-ports tcc npm run preview

# apenas uma delas
docker compose run --rm --service-ports tcc npm run dev:angular
```

| Aplicação | Desenvolvimento | Produção |
| --- | --- | --- |
| React | http://localhost:5173 | http://localhost:4173 |
| Vue | http://localhost:5174 | http://localhost:4174 |
| Angular | http://localhost:5175 | http://localhost:4175 |

O `--service-ports` publica as portas do container na máquina hospedeira; sem
ele o navegador não alcança as aplicações. Pelo mesmo motivo, os servidores
escutam em `0.0.0.0` — ligados apenas a `127.0.0.1` ficariam acessíveis somente
de dentro do container. Isso está configurado em `vite.config.ts`,
`angular.json` e `scripts/serve-static.mjs`.

**Para avaliar desempenho use sempre o modo de produção**: o modo de
desenvolvimento não otimiza o código e cada framework usa um servidor próprio,
o que torna a comparação inválida.

## 8. Condições recomendadas para a coleta final

Medição de desempenho é sensível ao estado da máquina. Para a coleta que vai
para o trabalho:

- feche outras aplicações, principalmente navegadores e IDEs;
- desligue atualizações automáticas e sincronização de arquivos em nuvem;
- mantenha o computador na tomada e desative economia de energia — o
  escalonamento dinâmico de frequência é uma das maiores fontes de variação;
- não use a máquina durante a coleta;
- rode a coleta completa mais de uma vez, em momentos diferentes, e compare o
  coeficiente de variação entre elas.

Se o coeficiente de variação de uma métrica de tempo passar de ~15%, houve
interferência: repita com o sistema mais ocioso antes de interpretar os
resultados.

## 9. Verificar a integridade do experimento isoladamente

As três pré-condições de validade podem ser checadas sem rodar a coleta inteira:

```bash
# As três usam o mesmo arquivo de núcleo, sem cópias locais?
docker compose run --rm tcc npm run verify:shared

# O gerador reproduz o dataset canônico de 1000 registros?
docker compose run --rm tcc npm run verify:dataset

# As três se comportam identicamente nos 13 casos de teste?
docker compose run --rm tcc npm run test:e2e
```

## 10. Alterar a aplicação sem quebrar a comparação

Qualquer mudança de regra de negócio, texto, validação ou estilo é feita em
`shared/core/` e atinge as três aplicações de uma só vez, porque as três
importam esses arquivos diretamente. Não há passo de sincronização.

Mudanças nos componentes, por outro lado, precisam ser aplicadas **nas três**
implementações, na mesma estrutura. Depois de qualquer alteração:

```bash
docker compose run --rm tcc npm run verify:shared
docker compose run --rm tcc npm run test:e2e
docker compose run --rm tcc npm run verify:visual
```

Se um framework passar e outro falhar, a equivalência foi quebrada.

Alterar `shared/core/dataset.ts` muda o dataset inteiro. Nesse caso é preciso
regerar `shared/dataset.json` e **descartar todos os resultados anteriores**,
que passam a não ser comparáveis.

## 11. O que versionar junto dos resultados

Para que outra pessoa consiga reproduzir uma coleta específica:

- o commit exato do repositório (`git rev-parse HEAD`);
- `results/raw/environment.json` daquela coleta;
- os `package-lock.json` das três aplicações e da raiz;
- os CSVs de `results/raw/`.

Com esses itens, `docker compose build` reconstrói o mesmo ambiente e
`npm run experiment` repete o mesmo procedimento.
