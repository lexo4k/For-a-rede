# WYNCORE

Aplicação web/PWA para exibir anúncios patrocinados e vídeos recompensados, registrar créditos confirmados por parceiros e mostrar a carteira do participante.

## Produto

- Página pública com cadastro e acesso.
- Painel do participante focado em anúncios, vídeos e carteira.
- Painel administrativo separado para equipe, estado da rede e relatórios.
- Feed PTC/vídeo consultado no servidor, com identidade individual assinada.
- Créditos e estornos recebidos por postback autenticado e deduplicado.
- Nenhum crédito é criado apenas por abrir ou iniciar um anúncio.

## Desenvolvimento

Requer Node.js 22.x.

```bash
cd wyncore
npm install
npm test
npm start
```

A aplicação abre em `http://localhost:3000`.

## Variáveis do servidor

Obrigatórias para autenticação e persistência:
- `WYNCORE_OWNER_PASSWORD`
- `WYNCORE_SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN` (ou disco persistente compatível)

Para a rede de anúncios:
- `OFFERWALLME_API_KEY`
- `OFFERWALLME_BEARER_TOKEN`
- `OFFERWALLME_SECRET`

Configure os segredos somente no Vercel, separadamente em Preview e Production. Nunca os coloque no frontend ou no Git. A moeda da placement precisa ser BRL.

## Postback

URL: `https://wyncore.vercel.app/api/ads/offerwallme/postback`

A integração valida a assinatura MD5 documentada pelo parceiro, confere o participante e a moeda BRL, deduplica por `transId` e processa estornos. A consulta ao feed usa HMAC-SHA256 para assinar o ID autenticado do participante com expiração de uma hora.

Detalhes em:
- [Integração de vídeos recompensados](REWARDED-VIDEO-SETUP.md)
- [Pesquisa e diligência do provedor](docs/REWARDED-VIDEO-PROVIDER-RESEARCH.md)
- [Integrações e limites financeiros](docs/INTEGRATIONS.md)

## Limites atuais

- A conta publisher Offerwall.me ainda precisa ser criada/aprovada e suas credenciais configuradas.
- Não há garantia de campanhas ou volume no Brasil.
- Não há provedor de saque Pix conectado. Crédito na carteira não significa transferência bancária.
- A produção não deve ser atualizada até haver preview validado, credenciais reais, postback homologado e fluxo de saque contratado.

## Segurança

- IDs assinados a partir da sessão do servidor; o navegador não escolhe o participante usado no feed.
- Segredos mantidos apenas no servidor.
- Validação de assinatura, idempotência e chargeback.
- Proibido gerar tráfego artificial, bots, auto-click ou conversões simuladas.
