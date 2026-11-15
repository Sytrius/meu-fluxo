# Meu Fluxo 1.3 — contas, cartões e compras com itens

Esta versão mantém o aplicativo PWA e os dados **no próprio dispositivo**.

## Novidades
- **Contas:** cadastre banco, 99Pay, dinheiro ou poupança com saldo inicial. O saldo calculado considera receitas/despesas vinculadas, transferências e pagamentos de fatura realizados até a data atual. Despesas antigas sem vínculo não são assumidas como movimentação de nenhuma conta.
- **Transferências:** movimentam valores entre duas contas cadastradas sem aumentar receitas ou despesas do mês.
- **Cartões de crédito:** cadastro de limite, fechamento e vencimento (dias 1 a 28), compra vinculada ao cartão, faturas mensais e pagamentos parciais ou integrais a partir de conta cadastrada.
- **Sem dupla contabilização:** compra no crédito entra nas despesas; pagar a fatura afeta o saldo da conta pagadora, mas não soma outra despesa. Parcelamentos mensais existentes podem ser vinculados a um cartão.
- **Chat:** escolha conta/cartão no resumo antes de confirmar; um lote de itens pode ser salvo como transações separadas ou, com confirmação expressa, como uma única compra com itens detalhados, caso seja realmente uma compra única.
- **Backups e transferência entre dispositivos:** arquivos JSON e .mfbackup passam a preservar contas, cartões, pagamentos, transferências e vínculos dos lançamentos. Na mesclagem, novos registros financeiros são adicionados; mudanças conflitantes exigem escolha explícita. Mantém importação de backups antigos das versões 1.1 e 1.2.
- **Integridade:** alterações ou exclusões de compras no cartão são barradas quando deixariam pagamentos de fatura maiores que as compras registradas.
- **Mobile:** a barra inferior adapta-se aos novos destinos com rolagem horizontal.

## Regras de uso
1. Vá a Contas para cadastrar, por exemplo, Nubank e 99Pay, informando o saldo inicial como ponto de partida.
2. Na criação ou edição de um lançamento, escolha uma conta ou cartão. Se não escolher, a transação continuará no histórico e nos totais gerais, mas não alterará o saldo individual de nenhuma conta.
3. Use Transferir apenas para movimentações entre suas contas; não crie uma receita e uma despesa adicionais para a mesma operação.
4. Cadastre seus cartões em Cartões, associe compras a eles e use Pagar na respectiva fatura. Não registre pagamento de fatura como despesa novamente.
5. Faça backup depois de mudanças relevantes e teste a restauração antes de utilizar dados importantes.

## Limitações conhecidas
- Contas não consultam APIs bancárias; o saldo é calculado com base nos valores inseridos pelo usuário e pode divergir do banco real.
- Cartões ainda não fazem conciliação automática, cálculo de juros, estorno, alteração retroativa de fechamento, edição de transferências ou cancelamento de pagamentos. Dias de fechamento/vencimento limitados de 1 a 28.
- Parcelamentos são lançamentos mensais individuais; itens detalhados ainda não podem ser parcelados pelo formulário manual.
- Pagamentos de fatura futuros não são aceitos como agendamento nesta versão.
- A mesclagem entre dispositivos é manual, com escolha de conflitos, não sincronização automática.
- Google Login identifica o perfil, mas não criptografa o banco local. Para compartilhar histórico, prefira o backup criptografado. Arquivos JSON/CSV são legíveis.
- OCR de notas fiscais e análise histórica de preços permanecem planejados para versões posteriores.

## Validação
Há testes automatizados para saldos, contas, cartões, faturas, pagamentos, regras de fechamento, parcelamentos, criptografia, integridade de backups, compras únicas e mesclagem entre aparelhos. A publicação do GitHub Pages é bloqueada se esses testes ou a verificação de sintaxe falharem.

Os testes automatizados não substituem validar a experiência no Chrome/Edge do Windows e no navegador Android. Não limpe os dados do site para atualizar a PWA.

## Histórico de compatibilidade
Novos campos por transação: `accountId` e `cardId` (opcionais). Nova configuração local `settings.finance` com `accounts`, `cards`, `transfers` e `payments`. O formato de backup continua em `schemaVersion: 2`, com checksum SHA-256.
