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

![Tela Inicial](https://raw.githubusercontent.com/tamyriscabral/ArquivosColab/refs/heads/main/Captura%20de%20tela%202026-09-22%20220718.png)

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
> Crie uma aplicação web genérica e universal para carregar, analisar e executar modelos ONNX de visão computacional.
>
> Objetivo principal
> A aplicação NÃO deve ser específica para um determinado domínio, conjunto de dados ou problema.
> O comportamento da aplicação deve ser determinado pelo arquivo ONNX fornecido pelo usuário.
> O sistema não deve assumir previamente:
> quais são as classes;
> qual é o domínio do modelo;
> se o modelo trabalha com animais, objetos, pessoas, resíduos, plantas, documentos ou qualquer outro conteúdo;
> qual é o idioma das classes;
> qual é a quantidade de classes;
> qual é a tarefa realizada pelo modelo;
> qual é o formato exato da saída do modelo.
>
> O arquivo ONNX deve ser tratado como a principal fonte de informações sobre o modelo.
>
> 1. Upload do modelo
> Criar uma área para o usuário carregar um arquivo .onnx.
> A interface deve permitir:
> arrastar e soltar o arquivo;
> selecionar o arquivo manualmente;
> mostrar nome e tamanho do arquivo;
> mostrar um indicador de carregamento;
> validar se o arquivo é um modelo ONNX válido.
>
> Após o carregamento, analisar automaticamente a estrutura do modelo.
>
> 2. Análise automática do ONNX
> Depois que o modelo for carregado, a aplicação deve inspecionar suas informações disponíveis, incluindo:
> metadados;
> metadata_props;
> nomes das entradas;
> dimensões das entradas;
> tipo dos dados de entrada;
> nomes das saídas;
> dimensões das saídas;
> tipo dos dados de saída;
> informações de classes/labels disponíveis;
> informações que permitam identificar a estrutura esperada da inferência.
>
> Procurar classes/labels em diferentes formatos possíveis, incluindo campos como:
> names;
> classes;
> labels;
> class_names;
> outros campos presentes nos metadados do modelo.
>
> Não assumir que esses campos necessariamente existirão ou estarão em um formato específico.
>
> A aplicação deve tentar interpretar os metadados de maneira robusta.
>
> 3. Classes
> Se o modelo fornecer informações sobre suas classes, identificá-las automaticamente.
> Por exemplo, se o modelo fornecer:
> 0: cat
> 1: dog
>
> mostrar:
>
> Classes do modelo
>
> IDOriginalExibição0catGato1dogCachorro
>
> Se outro modelo fornecer:
>
> 0: glass
> 1: plastic
> 2: metal
>
> mostrar essas classes.
>
> Não criar uma lista fixa de classes no código.
> Os exemplos acima são apenas exemplos para demonstrar o funcionamento. Eles não devem ser incorporados como classes padrão da aplicação.
> Se as classes já estiverem em português, manter os nomes originais.
>
> Se não houver informação de classes nos metadados, informar:
> Não foram encontradas classes nos metadados deste modelo.
>
> Nesse caso, mostrar os metadados disponíveis para diagnóstico.
>
> 4. Tradução automática das classes
>
> Quando as classes forem encontradas, tentar identificar o idioma e traduzir os nomes para português do Brasil, quando necessário.
> A tradução deve ser feita de forma genérica e contextual.
> Exemplo:
>
> cat → Gato
> dog → Cachorro
> car → Carro
> apple → Maçã
> glass → Vidro
> plastic → Plástico
>
> Esses exemplos são apenas ilustrativos.
> Nunca limitar a tradução a uma lista pré-definida de classes.
> Manter sempre os dois valores:
> nome original fornecido pelo modelo;
> nome traduzido utilizado na interface.
>
> O valor original nunca deve ser alterado dentro da lógica do modelo.
>
> 5. Identificação da tarefa do modelo
> A aplicação deve tentar identificar automaticamente, a partir da estrutura do ONNX, qual tipo de tarefa o modelo realiza.
>
> Possíveis tarefas incluem, quando identificáveis:
> classificação;
> detecção de objetos;
> segmentação;
> outras tarefas de visão computacional.
>
> A aplicação não deve assumir que todos os modelos são classificadores ou detectores.
> Quando for possível identificar a tarefa, adaptar a interface e o pós-processamento para ela.
> Quando não for possível identificar automaticamente, informar ao usuário que o formato da saída não pôde ser determinado.
>
> 6. Inferência
> Executar a inferência utilizando o próprio modelo carregado pelo usuário.
> Sempre que tecnicamente possível, realizar o processamento localmente no navegador, utilizando uma biblioteca apropriada, como ONNX Runtime Web.
> Não enviar o modelo ou as imagens para servidores externos sem necessidade.
>
> A aplicação deve:
> analisar as entradas esperadas pelo modelo;
> preparar a imagem de acordo com essas entradas;
> executar a inferência;
> interpretar a saída de acordo com a estrutura do modelo;
> associar os resultados aos IDs e nomes das classes;
> aplicar o filtro de confiança quando aplicável;
> apresentar os resultados ao usuário.
>
> 7. Controle de confiança
> Criar um controle deslizante:
> Nível mínimo de confiança
> Valores:
> 0% → 100%
>
> Incremento:
> 1%
>
> Valor inicial:
> 50%
>
> Mostrar o valor atual de forma destacada:
> Confiança mínima: 50%
>
> O controle deve ser funcional e afetar realmente os resultados apresentados.
>
> Por exemplo, com limite de 70%:
>
> Classe A — 92% → mostrar
> Classe B — 81% → mostrar
> Classe C — 68% → ocultar
> Classe D — 42% → ocultar
>
> O filtro deve ser aplicado somente quando a tarefa/modelo possuir um conceito de confiança aplicável.
> 
> 8. Interface de resultados
> A interface deve se adaptar ao tipo de modelo identificado.
>
> Para classificação
> 
> Mostrar, por exemplo:
>
> ClasseConfiançaClasse traduzida94%Outra classe81%
>
> Para detecção
> Se o modelo retornar caixas delimitadoras, mostrar a imagem com:
> bounding boxes;
> classe;
> confiança.
>
> Para segmentação
> Quando suportado pelo modelo, apresentar a máscara/segmentação correspondente.
> Esses layouts são exemplos. A aplicação deve adaptar a apresentação à estrutura real do modelo.
>
> 9. Informações técnicas do modelo
> Criar uma seção opcional chamada:
> Informações do modelo
>
> Mostrar informações descobertas automaticamente, como:
> nome do arquivo;
> tamanho;
> tarefa identificada;
> dimensões da entrada;
> número de entradas;
> tipo dos dados;
> dimensões da saída;
> número de classes;
> nomes das classes;
> metadados disponíveis.
> 
> Isso será especialmente útil para diagnosticar modelos ONNX diferentes.
>
> 10. Tratamento de modelos desconhecidos
> Se o modelo não seguir um formato conhecido, não inventar informações.
> Mostrar claramente o que foi possível identificar.
>
> Por exemplo:
> Modelo carregado com sucesso.
>
> Entrada identificada: [1, 224, 224, 3]
>
> Saída identificada: [1, 10]
>
> Não foi possível determinar automaticamente o significado da saída.
>
> Nesse caso, mostrar os detalhes técnicos disponíveis para que o usuário possa entender a estrutura do modelo.
>
> 11. Tratamento de erros
> Criar mensagens amigáveis para:
> arquivo inválido;
> modelo ONNX corrompido;
> modelo incompatível com ONNX Runtime Web;
> metadados ausentes;
> classes não encontradas;
> formato de saída desconhecido;
> entrada incompatível;
> erro durante pré-processamento;
> erro durante inferência;
> erro durante pós-processamento.
>
> Não apresentar apenas mensagens técnicas ou stack traces para o usuário final.
>
> 12. Regra fundamental da aplicação
> NÃO criar lógica específica para resíduos, animais, veículos, pessoas ou qualquer outro domínio.
> A aplicação deve funcionar da mesma maneira independentemente do conteúdo do modelo.
> Por exemplo, estes modelos devem ser tratados pela mesma aplicação:
>
> modelo A → gatos e cachorros
> modelo B → tipos de veículos
> modelo C → espécies de plantas
> modelo D → resíduos
> modelo E → doenças em folhas
> modelo F → qualquer outro conjunto de classes
>
> O sistema deve descobrir as diferenças analisando o próprio arquivo ONNX.
> Os exemplos utilizados neste prompt servem exclusivamente para explicar o comportamento esperado e não devem ser transformados em regras fixas da aplicação.
>
> 13. Arquitetura
> Organizar o código de forma modular, separando pelo menos:
> carregamento do ONNX;
> leitura de metadados;
> descoberta de classes;
> tradução;
> identificação da tarefa;
> pré-processamento;
> execução da inferência;
> pós-processamento;
> aplicação do threshold de confiança;
> apresentação dos resultados.
>
> Isso deve permitir adicionar suporte posteriormente para novos tipos de modelos ONNX sem precisar reescrever toda a aplicação.
>
> Crie uma interface moderna, limpa, responsiva e profissional.
>
> O resultado deve ser uma ferramenta genérica de análise e inferência de modelos ONNX, e não uma aplicação específica para um determinado dataset ou problema.


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
