# Meu Fluxo 1.5 — leitura híbrida de notas fiscais

**Status:** os novos modos de consulta QR e análise Gemini foram integrados, mas a IA **precisa ser ativada no Firebase** pelo administrador. O OCR local, histórico offline, contas, cartões e backups permanecem operando como antes.

## Três opções de leitura no mesmo lançamento

1. **OCR local (padrão):** use "Ler fotos como uma compra". As imagens não saem do aparelho para reconhecimento; requer revisão dos itens.
2. **NFC-e — consultar por QR Code:** use "Ler QR das fotos" ou cole um link fiscal. O aplicativo reconhece URLs oficiais de `nfce.sefaz.pe.gov.br/nfce/consulta` e abre a página da SEFAZ-PE. O site oficial pode disponibilizar dados dos produtos, mas **não foi implementada extração automática do conteúdo da página**: os serviços podem exigir autenticação, CAPTCHA e não disponibilizam uma API pública documentada de importação. Nenhuma coleta automática é feita.
3. **Gemini via Firebase AI Logic (online e opcional):** envia somente as fotos selecionadas após **confirmação explícita**, recebe JSON estruturado e aplica validações locais. O resultado vira uma prévia para revisão e não gera despesas automaticamente.

## Como ativar Gemini no projeto Firebase

A configuração da API do Google não é equivalente ao login Google ou à conta ChatGPT Free. O acesso ao Gemini pelo aplicativo tem limites próprios.

1. Acesse [Firebase Console](https://console.firebase.google.com/) e abra o projeto **meu-fluxo-92550**.
2. Vá a **Serviços de IA → Firebase AI Logic → Começar** e configure a **Gemini Developer API**, se elegível ao nível gratuito. Confirme as cotas e condições de dados do projeto.
3. Em [Google Cloud Console](https://console.cloud.google.com/security/recaptcha), selecione o mesmo projeto, ative o **reCAPTCHA Enterprise** e crie uma **chave de site Web** do tipo score-based. Autorize o domínio `sytrius.github.io`. Essa chave de **site é pública**, não é chave secreta ou de serviço.
4. No Firebase Console, vá a **Segurança → App Check**, registre o aplicativo Web com **reCAPTCHA Enterprise** utilizando a chave pública de site. Ative a aplicação de App Check exigida pelo Firebase AI Logic.
5. No Meu Fluxo, entre em **Configurações → Leitura com IA**, cole a **chave pública do site** e salve. Atualize a página. Essa configuração valerá para o navegador em uso.
6. Para oferecer o recurso a todos os usuários do site, publique essa **mesma chave pública** em `meu-fluxo-app/firebase-config.js` na variável `window.MEU_FLUXO_APPCHECK_SITE_KEY`. **Não** insira nenhum segredo OAuth, token de API de serviço ou chave de servidor nesse arquivo.
7. No formulário de transações, selecione as fotos da nota, clique em **Analisar com Gemini** e leia o aviso de privacidade. Só depois de confirmar as imagens serão enviadas ao serviço.

**Atenção:** um plano gratuito não significa uso ilimitado; o projeto pode atingir cotas. Dependendo da modalidade, o Google pode utilizar dados enviados para melhorar serviços, com revisão humana. Para dados financeiros, mantenha a modalidade local como padrão e analise a política de privacidade antes de oferecer o serviço amplamente.

## Validação financeira e segurança

- Os produtos precisam ter nome, quantidade, unidade e valor líquido positivos; informações ilegíveis não são inventadas nem preenchidas por diferença de totais.
- A IA é orientada a recuperar número do produto, código, bruto, desconto e valor líquido. Linhas repetidas com o mesmo número de item não são somadas duas vezes.
- A soma dos produtos é comparada ao total da nota; divergências e linhas incompletas são exibidas para revisão.
- **O botão de IA não salva nada.** O usuário escolhe "Preencher compra para revisão", corrige cada campo, confirma a conferência e então registra a compra.
- O site não envia a base inteira de despesas para o Gemini: somente fotografias selecionadas para aquela análise, após consentimento.
- Chaves públicas do Firebase Web SDK e reCAPTCHA Enterprise podem estar no código cliente. Segredos de servidor jamais devem ser publicados.
- O QR só é aberto se for URL fiscal PE válida em domínio aprovado; não existe captura automática da consulta.
- O histórico e as imagens continuam armazenados localmente e transferidos via backup, como nas versões anteriores.

## Limitações dos testes

Os testes automáticos verificam a validação de saída, URLs fiscais, bloqueio quando App Check não está configurado e cancelamento de consentimento. **Não validam uma análise real pelo Gemini**: ela depende de ativação pelo proprietário e cotas acessíveis. A verificação final de precisão deve ser feita com as fotos reais de um cupom, como a nota de 27 itens.

## Referências oficiais

- [Firebase AI Logic — começar](https://firebase.google.com/docs/ai-logic/get-started)
- [Firebase App Check — reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Firebase — saída JSON estruturada](https://firebase.google.com/docs/ai-logic/generate-structured-output)
- [SEFAZ Pernambuco — documentos fiscais eletrônicos](https://www.sefaz.pe.gov.br/Servicos/ICMS/Paginas/Documentos_Fiscais.aspx)
