# ONNX Explorer

Crie uma aplicação web genérica e universal para carregar, analisar e executar modelos ONNX de visão computacional.

Objetivo principal

A aplicação NÃO deve ser específica para um determinado domínio, conjunto de dados ou problema.

O comportamento da aplicação deve ser determinado pelo arquivo ONNX fornecido pelo usuário.

O sistema não deve assumir previamente:

quais são as classes;

qual é o domínio do modelo;

se o modelo trabalha com animais, objetos, pessoas, resíduos, plantas, documentos ou qualquer outro conteúdo;

qual é o idioma das classes;

qual é a quantidade de classes;

qual é a tarefa realizada pelo modelo;

qual é o formato exato da saída do modelo.

O arquivo ONNX deve ser tratado como a principal fonte de informações sobre o modelo.

1. Upload do modelo

Criar uma área para o usuário carregar um arquivo .onnx.

A interface deve permitir:

arrastar e soltar o arquivo;

selecionar o arquivo manualmente;

mostrar nome e tamanho do arquivo;

mostrar um indicador de carregamento;

validar se o arquivo é um modelo ONNX válido.

Após o carregamento, analisar automaticamente a estrutura do modelo.

2. Análise automática do ONNX

Depois que o modelo for carregado, a aplicação deve inspecionar suas informações disponíveis, incluindo:

metadados;

metadata_props;

nomes das entradas;

dimensões das entradas;

tipo dos dados de entrada;

nomes das saídas;

dimensões das saídas;

tipo dos dados de saída;

informações de classes/labels disponíveis;

informações que permitam identificar a estrutura esperada da inferência.

Procurar classes/labels em diferentes formatos possíveis, incluindo campos como:

names;

classes;

labels;

class_names;

outros campos presentes nos metadados do modelo.

Não assumir que esses campos necessariamente existirão ou estarão em um formato específico.

A aplicação deve tentar interpretar os metadados de maneira robusta.

3. Classes

Se o modelo fornecer informações sobre suas classes, identificá-las automaticamente.

Por exemplo, se o modelo fornecer:

0: cat
1: dog


mostrar:

Classes do modelo

IDOriginalExibição0catGato1dogCachorro

Se outro modelo fornecer:

0: glass
1: plastic
2: metal


mostrar essas classes.

Não criar uma lista fixa de classes no código.

Os exemplos acima são apenas exemplos para demonstrar o funcionamento. Eles não devem ser incorporados como classes padrão da aplicação.

Se as classes já estiverem em português, manter os nomes originais.

Se não houver informação de classes nos metadados, informar:

Não foram encontradas classes nos metadados deste modelo.

Nesse caso, mostrar os metadados disponíveis para diagnóstico.

4. Tradução automática das classes

Quando as classes forem encontradas, tentar identificar o idioma e traduzir os nomes para português do Brasil, quando necessário.

A tradução deve ser feita de forma genérica e contextual.

Exemplo:

cat → Gato
dog → Cachorro
car → Carro
apple → Maçã
glass → Vidro
plastic → Plástico


Esses exemplos são apenas ilustrativos.

Nunca limitar a tradução a uma lista pré-definida de classes.

Manter sempre os dois valores:

nome original fornecido pelo modelo;

nome traduzido utilizado na interface.

O valor original nunca deve ser alterado dentro da lógica do modelo.

5. Identificação da tarefa do modelo

A aplicação deve tentar identificar automaticamente, a partir da estrutura do ONNX, qual tipo de tarefa o modelo realiza.

Possíveis tarefas incluem, quando identificáveis:

classificação;

detecção de objetos;

segmentação;

outras tarefas de visão computacional.

A aplicação não deve assumir que todos os modelos são classificadores ou detectores.

Quando for possível identificar a tarefa, adaptar a interface e o pós-processamento para ela.

Quando não for possível identificar automaticamente, informar ao usuário que o formato da saída não pôde ser determinado.

6. Inferência

Executar a inferência utilizando o próprio modelo carregado pelo usuário.

Sempre que tecnicamente possível, realizar o processamento localmente no navegador, utilizando uma biblioteca apropriada, como ONNX Runtime Web.

Não enviar o modelo ou as imagens para servidores externos sem necessidade.

A aplicação deve:

