# Correção parcial — teste real ainda reprovado

Não liberar esta alteração como solução para a leitura dos 27 itens.

As duas fotografias reais foram recuperadas da conversa original, junto com a
captura que mostra 13 itens na versão 1.4.1. As fotografias têm 738 × 1600 pixels.
Não estão incluídas neste repositório público. Seus SHA-256 estão no gabarito,
que foi transcrito visualmente: 27 itens, bruto R$ 278,04, descontos R$ 5,56,
líquido R$ 272,48. Os dois frangos são linhas distintas, apesar do mesmo código.

## O que está corrigido neste rascunho

- `UN X 21,75 21,75` representa preço unitário e bruto em duas colunas; não
  representa 21,75 unidades. Quantidades explícitas continuam suportadas.
- O líquido reconhecido encerra o bloco do produto e impede sua alteração por
  linhas órfãs posteriores.
- Um produto sem valor em uma foto deixa de ficar pendente quando outra foto
  recupera o mesmo número e código.
- O bruto da nota não gera conflito com o líquido a pagar.
- Uma soma coincidente não permite marcar como conciliada uma leitura com
  conflitos entre fotografias.

64 testes passam, incluindo backup, importação, armazenamento, histórico de
preços e captura multipágina. Estes testes **não** demonstram precisão do OCR.
Não há alteração na persistência, no formato dos backups ou no service worker.

## Teste de aceitação com as imagens reais

O script executa `receipt-capture-v15.js` no Chrome, com o Tesseract real e os
mesmos arquivos de português usados na publicação. Reproduz a compressão JPEG
do aplicativo, as tentativas de realce e a reunião das duas fotos. Os arquivos
do motor são servidos apenas em `127.0.0.1`; as fotos são passadas em memória.
O gabarito não alimenta o OCR nem corrige seus resultados: serve apenas para
comparar o resultado depois da leitura.

```sh
npm install
# Defina CHROME_PATH se o Chrome não estiver no caminho padrão do Windows.
npm run test:receipt-real -- /caminho/topo.jpeg /caminho/base.jpeg resultado.json
```

A ordem das fotos é verificada pelos hashes. Código de saída 0 significa que
todos os 27 conjuntos de campos financeiros passaram e a nota conciliou;
1 significa reprovação; 2 significa erro de execução. Mesmo uma aprovação
financeira não certifica a descrição dos produtos, que exige revisão separada.

Resultado efetivamente observado no Chrome: **15 candidatos**, nenhum com todo
o conjunto número/quantidade/bruto/desconto/líquido igual ao gabarito, soma
R$ 681,92 e total da nota não identificado. A aceitação foi **reprovada**.
O relatório completo está em `meu-fluxo-app/tests/fixtures/receipt-real-report.json`.

O teste não mede o modo offline completo do aplicativo. Os testes de regressão
de armazenamento/backup/histórico passam; isso não substitui um ensaio de
instalação e reabertura offline no aparelho.

## Trabalho ainda necessário

A leitura linear do Tesseract continua separando incorretamente descrições,
números dos itens e valores. Foram ensaiadas divisões sobrepostas, correção local
da inclinação, binarização adaptativa e leitura da coluna de preços. Esses
experimentos também falharam na validação real e foram retirados da alteração.

Faltam segmentação espacial confiável por linhas/colunas e por item, associação
de bruto/desconto/líquido com evidência geométrica, deduplicação de sobreposições
quando o número ou código é corrompido, limpeza de ruído sem alterar descrições,
e validação repetível dos 27 produtos nas duas imagens. Não inferir itens para
forçar a soma ou a contagem a bater. Manter o PR como rascunho e não publicar
uma nova versão no Pages enquanto esse teste de aceitação reprovar.
