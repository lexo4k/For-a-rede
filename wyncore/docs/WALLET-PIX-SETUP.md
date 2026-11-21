# Carteira e Pix WYNCORE

## Estado da implementação

A interface de carteira foi separada em `wallet.html`, `wallet.css` e `wallet.js`. A navegação Carteira/Pix abre essa experiência.

O servidor possui um adaptador inicial de cobrança Pix de entrada para Mercado Pago:
- `POST /api/wallet/deposits` cria uma cobrança Pix.
- `POST /api/webhooks/mercadopago` valida a assinatura do webhook, consulta o pagamento diretamente no Mercado Pago e só credita o livro-caixa quando o status remoto é `approved`.
- `GET /api/wallet` apresenta saldo e histórico.
- `POST /api/wallet/withdrawals` permanece bloqueado. Não há integração de Pix de saída neste módulo.

Depósitos pendentes não entram no saldo confirmado. O webhook verifica moeda, valor e referência externa antes do crédito. Eventos repetidos não geram novo crédito.

## Variáveis necessárias no Vercel

Configurar somente como variáveis secretas do servidor, em Preview primeiro e Production depois:

- `MERCADOPAGO_ACCESS_TOKEN`: token de acesso da aplicação Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo de assinatura do webhook configurado no painel Mercado Pago.
- `MERCADOPAGO_WEBHOOK_URL`: URL HTTPS pública exata para `/api/webhooks/mercadopago`.

Exemplo de formato de URL (não é um endpoint ativo até a configuração):
`https://SEU-DOMINIO/api/webhooks/mercadopago`

Não inserir tokens no navegador, no GitHub, em HTML, em arquivos públicos ou no chat. Nunca usar credenciais de teste em produção. Começar com credenciais de teste e validar o ciclo completo em homologação.

O provedor exige identificação do pagador no fluxo Pix; o CPF é validado no backend e enviado somente na requisição ao Mercado Pago.\n\n## Limites

- O módulo não habilita saques nem repasses Pix de saída.
- O saldo mostrado é um livro-caixa interno e não uma conta de pagamento regulada ou depósito bancário sob custódia da WYNCORE.
- O depósito do usuário não é receita da plataforma e não pode ser contado como lucro.
- O código atual ainda persiste o estado principal pelo armazenamento configurado no servidor (Vercel Blob privado quando `BLOB_READ_WRITE_TOKEN` existe, caso contrário arquivo local). O projeto Supabase existe, mas o servidor desta branch ainda não usa as RPCs Supabase; as variáveis Supabase existentes no Vercel estavam vazias/incompletas na auditoria.
- Antes de receber dinheiro real, configurar credenciais, confirmar titularidade/conta empresarial e webhook, executar testes de homologação, revisar a segurança e conferir as regras contratuais e de elegibilidade do Mercado Pago.

## Próximas etapas técnicas

1. Configurar as três variáveis Mercado Pago em Preview.
2. Validar criação de cobrança, webhook assinado, confirmação, duplicidade, expiração e estorno.
3. Conectar armazenamento financeiro durável (Supabase RPC com segredo guardado apenas no servidor) e aplicar políticas de acesso revisadas.
4. Implementar Pix de saída com um provedor que ofereça API de transferência compatível, idempotência e confirmação de status.
5. Só então promover para Production.
