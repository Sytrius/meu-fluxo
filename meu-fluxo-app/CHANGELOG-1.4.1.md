# Meu Fluxo 1.4.1 — notas grandes, múltiplas fotos e conferência de valores

## Mudanças
- Cadastre **até 8 fotografias de uma mesma nota** no formulário de transações. Em Android, é possível fotografar trechos sucessivos; no PC, selecionar várias fotos da galeria.
- Cada foto é tratada como parte **da mesma compra**, não como uma transação separada. A prévia identifica a foto de origem dos itens.
- Novo reconhecedor de notas com **número do item, código de barras, descrição, quantidade/unidade, desconto e valor líquido** distribuídos em várias linhas. O histórico de preços usa o valor líquido registrado, já considerando o desconto.
- Ao fotografar áreas sobrepostas, o leitor tenta eliminar itens repetidos **somente quando possuem o mesmo número e código de barras**. Possíveis duplicidades sem identificação confiável geram aviso de revisão.
- O leitor consulta quantidade total de itens e valor a pagar quando essas informações estão legíveis, mostrando divergências entre a nota e os produtos identificados.
- Fotos pouco nítidas podem passar por uma leitura adicional de contraste reforçado; em aparelhos lentos a operação pode demorar.
- A prévia não salva lançamentos. Os produtos identificados são transferidos ao formulário, onde o usuário corrige quantidades, unidades e preços, confirma explicitamente a revisão e só então registra a compra.
- As fotografias permanecem armazenadas **localmente** junto com a transação. Backups JSON/criptografados preservam até 8 fotos; continua compatível com históricos que possuíam uma única foto.

## Como fotografar uma nota grande
1. Abra **Transações → Novo lançamento** e escolha **Selecionar fotos** ou **Fotografar outro trecho**.
2. Em vez de fotografar o papel inteiro, capture trechos com aproximadamente **5–8 produtos legíveis por imagem**. Para notas muito grandes, utilize 4–6 fotos e mantenha cerca de **20% de sobreposição**.
3. Fotografe também o **cabeçalho com a loja** e a **parte final com o valor a pagar e número total de itens**.
4. Mantenha o papel esticado, o aparelho paralelo à nota, com iluminação uniforme; evite sombras, reflexos e zoom digital.
5. Clique em **Ler fotos como uma compra**. O OCR funciona no dispositivo e **não envia as imagens a servidores de reconhecimento**.
6. Confira a lista, os avisos e o total. Clique em **Preencher compra para revisão**, corrija erros/itens faltantes e marque a caixa de conferência antes de registrar.

## Limitações
- OCR **não é infalível**, especialmente em fotos desfocadas, minúsculas, com iluminação ruim, impressões térmicas apagadas, códigos ou tabelas difíceis. O aplicativo não inventa preços para itens que não conseguiu ler. Fotos mais próximas são essenciais.
- Ao encontrar descontos no rodapé, o aplicativo não deve subtrair valores adicionais dos itens automaticamente. O valor líquido individual é preferido quando identificado; divergências são exibidas.
- A eliminação automática de duplicatas só ocorre com número e código de barras do item iguais; possíveis duplicações sem identificação aparecem para conferência.
- Fotos armazenadas podem aumentar o tamanho dos backups e o uso do IndexedDB; a importação de arquivos continua sujeita ao limite de tamanho existente.
- OCR executado no navegador pode utilizar muita memória em aparelhos mais antigos. Não feche a página durante a leitura.
- A leitura não consulta automaticamente NFC-e por QR Code ou banco de dados da SEFAZ.
- O histórico de preços continua baseado em nomes normalizados e unidades; marcas/embalagens diferentes podem não ser equivalentes.
- Testes automatizados validam os formatos de texto e simulações de OCR, **não substituem testes com fotos reais**.

## Compatibilidade
- Nenhuma transação anterior foi reescrita por esta atualização.
- `receipt` continua sendo a primeira foto, para compatibilidade; `receiptPhotos` é a lista de imagens da nota.
- O formato de backup continua `schemaVersion: 2` e valida no máximo 8 fotos por compra.
