# 🚀 OnnxPlayground

URL: https://onnx-insight-hub.lovable.app/

> **Aplicação web genérica para análise e inferência de modelos ONNX de visão computacional.**

O **OnnxPlayground** é uma aplicação web desenvolvida para **carregar, analisar e executar modelos ONNX diretamente no navegador**.

A principal característica do projeto é sua **generalidade**: a aplicação não é desenvolvida para um dataset ou domínio específico. O comportamento do sistema é determinado pelas informações presentes no próprio arquivo ONNX.

---

## 🎯 Objetivo

O sistema recebe um arquivo `.onnx` e utiliza as informações presentes no próprio modelo para:

- 📂 analisar sua estrutura;
- 🔎 identificar entradas e saídas;
- 🏷️ localizar classes nos metadados;
- 🌐 traduzir as classes para português quando necessário;
- 🧠 identificar a tarefa quando possível;
- 🖼️ receber uma imagem para inferência;
- ⚡ executar o modelo localmente no navegador;
- 📊 apresentar os resultados;
- 🎚️ aplicar um limite mínimo de confiança quando aplicável.

A aplicação **não possui classes fixas** e não deve assumir que o modelo trabalha com resíduos, animais, veículos ou qualquer outro domínio específico.

---

## ⚠️ Requisito dos metadados

Para que as classes sejam identificadas automaticamente, **elas precisam estar presentes nos metadados do arquivo ONNX**.

A aplicação procura informações em campos como:

```text
names
classes
labels
class_names
```

Por exemplo:

```text
0: glass
1: plastic
2: metal
```

pode ser apresentado como:

| ID | Original | Tradução |
|---|---|---|
| 0 | glass | Vidro |
| 1 | plastic | Plástico |
| 2 | metal | Metal |

Se as classes não estiverem disponíveis nos metadados, a aplicação informa que elas não foram encontradas e apresenta as informações técnicas disponíveis.

> 🚨 **A aplicação não cria ou assume classes que não estejam presentes no modelo.**

---

## ✨ Funcionalidades

### 📁 1. Upload do modelo

O usuário pode:

- 📤 selecionar um arquivo `.onnx`;
- 🖱️ arrastar e soltar o arquivo;
- 📄 visualizar nome e tamanho;
- 🔍 carregar e analisar o modelo.

