# Integrações WYNCORE

Este documento descreve as integrações que o código suporta e separa claramente o que está implementado do que depende de autorização e credenciais externas.

## 1. Campanhas e anunciantes

A WYNCORE permite cadastrar anunciantes, briefings, materiais, orçamento, quantidade de avaliações e regras de participação. Uma campanha só pode ser aberta depois que o financiamento for confirmado por webhook Stripe assinado, com referência, valor e moeda conciliados.

O formulário comercial cria um pedido de contato. Isso não significa que um anunciante já tenha contratado ou financiado uma campanha.

## 2. Stripe Checkout

Variáveis exclusivas do servidor:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `WYNCORE_PUBLIC_URL`

Checkout é criado para financiar campanhas e atividades. A campanha permanece bloqueada até a confirmação do webhook Stripe. Eventos de pagamento atrasado são tratados separadamente; nenhum operador pode marcar manualmente um contrato como recebido.

Webhook:
`POST /api/webhooks/stripe`

Eventos relevantes:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `account.updated`
- `transfer.created`
- `transfer.reversed`
- `payout.paid`
- `payout.failed`

## 3. Stripe Connect

Repasses exigem que a Stripe aprove a WYNCORE como plataforma Connect e que cada participante conclua o onboarding/verificação da própria conta conectada.

Variável:
- `STRIPE_CONNECT_ENABLED=true` somente após aprovação formal da plataforma.

O backend reserva o saldo em armazenamento transacional, cria a transferência com chave de idempotência e concilia eventos do Stripe. Transferência enviada à conta conectada não é tratada como pagamento bancário recebido; o estado final depende do webhook de payout.

## 4. Adscend (opcional)

A rede Adscend só pode ser habilitada após aprovação de publisher e autorização explícita de campanhas com recompensa em dinheiro. Variáveis:
- `ADSCEND_PUBLISHER_ID`
- `ADSCEND_API_KEY`
- `ADSCEND_POSTBACK_SECRET`

Ofertas só são exibidas quando a resposta autenticada informa país elegível e permissão explícita para incentivo financeiro. Conversões precisam de postback válido, ID único, moeda BRL, valor e estado conciliados. Sem credenciais, aprovação e inventário, o módulo permanece indisponível.

## 5. Persistência Supabase

O projeto WYNCORE usa:
- `public.wyncore_state` para o estado persistente.
- `private.wyncore_rpc_credentials` para o segredo RPC.
- `wyncore_state_read` e `wyncore_state_write` para leitura e escrita transacional com segredo, advisory lock e comparação de versão.

As funções validam o segredo antes de acessar a tabela. O segredo nunca deve ser enviado ao navegador nem registrado em logs.

## 6. Segurança e regras financeiras

- Credenciais permanecem apenas no ambiente do servidor.
- Webhooks são autenticados e idempotentes.
- Confirmações manuais de financiamento e pagamento estão desativadas.
- Saldo em análise, aprovado, transferido e recebido são estados diferentes.
- Estimativas, cliques, convites e visualizações não criam saldo automaticamente.
- Nunca operar com campanhas sem autorização do anunciante, orçamento recebido e critérios publicados.

## 7. Estado de ativação observado

Na revisão de 22/11/2026:
- Supabase WYNCORE: projeto ativo; tabela de estado e registro de credencial RPC presentes.
- Stripe: variáveis de chave privada, segredo de webhook e Connect não aparecem na configuração Vercel examinada; Checkout e repasses permanecem bloqueados.
- Adscend: credenciais de publisher não aparecem na configuração Vercel examinada; ofertas permanecem indisponíveis.
- Vercel: limite de 100 deployments por dia atingido; a nova versão não pôde ser publicada nesta janela.
