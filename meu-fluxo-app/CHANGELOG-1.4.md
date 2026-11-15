# Meu Fluxo 1.4 — Leitura de notas e histórico de preços

## Novidades
- **Ler nota por foto:** em Transações → Novo lançamento, anexe uma fotografia JPG/PNG/WebP da nota e clique em **Ler itens da foto**. A fotografia é comprimida e processada pelo Tesseract.js 7 em português, executado dentro do navegador. O motor, o modelo de língua e o código WebAssembly são distribuídos pelo próprio site, sem serviço de OCR externo. **Na primeira utilização, pode ser necessário baixar componentes grandes**; uma vez baixados, o navegador poderá reutilizar o cache, mas uso offline do leitor não é garantido em todos os ambientes.
- **Revisão antes de salvar:** texto reconhecido, loja e data sugeridas, itens, quantidades, unidades, soma de itens e total impresso ficam disponíveis na prévia. O botão **Aplicar à compra para revisão** preenche o formulário, mas **não salva o histórico**. O usuário pode corrigir os valores, adicionar itens que faltaram ou desistir. Se a soma dos itens não corresponder ao valor total, a validação impede o registro até a correção.
- **Novas unidades de itens:** unidades, kg, g, litros e ml. Lançamentos anteriores continuam válidos; itens antigos sem unidade são interpretados como unidade, sem presumir peso.
- **Produtos e preços:** nova aba **Preços** com catálogo baseado apenas nas compras confirmadas, comparação por preço unitário, kg ou litro e detalhes de datas/estabelecimentos. Grupos são definidos por nome normalizado + unidade; marcas e embalagens diferentes podem não ser comparáveis.
- **Backups:** novos arquivos já contêm as unidades dos itens por meio do histórico de transações existente. Backups anteriores continuam aceitos. Diferenças nas unidades passam a ser identificadas como conflitos na mesclagem.
- **Privacidade:** não há envio das fotografias a servidores para reconhecimento. O histórico, o texto da nota e as fotos ficam no banco local quando uma compra é confirmada; o arquivo de backup pode incluir fotografias. O login Google continua separado da base de despesas.

## Importante
OCR em notas fiscais impressas **não é 100% confiável**: fotos desfocadas, notas amassadas, descontos, quantidades e formatos de impressão variados podem gerar erros ou itens não reconhecidos. **Confira cada valor.** A ferramenta não faz interpretação garantida de QR Code, NFC-e, tributos, cupons fiscais eletrônicos ou identificação automática de todos os produtos.

## Como testar
1. Faça um backup protegido do seu histórico, antes de experimentar uma atualização grande.
2. Abra **Transações → Novo lançamento** e fotografe uma nota simples.
3. Clique em **Ler itens da foto** e confira a prévia.
4. Clique em **Aplicar à compra para revisão** e corrija os campos. Não é registrada nenhuma transação até clicar em Registrar.
5. Confirme o total da compra e a soma dos itens. Caso estejam diferentes, corrija os itens.
6. Salve e abra **Preços**, onde itens confirmados aparecem com histórico por unidade.
7. Para comparar um mesmo produto, registre outra compra em outra data e verifique sua evolução.

## Limitações atuais
- Não há garantia de que o primeiro uso do OCR funcione offline, pois o navegador pode precisar baixar o motor.
- Cálculos de preços usam **somente** os produtos, quantidades, unidades, valores e datas confirmados manualmente; não consultam preços online.
- Itens reconhecidos parcialmente exigem edição manual; o aplicativo não inventa valores ausentes.
- O histórico de preços ainda não faz reconhecimento avançado de marcas e embalagens equivalentes nem análise de consumo por cesta completa.
- Fotos originais não sincronizam entre aparelhos. A transferência exige exportação/importação de backup.
- Testes automáticos cobrem parser, histórico, backup e simulação de leitura, mas **não substituem testar fotografias reais** no Chrome do PC e no Android.

## Arquitetura
- `receipts-v14.js`: interpretação conservadora de linhas e agregação do histórico de preços.
- `receipts-ui-v14.js`: interface de revisão e leitura OCR no dispositivo.
- `vendor/ocr`: motor e dados em português incorporados ao pacote publicado pelo GitHub Actions a partir de dependências com versões fixas; arquivos binários não ficam no repositório-fonte.
- `receipts-v14.test.cjs`, `receipts-integration-v14.test.cjs`: regressão da versão.

A versão permanece gratuita, estática e sem sincronização automática.
