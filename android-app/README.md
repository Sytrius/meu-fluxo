# Meu Fluxo Android 0.7

- **Mercado** mostra um mês por vez. Use as setas ou deslize sobre a lista. Compras são agrupadas pelo mês e ordenadas pela data.
- **Histórico por produto** compara preços médios por unidade, kg ou litro usando os itens cadastrados. Produtos com aumento aparecem primeiro. Meses sem compra ficam sem ponto.
- **Transações** e **Mercado** permitem editar uma compra. No formulário, o campo **Aba Mercado** permite confirmar se ela é uma reposição, compra principal ou deve ficar fora da aba.
- **Importar lista da nota** aceita CSV e XLSX. Para transformar fotos em uma lista, abra o Gemini e use as instruções de transcrição. Confira o resultado no Meu Fluxo antes de registrar.

## Configuração necessária no Firebase (proprietário)

1. Abra https://console.firebase.google.com/project/meu-fluxo-92550/settings/general e adicione um aplicativo **Android** com o pacote exato `io.github.sytrius.meufluxo`.
2. Cadastre estas impressões digitais do certificado de **preview**, incluído neste repositório:

   SHA-1: `D7:53:34:1D:C0:95:78:CD:12:82:B7:7E:91:5D:98:0D:5D:A1:B9:74`

   SHA-256: `80:8C:AE:ED:53:30:5D:AE:5E:C9:EC:A8:E1:3F:7E:74:F5:EF:42:C7:F9:11:9D:BB:1B:9A:91:57:B2:51:8E:7B`

3. Em **Authentication > Sign-in method**, habilite **Google**, escolhendo o e-mail de suporte. Baixe o `google-services.json` atualizado do aplicativo Android após registrar os certificados. Ele deve conter o cliente OAuth Web (`client_type: 3`), usado como audience do ID token. Não use o ID do cliente Android como cliente Web.
4. Forneça esse arquivo para integração ou salve o conteúdo integral no secret de Actions `GOOGLE_SERVICES_JSON`, em https://github.com/Sytrius/meu-fluxo/settings/secrets/actions . Não é necessário compartilhar senha Google, chave privada ou conta de serviço. O arquivo não deve ser substituído por `firebase-config.js`.
5. Execute **Meu Fluxo Android - gerar APK** na branch corrigida. A configuração valida projeto/pacote/cliente OAuth, copia o JSON para `android/app`, ativa o provedor Google nativo e o Google Services Gradle já presente no template Capacitor.

O Firebase Auth Android faz a troca da credencial com Firebase e mantém a sessão nativa entre reinícios. O aplicativo restaura o perfil pelo UID Firebase, inclusive offline; sair encerra a sessão nativa sem apagar o histórico de nenhum perfil. O seletor Google retorna pela Activity/Credential Manager do plugin, sem popup, redirect Firebase Web ou página `firebaseapp.com`. Não é preciso liberar domínios extras nem configurar deep link para esse fluxo Android.

Referências: https://firebase.google.com/docs/auth/android/google-signin e https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md .

## Assinatura, atualização e verificação

`preview.keystore` é uma chave pública de testes, senha `android`, alias `androiddebugkey`. Nunca use esta chave em produção ou para proteger distribuição privada. Os previews seguintes usam o mesmo certificado. Para produção será necessária uma chave privada separada e seus próprios SHA; Google Play App Signing também tem certificado próprio.

O primeiro preview 0.1 usou chave efêmera. A versão 0.2 pode não atualizar sobre ele. **Exporte e confira seu backup antes de qualquer desinstalação.** Não desinstale sem ter backup válido; o Android remove os dados do aplicativo. O código mantém appId, origem `https://localhost` e formato de armazenamento existentes. Os perfis local e Google continuam separados, sem migração automática de lançamentos.

O artefato de Actions inclui APK, SHA256.txt, BUILD.txt e este documento. Confira o SHA-256 e o certificado com `apksigner verify --verbose --print-certs`. A publicação usa apenas o artefato do workflow aprovado correspondente ao commit, nunca um run-id antigo fixo. Sem JSON Android, Actions permite somente validação de compilação; esse APK **não está apto a uso nem publicação** e a publicação é bloqueada.

## Evidência e limites dos testes

O fluxo de teste exercita a interface empacotada em Chromium com larguras de 320 e 390 px. Ele verifica a navegação horizontal, os lançamentos do mês, a atualização dos preços, a edição persistente e o acesso às demais abas. A compilação Gradle verifica integração e assinatura.

A interface ainda precisa de teste em aparelho físico. Isso inclui a atualização sobre a versão anterior, o seletor de arquivos e o login Google.