analisar as entradas esperadas pelo modelo;

preparar a imagem de acordo com essas entradas;

executar a inferência;

interpretar a saída de acordo com a estrutura do modelo;

associar os resultados aos IDs e nomes das classes;

aplicar o filtro de confiança quando aplicável;

apresentar os resultados ao usuário.

7. Controle de confiança

Criar um controle deslizante:

Nível mínimo de confiança

Valores:

0% → 100%

Incremento:

1%

Valor inicial:

50%

Mostrar o valor atual de forma destacada:

Confiança mínima: 50%

O controle deve ser funcional e afetar realmente os resultados apresentados.

Por exemplo, com limite de 70%:

Classe A — 92% → mostrar
Classe B — 81% → mostrar
Classe C — 68% → ocultar
Classe D — 42% → ocultar


O filtro deve ser aplicado somente quando a tarefa/modelo possuir um conceito de confiança aplicável.

8. Interface de resultados

A interface deve se adaptar ao tipo de modelo identificado.

Para classificação

Mostrar, por exemplo:

ClasseConfiançaClasse traduzida94%Outra classe81%

Para detecção

Se o modelo retornar caixas delimitadoras, mostrar a imagem com:

bounding boxes;

classe;

confiança.

Para segmentação

Quando suportado pelo modelo, apresentar a máscara/segmentação correspondente.

Esses layouts são exemplos. A aplicação deve adaptar a apresentação à estrutura real do modelo.

9. Informações técnicas do modelo

Criar uma seção opcional chamada:

Informações do modelo

Mostrar informações descobertas automaticamente, como:

nome do arquivo;

tamanho;

tarefa identificada;

dimensões da entrada;

número de entradas;

tipo dos dados;

dimensões da saída;

número de classes;

nomes das classes;

metadados disponíveis.

Isso será especialmente útil para diagnosticar modelos ONNX diferentes.

10. Tratamento de modelos desconhecidos

Se o modelo não seguir um formato conhecido, não inventar informações.

Mostrar claramente o que foi possível identificar.

Por exemplo:

Modelo carregado com sucesso.

Entrada identificada: [1, 224, 224, 3]

Saída identificada: [1, 10]

Não foi possível determinar automaticamente o significado da saída.

Nesse caso, mostrar os detalhes técnicos disponíveis para que o usuário possa entender a estrutura do modelo.

11. Tratamento de erros

Criar mensagens amigáveis para:

arquivo inválido;

modelo ONNX corrompido;

modelo incompatível com ONNX Runtime Web;

metadados ausentes;

classes não encontradas;

formato de saída desconhecido;

entrada incompatível;

erro durante pré-processamento;

erro durante inferência;

erro durante pós-processamento.

Não apresentar apenas mensagens técnicas ou stack traces para o usuário final.

12. Regra fundamental da aplicação

NÃO criar lógica específica para resíduos, animais, veículos, pessoas ou qualquer outro domínio.

A aplicação deve funcionar da mesma maneira independentemente do conteúdo do modelo.

Por exemplo, estes modelos devem ser tratados pela mesma aplicação:

modelo A → gatos e cachorros
modelo B → tipos de veículos
modelo C → espécies de plantas
modelo D → resíduos
modelo E → doenças em folhas
modelo F → qualquer outro conjunto de classes


O sistema deve descobrir as diferenças analisando o próprio arquivo ONNX.

Os exemplos utilizados neste prompt servem exclusivamente para explicar o comportamento esperado e não devem ser transformados em regras fixas da aplicação.

13. Arquitetura

Organizar o código de forma modular, separando pelo menos:

carregamento do ONNX;

leitura de metadados;

descoberta de classes;

tradução;

identificação da tarefa;

pré-processamento;

execução da inferência;

pós-processamento;

aplicação do threshold de confiança;

apresentação dos resultados.

Isso deve permitir adicionar suporte posteriormente para novos tipos de modelos ONNX sem precisar reescrever toda a aplicação.

Crie uma interface moderna, limpa, responsiva e profissional.

O resultado deve ser uma ferramenta genérica de análise e inferência de modelos ONNX, e não uma aplicação específica para um determinado dataset ou problema.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8923cd76-701a-42dd-b771-57a8d403e61e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
