# WYNCORE — anúncios em vídeo recompensados

## Integração Offerwall.me

A tela de anúncios consulta a API PTC do Offerwall.me no servidor. O participante recebe os links retornados pelo parceiro; o parceiro controla a reprodução e confirma a conclusão. A API documenta que o tipo `0` corresponde a anúncios em iframe/vídeo e o tipo `1` abre em janela.

### Configuração do publisher

1. Criar conta publisher e cadastrar a placement do domínio `wyncore.vercel.app`.
2. Configurar a moeda da placement como **BRL** e definir o câmbio/recompensa no painel do parceiro.
3. Habilitar IDs de usuário assinados; a assinatura HMAC-SHA256 é gerada no servidor e expira em uma hora.
4. Configurar o postback para `https://wyncore.vercel.app/api/ads/offerwallme/postback`.
5. Adicionar no Vercel, em Preview e Production, as variáveis:
   - `OFFERWALLME_API_KEY`
   - `OFFERWALLME_BEARER_TOKEN`
   - `OFFERWALLME_SECRET`

O postback usa a assinatura MD5 documentada pelo parceiro: `md5(subId + transId + reward + secretKey)`. O WYNCORE valida a assinatura, a conta do participante, a moeda BRL, deduplica por `transId` e processa estornos `status=2`.

A chave privada e o Bearer Token ficam exclusivamente no servidor. O ID do participante é assinado a partir da sessão autenticada; o navegador não escolhe o ID usado na API.

## Limite de pagamentos

Esta integração registra a recompensa confirmada pelo parceiro na carteira. Ela **não transfere Pix** para o participante. O saque exige um provedor de pagamentos separado, credenciais próprias e homologação antes de ativar qualquer transferência.

## Revisão de fornecedor

A integração técnica não significa que o fornecedor foi homologado. Antes de ativar, revisar os termos, política de tráfego, regras de incentivos, países elegíveis, moeda, retenções, chargebacks e histórico de pagamentos do parceiro.
