# Integrações WYNCORE

Este documento separa o que está implementado no código do que ainda exige aprovação comercial, credenciais e homologação.

## 1. Anúncios e vídeos — Offerwall.me

O candidato técnico atual é Offerwall.me. A API PTC documenta campanhas de iframe/vídeo (tipo 0) e campanhas em nova janela (tipo 1). A disponibilidade é personalizada por IP e país; o feed para WYNCORE solicita Brasil (`BR`).

Fluxo implementado:
1. O participante autentica na WYNCORE.
2. O servidor escolhe o ID interno do participante e calcula uma assinatura HMAC-SHA256 de identidade com validade de uma hora.
3. O servidor consulta `https://offerwall.me/api.php` com API Key, Bearer Token, ID, IP, país e assinatura.
4. A interface abre a URL de campanha retornada pelo parceiro sem alterar os parâmetros de tracking.
5. O parceiro controla o tempo/condições de conclusão e envia postback ao WYNCORE.
6. O servidor valida MD5 conforme a documentação do parceiro, confirma o participante e a moeda BRL, deduplica `transId` e registra crédito ou estorno.

Variáveis necessárias:
- `OFFERWALLME_API_KEY`
- `OFFERWALLME_BEARER_TOKEN`
- `OFFERWALLME_SECRET`

Postback:
`POST https://wyncore.vercel.app/api/ads/offerwallme/postback`

A placement deve ser criada e aprovada no painel do parceiro, configurada em BRL e com IDs assinados habilitados. O tráfego incentivado e recompensas em dinheiro precisam estar autorizados expressamente pelos termos da placement.

## 2. Regras financeiras

- `reward` do postback é o valor da recompensa na moeda configurada da placement (BRL).
- `payout` do parceiro é receita do publisher em USD; não é o valor do usuário e não deve ser confundido com ele.
- A WYNCORE só registra crédito após postback autêntico.
- Status `2` é estorno/chargeback; o ledger registra lançamento compensatório.
- Conversões repetidas com o mesmo `transId` não geram crédito duplicado.
- Não prometer renda mínima nem quantidade de anúncios.

## 3. Saques Pix

Nenhum provedor Pix de saída está conectado. A rota de pagamento permanece bloqueada até existir um provedor empresarial autorizado com API oficial, credenciais de servidor, idempotência, consulta de status, webhook assinado, homologação e conciliação. O saldo da carteira não equivale a dinheiro transferido.

## 4. Segurança e privacidade

- Não expor API Key privada, Bearer Token ou Secret no navegador.
- Compartilhar com o parceiro somente ID pseudônimo, IP e país necessários ao feed e à prevenção de fraude.
- Publicar política de privacidade e termos atualizados antes de ativar a rede.
- Não permitir bots, emuladores, auto-click, VPN/proxy para manipular campanhas, contas duplicadas ou conversões artificiais.
- Não ativar o parceiro antes de revisar reputação, termos, países, retenções, taxas, suporte e histórico real de pagamento.