![Tela Inicial](https://raw.githubusercontent.com/tamyriscabral/ArquivosColab/refs/heads/main/Captura%20de%20tela%202026-09-22%20213139.png)

---

### 🔎 2. Análise automática

Após o carregamento, o sistema analisa:

- 📝 metadados;
- 📥 entradas;
- 📐 dimensões;
- 🔢 tipos de dados;
- 📤 saídas;
- 📊 dimensões das saídas;
- 🏷️ classes/labels;
- 🧠 informações que possam indicar a tarefa do modelo.

![Modelo detectado](https://raw.githubusercontent.com/tamyriscabral/ArquivosColab/refs/heads/main/Captura%20de%20tela%202026-09-22%20215231.png)


---

### 🏷️ 3. Classes e tradução

As classes encontradas nos metadados são apresentadas automaticamente.

O sistema mantém o **nome original** e pode apresentar uma **tradução para português**.

Exemplo:

```text
cat      → Gato
dog      → Cachorro
glass    → Vidro
plastic  → Plástico
```

Os exemplos são apenas ilustrativos e não representam classes fixas da aplicação.

![Classes Identificadas](https://raw.githubusercontent.com/tamyriscabral/ArquivosColab/refs/heads/main/Captura%20de%20tela%202026-09-22%20215122.png)
---

### 🔬 4. Inferência

O usuário pode fornecer uma imagem para que o modelo execute a inferência.

Sempre que compatível, a execução é realizada localmente no navegador utilizando **ONNX Runtime Web**.

O resultado depende da estrutura do modelo. Para classificação, por exemplo:

```text
Classe       Confiança
Metal        99,9%
```

![Exemplo de Inferência](https://raw.githubusercontent.com/tamyriscabral/ArquivosColab/refs/heads/main/Captura%20de%20tela%202026-09-22%20215217.png)

---

### 🎚️ 5. Controle de confiança

A aplicação possui um controle de **confiança mínima** de:

```text
0% ───────────── 100%
```

com incremento de **1%** e valor inicial de **50%**.

O filtro é aplicado quando a tarefa possui um conceito de confiança compatível.

---

## 🧠 Identificação da tarefa

A aplicação tenta determinar automaticamente a tarefa a partir da estrutura do modelo.

Quando identificável, pode trabalhar com:

- 🏷️ classificação;
- 📦 detecção de objetos;
- 🎭 segmentação.

Caso não seja possível determinar o significado da saída, o sistema apresenta as informações técnicas disponíveis em vez de assumir uma interpretação.

---

## ⚡ Inferência local

Sempre que tecnicamente possível, a inferência é executada localmente no navegador utilizando **ONNX Runtime Web**.

O fluxo é:

```text
📄 Modelo ONNX
      ↓
🔎 Análise
      ↓
📥 Entradas
      ↓
⚙️ Pré-processamento
      ↓
🧠 Inferência
      ↓
📤 Interpretação da saída
      ↓
🎚️ Threshold de confiança
      ↓
📊 Resultado
```

A proposta é evitar o envio desnecessário do modelo e das imagens para servidores externos.

---

## 🌐 Aplicação universal

Uma das principais características do projeto é que **não existe um domínio previamente definido**.

A aplicação não possui lógica específica para:

- ♻️ resíduos;
- 🐶 animais;
- 🚗 veículos;
- 👤 pessoas;
- 🌱 plantas;
- 📄 documentos;
- ou qualquer outro domínio.

Por exemplo, o mesmo sistema pode receber:

```text
Modelo A → gatos e cachorros
Modelo B → tipos de veículos
Modelo C → espécies de plantas
Modelo D → resíduos
Modelo E → doenças em folhas
Modelo F → qualquer outro conjunto de classes
```

A aplicação deve descobrir as diferenças analisando o próprio arquivo ONNX.

Os exemplos acima não são classes padrão do sistema.

---

## 🧩 Arquitetura

O projeto foi estruturado de maneira modular, separando diferentes responsabilidades:

```text
📂 Carregamento do ONNX
        │
        ├── 📝 Leitura de metadados
        ├── 🏷️ Descoberta de classes
        ├── 🌐 Tradução
        ├── 🧠 Identificação da tarefa
        ├── ⚙️ Pré-processamento
        ├── 🔬 Execução da inferência
        ├── 📊 Pós-processamento
        ├── 🎚️ Threshold de confiança
        └── 🖥️ Apresentação dos resultados
```

Essa estrutura permite adicionar suporte a novos formatos de modelos sem criar lógica específica para um único domínio.

---

## 🚨 Modelos desconhecidos

Caso o modelo não siga um formato conhecido, a aplicação não deve inventar informações.

Por exemplo:

```text
✅ Modelo carregado com sucesso.

📥 Entrada identificada:
[1, 224, 224, 3]

📤 Saída identificada:
[1, 10]

⚠️ Não foi possível determinar automaticamente
o significado da saída.
```

Nesse cenário, as informações técnicas disponíveis são apresentadas para auxiliar o usuário na análise do modelo.

---

## ❌ Tratamento de erros

São consideradas situações como:

- ❌ arquivo inválido;
- ⚠️ modelo ONNX incompatível;
- 💥 modelo corrompido;
- 📝 metadados ausentes;
- 🏷️ classes não encontradas;
- 📥 entrada incompatível;
- 📤 saída desconhecida;
- ⚙️ erro de pré-processamento;
- 🔬 erro de inferência;
- 📊 erro de pós-processamento.

---

# 🤖 Prompt utilizado no desenvolvimento

A aplicação foi desenvolvida a partir da seguinte especificação:

> **Criar uma aplicação web genérica e universal para carregar, analisar e executar modelos ONNX de visão computacional.**
>
> 🎯 O comportamento da aplicação deve ser determinado pelo arquivo ONNX, sem assumir previamente domínio, classes, idioma, quantidade de classes, tarefa ou formato da saída.
>
> 🔎 O sistema deve analisar metadados, entradas, saídas e informações de classes, procurando campos como `names`, `classes`, `labels` e `class_names`.
>
> 🏷️ As classes devem ser descobertas automaticamente quando disponíveis, mantendo o nome original e, quando necessário, apresentando sua tradução para português.
>
> 🚫 A aplicação não deve possuir uma lista fixa de classes.
>
> 🧠 A tarefa do modelo deve ser identificada automaticamente quando possível, podendo incluir classificação, detecção ou segmentação.
>
> ⚡ A inferência deve utilizar o próprio modelo carregado e, sempre que possível, ser executada localmente no navegador utilizando ONNX Runtime Web.
>
> 🎚️ Deve existir um controle de confiança entre 0% e 100%, inicialmente em 50%, aplicado somente quando houver um conceito de confiança compatível.
>
> 📊 A interface deve apresentar informações técnicas do modelo e fornecer mensagens amigáveis quando ocorrerem erros ou quando alguma informação não puder ser determinada.
>
> 🧩 A aplicação deve ser modular e não conter lógica específica para resíduos, animais, veículos, pessoas ou qualquer outro domínio.
>
> **O resultado deve ser uma ferramenta genérica de análise e inferência de modelos ONNX, e não uma aplicação específica para um determinado dataset ou problema.**

---

## 🛠️ Tecnologias

- 🔷 **ONNX** — formato para representação do modelo;
- ⚡ **ONNX Runtime Web** — execução de modelos no navegador;
- 💻 **JavaScript/TypeScript** — lógica da aplicação;
- 🎨 **HTML/CSS** — estrutura e interface;
- 🌐 execução local no navegador.

---

## 📌 Princípio central

> **📄 O arquivo ONNX é a fonte de verdade da aplicação.**

A aplicação interpreta as informações fornecidas pelo modelo e **não deve criar informações que não estejam disponíveis em sua estrutura ou metadados**.

> ⚠️ **Para que as classes sejam identificadas automaticamente, elas precisam estar presentes nos metadados do arquivo ONNX.**
