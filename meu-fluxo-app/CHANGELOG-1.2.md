# Meu Fluxo — notas da versão 1.2.0

**Objetivo desta versão:** aumentar a confiabilidade das informações financeiras armazenadas no aparelho, sem exigir sincronização na nuvem.

## O que mudou
- Backups novos usam `schemaVersion: 2` e checksum SHA-256. Arquivos alterados ou corrompidos são recusados antes de importar.
- Backups `schemaVersion: 1` continuam compatíveis. A versão 1 não inclui checksum.
- Backups criptografados continuam utilizando PBKDF2-SHA256 + AES-256-GCM e senha própria.
- A importação mostra dados novos, iguais e divergentes. Em caso de conflito, o usuário precisa escolher qual versão utilizar.
- Lançamentos excluídos ficam registrados internamente com `deletedAt`, para serem incluídos nos backups e não reaparecerem silenciosamente.
- A opção de armazenamento persistente pode ser solicitada em Configurações quando o navegador permitir. Não é garantia contra limpeza manual ou perda do dispositivo.
- Foram adicionados testes de backups, divergências, exclusões e compatibilidade com a versão anterior.

## Limitações importantes
- O aplicativo continua **local-first**: login Google identifica o perfil, mas não sincroniza os lançamentos entre dispositivos.
- O login Google **não criptografa** o banco de dados local e não constitui uma barreira de segurança contra alguém que tenha acesso ao mesmo perfil do navegador.
- O checksum SHA-256 é uma verificação de integridade **não autenticada**: não impede que alguém modifique intencionalmente um JSON e recalcule o checksum. Para compartilhar arquivos contendo dados financeiros, use o backup criptografado.
- A sincronização é feita manualmente. Exclusões e edições conflitantes exigem escolha durante a importação.
- O compartilhamento por Gmail é disponibilizado somente quando o navegador permite compartilhar arquivos; caso contrário, o backup será baixado para anexar manualmente.
- A opção de exclusão total apaga os dados do perfil atual. Faça backup antes.
- Ainda não foram implementados saldos por conta, faturas de cartão, OCR e relatórios por produto: são etapas futuras.
- Testes automatizados de lógica não substituem validação de interface no Android e Windows.

## Teste de uso recomendado
1. Registrar uma despesa de exemplo, fazer um backup e importá-lo.
2. Editar essa despesa em um dispositivo, exportar e importar no outro, verificando o aviso de divergência.
3. Excluir uma despesa em um dispositivo e importar o novo backup no outro, verificando a escolha de exclusão.
4. Confirmar que um backup antigo da versão 1.1 ainda é aceito.
5. Verificar o funcionamento do pedido de persistência em Configurações.

**Não limpe dados do site para atualizar o aplicativo.** Atualize normalmente e mantenha backups separados do dispositivo.
