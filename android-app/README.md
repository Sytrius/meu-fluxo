# Sytrius Fluxo Android 0.9

- **Mercado** mostra um mês por vez. Use as setas ou deslize sobre a lista. Compras são agrupadas pelo mês e ordenadas pela data.
- **Histórico por produto** compara preços médios por unidade, kg ou litro usando os itens cadastrados. Produtos com aumento aparecem primeiro. Meses sem compra ficam sem ponto.
- **Transações** e **Mercado** permitem editar uma compra. No formulário, o campo **Aba Mercado** permite confirmar se ela é uma reposição, compra principal ou deve ficar fora da aba.
- **Importar lista da nota** aceita CSV e XLSX. Para transformar fotos em uma lista, abra o Gemini e use as instruções de transcrição. Confira o resultado no Sytrius Fluxo antes de registrar.
- **Publicidade** ocupa uma faixa no Início, com uma área de separação do menu. Ela é recolhida ao mudar de aba, abrir um formulário ou quando um anúncio não puder ser carregado.

Esta versão substitui visualmente o antigo Meu Fluxo. Instale por cima da versão anterior para conservar os lançamentos. A assinatura e o identificador Android continuam compatíveis.

## Testar e ativar publicidade

O APK de teste usa os IDs de demonstração do Google. Instale por cima da versão anterior, conecte o celular e abra **Início**. Confira a faixa acima do menu e toque em **Mercado** para verificar que ela some. Anúncios de teste não geram receita.

1. Crie sua conta no [Google AdMob](https://admob.google.com/). Complete o cadastro e o perfil de pagamentos no Google.
2. Adicione **Sytrius Fluxo** como app Android. Se ele ainda estiver disponível apenas no GitHub, selecione a opção de app não publicado em loja compatível. O pacote Android é `io.github.sytrius.meufluxo`. [Adicionar um app ao AdMob](https://support.google.com/admob/answer/9989980?hl=pt-BR)
3. Crie uma unidade do tipo **Banner**. Copie o ID do app (com `~`) e o ID da unidade (com `/`). [Criar um banner](https://support.google.com/admob/answer/7311346?hl=pt-BR)
4. Para a distribuição ao público, configure as mensagens em **Privacidade e mensagens** conforme as regiões atendidas e documente o uso do SDK na política de privacidade e na ficha da loja. A ponte Android consulta as escolhas de consentimento antes de solicitar anúncios de produção. Os lançamentos e notas não entram nas solicitações de anúncios.
5. O Google precisa vincular o app a uma loja compatível para iniciar a revisão de veiculação. Se o painel pedir a verificação por `app-ads.txt`, publique o arquivo no site do desenvolvedor vinculado à ficha da loja. [Revisão do app](https://support.google.com/admob/answer/10564477?hl=pt-BR) · [Verificação por app-ads.txt](https://support.google.com/admob/answer/14538460?hl=pt-BR)

Para compilar com o banner do proprietário, defina `ADMOB_ANDROID_APP_ID` e `ADMOB_ANDROID_BANNER_ID` no ambiente de build (variáveis do repositório no Actions) e selecione `ADMOB_MODE=live`. Sem essa seleção, o build sempre usa IDs de teste. Para distribuição de produção, use uma chave de assinatura privada e valide o banner em aparelho inscrito como dispositivo de teste antes de veicular.

## Configuração necessária no Firebase (proprietário)

1. Abra https://console.firebase.google.com/project/meu-fluxo-92550/settings/general e adicione um aplicativo **Android** com o pacote exato `io.github.sytrius.meufluxo`.
2. Cadastre estas impressões digitais do certificado de **preview**, incluído neste repositório:

   SHA-1: `D7:53:34:1D:C0:95:78:CD:12:82:B7:7E:91:5D:98:0D:5D:A1:B9:74`

   SHA-256: `80:8C:AE:ED:53:30:5D:AE:5E:C9:EC:A8:E1:3F:7E:74:F5:EF:42:C7:F9:11:9D:BB:1B:9A:91:57:B2:51:8E:7B`

3. Em **Authentication > Sign-in method**, habilite **Google**, escolhendo o e-mail de suporte. Baixe o `google-services.json` atualizado do aplicativo Android após registrar os certificados. Ele deve conter o cliente OAuth Web (`client_type: 3`), usado como audience do ID token. Não use o ID do cliente Android como cliente Web.
4. Forneça esse arquivo para integração ou salve o conteúdo integral no secret de Actions `GOOGLE_SERVICES_JSON`, em https://github.com/Sytrius/meu-fluxo/settings/secrets/actions . Não é necessário compartilhar senha Google, chave privada ou conta de serviço. O arquivo não deve ser substituído por `firebase-config.js`.
5. Execute **Sytrius Fluxo Android - gerar APK** na branch configurada. A configuração valida projeto, pacote e cliente OAuth, copia o JSON para `android/app` e ativa o login nativo com Google.

O Firebase Auth Android faz a troca da credencial com Firebase e mantém a sessão nativa entre reinícios. O aplicativo restaura o perfil pelo UID Firebase, inclusive offline; sair encerra a sessão nativa sem apagar o histórico de nenhum perfil. O seletor Google retorna pela Activity/Credential Manager do plugin, sem popup, redirect Firebase Web ou página `firebaseapp.com`. Não é preciso liberar domínios extras nem configurar deep link para esse fluxo Android.

Referências: https://firebase.google.com/docs/auth/android/google-signin e https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md .

## Assinatura, atualização e verificação

`preview.keystore` é uma chave pública de testes, senha `android`, alias `androiddebugkey`. Nunca use esta chave em produção ou para proteger distribuição privada. Os previews seguintes usam o mesmo certificado. Para produção será necessária uma chave privada separada e seus próprios SHA; Google Play App Signing também tem certificado próprio.

O primeiro preview 0.1 usou chave efêmera. A versão 0.2 pode não atualizar sobre ele. **Exporte e confira seu backup antes de qualquer desinstalação.** Não desinstale sem ter backup válido; o Android remove os dados do aplicativo. O código mantém appId, origem `https://localhost` e formato de armazenamento existentes. Os perfis local e Google continuam separados, sem migração automática de lançamentos.

O artefato de Actions inclui APK, SHA256.txt, BUILD.txt e este documento. Confira o SHA-256 e o certificado com `apksigner verify --verbose --print-certs`. A publicação usa apenas o artefato do workflow aprovado correspondente ao commit, nunca um run-id antigo fixo. Sem JSON Android, Actions permite somente validação de compilação; esse APK **não está apto a uso nem publicação** e a publicação é bloqueada.

## Evidência e limites dos testes

O fluxo de teste exercita a interface empacotada em Chromium com larguras de 320 e 390 px. Ele verifica a navegação horizontal, os lançamentos do mês, a atualização dos preços, a edição persistente e o acesso às demais abas. Com a ponte de anúncios simulada, também verifica o espaço do banner e a ocultação em formulários, em outras abas ou quando não há anúncio. A compilação Gradle verifica integração e assinatura.

A interface ainda precisa de teste em aparelho físico. Isso inclui a atualização sobre a versão anterior, o seletor de arquivos e o login Google.
