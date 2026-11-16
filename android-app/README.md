# Android 0.2 — login nativo e OCR das fotos anexadas

O botão **Ler fotos como uma compra** usa ML Kit Latin no Android, inclusive em fotos já anexadas. A imagem original permanece no formulário; uma cópia temporária no cache é usada pelo plugin e removida depois. Cada foto tem limite de 45 segundos. A prévia exige aplicação e confirmação manual; OCR não salva transações. No navegador, Tesseract continua disponível, com limites de carregamento e reconhecimento.

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

Os testes automatizados verificam fotos existentes roteadas ao ML Kit, falha/repetição sem perder anexos/campos, timeout, deduplicação multipágina, backup e ausência de gravação automática. São testes com ponte nativa simulada, não prova de OCR em aparelho. A compilação Gradle verifica integração e assinatura, não valida login real.

Antes de anunciar correção validada em Android, testar em aparelho com Google Play Services: selecionar/cancelar conta; retornar ao app; reiniciar online e offline; sair/reentrar no mesmo UID; ler duas fotos anexadas e foto ilegível offline; repetir após falha; aplicar sem salvar; confirmar backup e dados antigos. Uma build sem configuração Firebase não prova login e não deve ser instalada.

## Investigação Tesseract

O botão anterior iniciava `createWorker('por')` mesmo no APK. O workflow copiava worker, todos os pares WASM/JS e `por.traineddata.gz` para `www/vendor/ocr`; os caminhos usam a origem local Capacitor. Não havia timeout em script, inicialização, reconhecimento ou término do worker. A captura comprova espera durante inicialização, mas sem logcat não distingue falha de worker/WASM/modelo. Por isso a causa exata da inicialização não é afirmada: no Android esse caminho foi substituído por ML Kit; no navegador ele recebeu limites explícitos. Não foi necessário baixar modelo português para o ML Kit Latin, que reconhece português.
